# app.py
import os
import logging
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from urllib.parse import quote_plus

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import desc, or_
from sqlalchemy import func, Integer
from flask import make_response  # Make sure to import this


import jwt
import traceback

from models import (
    db, bcrypt,
    User, School, Student,
    Exam, Question, ExamStudent,
    StudentExamAttempt, StudentAnswer,
    QuestionRepository,QuestionAuditLog,generate_short_id   # <- must exist in your models.py
)

from utils.files import (
    ALLOWED_CSV, ALLOWED_IMG, allowed_file, import_repository_csv, save_csv_file,
    save_image_file, import_students_csv, import_questions_csv,
    IMAGES_DIR, CSV_DIR, export_student_attempts_to_excel
)

from routes import register_analysis_routes, register_repository_routes, register_student_routes, register_pdf_extraction_routes

# ------------------------------
# Environment/bootstrap
# ------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH, override=False)
print(f"✅ Loaded environment from: {ENV_PATH}")

app = Flask(__name__)

# ------------------------------
# Config: DB + Secrets
# ------------------------------
DB_ENGINE = os.getenv("DB_ENGINE", "mysql")
DB_USER = os.getenv("DB_USER", os.getenv("DB_USERNAME", "root"))
DB_PASSWORD_RAW = os.getenv("DB_PASSWORD", "")
DB_PASSWORD = quote_plus(DB_PASSWORD_RAW)  # handle @/: etc
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "online_exams")

if not all([DB_USER, DB_HOST, DB_NAME]):
    raise RuntimeError("Database environment variables are missing!")

if DB_ENGINE == "mysql":
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", secrets.token_hex(32))



# SQLAlchemy pool settings
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_size": 8,
    "max_overflow": 4,
    "pool_recycle": 1800,
    "pool_pre_ping": True,
}
# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(f"DB_USER: {DB_USER}")
logger.info(f"DB_PASSWORD: {'*' * 8} (hidden)")
logger.info(f"DB_HOST: {DB_HOST}")
logger.info(f"DB_NAME: {DB_NAME}")

# Initialize extensions
db.init_app(app)
bcrypt.init_app(app)

# CORS
CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sl-exam.onrender.com"
    ]}},
    supports_credentials=True,
    allow_headers=["Content-Type","Authorization","auth_token"],
    methods=["GET","POST","PUT","DELETE","OPTIONS"]
)

# Ensure upload dirs
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(CSV_DIR, exist_ok=True)

# ------------------------------
# Helpers
# ------------------------------
def token_from_request():
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header:
        parts = auth_header.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() in ("auth_token", "bearer"):
            token = parts[1].strip()
    if not token:
        token = request.headers.get("auth_token")
    return token

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return jsonify({"message": "CORS preflight"}), 200
        token = token_from_request()
        if not token:
            return jsonify({"message": "No token provided"}), 401
        try:
            decoded = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            user_id = int(decoded.get('sub'))
            user = User.query.get(user_id)
            if not user:
                return jsonify({'message': 'User not found'}), 401
            return f(user, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
    return wrapper

def role_required(*roles):
    def inner(f):
        @wraps(f)
        @token_required
        def wrapper(current_user, *args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'message': 'Forbidden'}), 403
            return f(current_user, *args, **kwargs)
        return wrapper
    return inner

def to_utc_naive(dt):
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    local_tz = datetime.now().astimezone().tzinfo
    dt = dt.replace(tzinfo=local_tz)
    return dt.astimezone(timezone.utc).replace(tzinfo=None)

def is_admin_exam(exam):
    """Returns True if the exam belongs to the Platform Admin (Global)."""
    return exam.school_id is None

def check_restricted_access(exam, current_user, action="edit"):
    """
    Blocks School Admins from modifying Global/Admin exams.
    Returns a Tuple: (allowed_bool, error_response_tuple)
    """
    # If user is a School Admin AND the Exam is Global (school_id is None)
    if current_user.role == 'school_admin' and is_admin_exam(exam):
        return False, (jsonify({
            'message': f'Permission Denied: School Admins cannot {action} Global Admin Exams.',
            'error_code': 'ADMIN_LOCKED'
        }), 403)
    return True, None


def no_cache(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # run the route function first
        resp = make_response(f(*args, **kwargs))
        # then attach the "kill cache" headers
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp
    return decorated_function


def _calculate_percentile(score, all_scores):
    """Midrank percentile for stable percentiles with ties."""
    if score is None or not all_scores:
        return None
    total = len(all_scores)
    less = sum(1 for s in all_scores if s < score)
    equal = sum(1 for s in all_scores if s == score)
    return round(((less + 0.5 * equal) / total) * 100, 2)


def _competition_rank(score, all_scores):
    if score is None or not all_scores:
        return None
    higher = sum(1 for s in all_scores if s > score)
    return higher + 1



register_repository_routes(app, token_required)
register_student_routes(app, role_required, no_cache, to_utc_naive)
register_analysis_routes(app, token_required, _competition_rank, _calculate_percentile)
register_pdf_extraction_routes(app, token_required)

# ------------------------------
# DB init
# ------------------------------
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables ensured.")
    except Exception as e:
        logger.error(f"Database init failed: {e}")

# ------------------------------
# Health
# ------------------------------
@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# ------------------------------
# AUTH
# ------------------------------
@app.post('/login')
def login():
    try:
        data = request.json or {}
        identifier = data.get('username')  # username or student_id
        password = data.get('password')
        if not identifier or not password:
            return jsonify({'message': 'username/student_id and password required'}), 400

        user = User.query.filter_by(username=identifier).first()
        if not user:
            student = Student.query.filter_by(student_id=identifier).first()
            if student:
                user = User.query.get(student.user_id)

        if not user or not user.check_password(password):
            return jsonify({'message': 'invalid credentials'}), 401
        school_name = None
        if user.school_id:
            sch = School.query.get(user.school_id)
            if sch:
                school_name = sch.name

        # Backward-compatible display name resolution:
        # older student rows may have name only in students table.
        display_name = getattr(user, 'name', None)
        if user.role == 'student' and not (display_name or '').strip():
            student_profile = Student.query.filter_by(user_id=user.id).first()
            if student_profile:
                display_name = student_profile.name

        profile = {'id': user.id, 'username': user.username, 'role': user.role, 'name': display_name, 'specialist_subject': getattr(user, 'specialist_subject', None),'school_id': user.school_id,       # Ensure this is sent
            'school_name': school_name}
        payload = {
            'sub': str(user.id),
            'role': user.role,
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + timedelta(hours=6)
        }
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        return jsonify({'auth_token': token, 'user': profile}), 200
    except Exception as e:
        return jsonify({'message': 'Login failed', 'detail': str(e)}), 500


@app.get('/me/profile')
@token_required
def me_profile(current_user):
    school_name = None
    if current_user.school_id:
        school = School.query.get(current_user.school_id)
        if school:
            school_name = school.name

    student = None
    if current_user.role == 'student':
        student = Student.query.filter_by(user_id=current_user.id).first()
        if student and student.school:
            school_name = student.school.name

    data = {
        'id': current_user.id,
        'role': current_user.role,
        'username': current_user.username,
        'name': current_user.name or (student.name if student else None),
        'email': current_user.email,
        'mobile_number': current_user.mobile_number,
        'school_id': current_user.school_id or (student.school_id if student else None),
        'school_name': school_name,
        'student_id': student.student_id if student else None,
        'class_number': student.class_number if student else None,
        'security': {
            'can_change_password_self': current_user.role != 'student',
            'password_reset_channel': (
                'contact school admin'
                if current_user.role == 'student'
                else 'email reset or change password'
            ),
        },
    }
    return jsonify({'profile': data}), 200


@app.put('/me/profile')
@token_required
def update_me_profile(current_user):
    data = request.get_json(silent=True) or {}

    try:
        if current_user.role == 'student':
            student = Student.query.filter_by(user_id=current_user.id).first()
            if not student:
                return jsonify({'message': 'student profile not found'}), 404

            if 'name' in data:
                next_name = (data.get('name') or '').strip()
                if next_name:
                    student.name = next_name
                    current_user.name = next_name

            db.session.commit()
            return jsonify({'message': 'profile updated'}), 200

        if 'name' in data:
            next_name = (data.get('name') or '').strip()
            if next_name:
                current_user.name = next_name

        if 'email' in data:
            next_email = (data.get('email') or '').strip() or None
            current_user.email = next_email

        if 'mobile_number' in data:
            next_mobile = (data.get('mobile_number') or '').strip() or None
            current_user.mobile_number = next_mobile

        db.session.commit()
        return jsonify({'message': 'profile updated'}), 200

    except IntegrityError as ie:
        db.session.rollback()
        return jsonify({'message': 'profile update failed - duplicate value', 'detail': str(ie)}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'profile update failed', 'detail': str(e)}), 500


@app.post('/me/change-password')
@token_required
def change_my_password(current_user):
    if current_user.role == 'student':
        return jsonify({'message': 'students must contact school admin to reset password'}), 403

    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'message': 'current_password and new_password are required'}), 400

    if len(str(new_password)) < 8:
        return jsonify({'message': 'new password must be at least 8 characters'}), 400

    if not current_user.check_password(current_password):
        return jsonify({'message': 'current password is incorrect'}), 400

    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({'message': 'password updated'}), 200



# ------------------------------
# ADMIN: create users (admin only)
# ------------------------------
@app.route('/admin/users/create', methods=['POST','OPTIONS'])
@role_required('admin')
def admin_create_user(current_user):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'ok'}), 200
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')
    email = (data.get('email') or None)
    role = (data.get('role') or '').strip()
    school_id = data.get('school_id')
    specialist_subject = data.get('specialist_subject')
    if not username or not role:
        return jsonify({'message': 'username and role are required'}), 400

    if role not in ('school_admin', 'subject_specialist'):
        return jsonify({'message': 'role must be school_admin or subject_specialist'}), 400

    if role == 'school_admin' and not school_id:
        return jsonify({'message': 'school_id is required for school_admin'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'username already exists'}), 409

    # generate password if not provided
    if not password:
        password = secrets.token_urlsafe(8)

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')

    user = User(username=username, password_hash=hashed, role=role, email=email,specialist_subject=specialist_subject)
    if role == 'school_admin':
        try:
            user.school_id = int(school_id)
        except Exception:
            pass
    db.session.add(user)
    db.session.commit()

    # Return generated password for admin to share (remove in production)
    return jsonify({
        'message': 'user created',
        'user': {'id': user.id, 'username': user.username, 'role': user.role, 'email': user.email},
        'password': password
    }), 201

@app.post('/register')
def register_student():
    data = request.json or {}
    password = data.get('password')
    school_code = data.get('school_code') or data.get('school_id')
    name = (data.get('name') or '').strip()
    class_number = data.get('class_number') or data.get('class')

    if not password or not school_code:
        return jsonify({'message': 'password and school_code (or school_id) are required'}), 400

    school = None
    if isinstance(school_code, int) or (isinstance(school_code, str) and school_code.isdigit()):
        school = School.query.get(int(school_code))
    if not school:
        school = School.query.filter((School.code == school_code) | (School.name == school_code)).first()
    if not school:
        return jsonify({'message':'school not found'}), 400

    try:
        with db.session.begin():
            # Students always login with generated student_id; keep a temporary
            # unique username until student_id is generated.
            temp_username = f"tmp_student_{secrets.token_hex(8)}"
            while User.query.filter_by(username=temp_username).first():
                temp_username = f"tmp_student_{secrets.token_hex(8)}"

            resolved_name = name or temp_username

            user = User(username=temp_username, role='student',
                        name=resolved_name,
                        email=data.get('email'), mobile_number=data.get('mobile_number'))
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

            student = Student(
               user_id=user.id,
               name=resolved_name,
               class_number=class_number,
               school_id=school.id
            )
            student.school = school
            student.generate_student_id_auto()
            db.session.add(student)
            db.session.flush()

            user.username = student.student_id
            db.session.add(user)
        return jsonify({'message':'student created','username': user.username}), 201
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'message': 'registration failed', 'detail': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'registration failed', 'detail': str(e)}), 500

# ------------------------------
# ADMIN / SCHOOL-ADMIN: Schools
# ------------------------------
@app.route('/admin/schools', methods=['GET','POST','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_schools(current_user):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    if request.method == 'POST':
        data = request.json or {}
        name = (data.get('name') or '').strip()
        code = (data.get('code') or '').strip()
        if not name or not code:
            return jsonify({'message': 'name and code required'}), 400
        if School.query.filter_by(code=code).first():
            return jsonify({'message': 'code already exists'}), 400
        s = School(name=name, code=code, created_by=current_user.id)
        db.session.add(s); db.session.commit()
        return jsonify({'message':'school created','school': s.to_dict()}), 201

    schools = School.query.all()
    return jsonify({'schools': [s.to_dict() for s in schools]}), 200

@app.route('/admin/schools/<int:school_id>', methods=['GET','PUT','DELETE','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_school_detail(current_user, school_id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    school = School.query.get_or_404(school_id)
    if request.method == 'GET':
        return jsonify({'school': school.to_dict()}), 200
    if request.method == 'PUT':
        data = request.json or {}
        school.name = data.get('name', school.name)
        school.code = data.get('code', school.code)
        db.session.commit()
        return jsonify({'message':'updated','school': school.to_dict()}), 200
    # DELETE
    db.session.delete(school); db.session.commit()
    return jsonify({'message':'deleted'}), 200

# ------------------------------
# ADMIN/SCHOOL-ADMIN: Students
# ------------------------------
def _safe_int(value, default):
    """
    Convert query param to int safely.
    Treats None, '', 'undefined', 'null' (case-insensitive) and bad ints as default.
    """
    if value is None:
        return default
    s = str(value).strip().lower()
    if s in ("", "undefined", "null", "nan"):
        return default
    try:
        return int(s)
    except Exception:
        return default

# app.py

@app.route("/admin/students", methods=["GET", "OPTIONS"])
@role_required("admin", "school_admin")
def admin_students_list(current_user):
    if request.method == "OPTIONS":
        return "", 200

    try:
        page = _safe_int(request.args.get("page"), 1)
        per_page = _safe_int(request.args.get("per_page"), 20)
        search = (request.args.get("search") or "").strip()
        
        # --- NEW FILTERS ---
        school_filter = request.args.get("school_id")
        class_filter = request.args.get("class_number")

        q = (
            db.session.query(Student, User, School)
            .join(User, Student.user_id == User.id)
            .join(School, Student.school_id == School.id)
        )

        # 1. Role Scope Logic
        if current_user.role == "school_admin" and current_user.school_id:
            q = q.filter(Student.school_id == current_user.school_id)
        
        # 2. Apply School Filter (for Super Admins selecting from dropdown)
        elif school_filter and school_filter != "null" and school_filter != "":
            q = q.filter(Student.school_id == int(school_filter))

        # 3. Apply Class Filter
        if class_filter:
            q = q.filter(Student.class_number.ilike(f"%{class_filter}%"))

        # 4. Apply Search (Name, Username, Email)
        if search:
            like = f"%{search}%"
            q = q.filter(
                db.or_(
                    Student.name.ilike(like),
                    User.username.ilike(like),
                    User.email.ilike(like),
                    Student.student_id.ilike(like) # Added search by Student ID too
                )
            )

        # Pagination
        pagination = q.order_by(Student.number, Student.name).paginate(
            page=page, per_page=per_page, error_out=False
        )

        items = [
            {
                "id": stu.user_id,
                "username": usr.username,
                "name": stu.name,
                "mobile_number": usr.mobile_number,
                "school_name": sch.name if sch else None,
                "class_number": stu.class_number,
                "number": stu.number,
                "school_id": stu.school_id,
                "student_id": stu.student_id,
                "email": usr.email
            }
            for (stu, usr, sch) in pagination.items
        ]

        return jsonify({
            "students": items,
            "page": page,
            "per_page": per_page,
            "total_pages": pagination.pages,
            "total_items": pagination.total # This ensures pagination works correctly
        }), 200

    except Exception as e:
        app.logger.exception("admin_students_list failed")
        return jsonify({"message": "Failed to fetch students", "detail": str(e)}), 500

@app.route("/admin/students", methods=["POST", "OPTIONS"])
@role_required("admin", "school_admin")
def admin_students_create(current_user):
    if request.method == "OPTIONS":
        return jsonify({"message": "ok"}), 200

    data = request.get_json(silent=True) or {}

    try:
        name = (data.get("name") or "").strip()
        school_id = data.get("school_id")
        if not name or not school_id :
            return jsonify({"message": "name, school_id and number are required"}), 400

        if current_user.role == "school_admin":
            if not current_user.school_id or int(school_id) != int(current_user.school_id):
                return jsonify({"message": "Forbidden: wrong school"}), 403

        password = data.get("password") or ""
        email = (data.get("email") or "").strip() or None
        mobile_number = (data.get("mobile_number") or "").strip() or None
        class_number = (data.get("class_number") or "").strip() or None

        sch = School.query.get(int(school_id))
        if not sch:
            return jsonify({"message": "school not found"}), 404

        temp_username = f"tmp_student_{secrets.token_hex(8)}"
        while User.query.filter_by(username=temp_username).first():
            temp_username = f"tmp_student_{secrets.token_hex(8)}"

        u = User(
            username=temp_username, role="student",
            email=email, mobile_number=mobile_number, name=name
        )
        u.set_password(password or "student@123")
        db.session.add(u)
        db.session.flush()

        stu = Student(
            user_id=u.id,
            name=name,
            school_id=int(school_id),
            class_number=class_number or None
        )
        stu.school = sch
        stu.generate_student_id_auto()
        db.session.add(stu)
        u.username = stu.student_id
        u.name = stu.name
        db.session.commit()

        return jsonify({
            "message": "student created",
            "student": {
                "id": stu.user_id,
                "username": u.username,
                "name": stu.name,
                "school_id": stu.school_id,
                "class_number": stu.class_number,
                "number": stu.number,
                "student_id": stu.student_id
            }
        }), 201

    except IntegrityError as ie:
        db.session.rollback()
        return jsonify({"message": "duplicate username/email/student_id", "detail": str(ie)}), 409
    except Exception as e:
        db.session.rollback()
        app.logger.exception("admin_students_create failed")
        return jsonify({"message": "Failed to create student", "detail": str(e)}), 500


@app.route('/admin/students/<int:user_id>', methods=['GET','PUT','DELETE'])
@role_required('admin', 'school_admin')
def admin_student_detail(current_user, user_id):
    user = User.query.get_or_404(user_id)
    if user.role != 'student':
        return jsonify({'message': 'not a student user'}), 400

    student = Student.query.filter_by(user_id=user.id).first_or_404()

    if request.method == 'GET':
        return jsonify({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'mobile_number': user.mobile_number,
            'name': student.name,
            'class_number': student.class_number,
            'school_id': student.school_id,
            'student_id': student.student_id,
        }), 200

    if request.method == 'PUT':
        data = request.json or {}
        try:
            changed = False

            # Optional simple fields
            if 'email' in data:
                user.email = data.get('email')
                changed = True

            if 'mobile_number' in data:
                user.mobile_number = data.get('mobile_number')
                changed = True

            if data.get('password'):
                user.set_password(data.get('password'))
                changed = True

            if 'name' in data:
                next_name = data.get('name') or student.name
                student.name = next_name
                user.name = next_name
                changed = True

            # Track inputs that may affect the student_id
            old_school_id = student.school_id
            old_class = student.class_number
            # Preserve school if not provided
            new_school_id = data.get('school_id', student.school_id)
            if new_school_id != student.school_id:
                sch = School.query.get(new_school_id)
                if not sch:
                    return jsonify({'message': 'school not found'}), 400
                student.school_id = sch.id
                changed = True

            if 'class_number' in data:
                student.class_number = (data.get('class_number') or None)
                changed = True

            # If student_id is provided explicitly, validate uniqueness and apply it
            if student.school_id != old_school_id or student.class_number != old_class:
                student.generate_student_id_auto()

                clash = Student.query.filter(
                    Student.student_id == student.student_id,
                    Student.user_id != student.user_id
                ).first()
                if clash:
                    return jsonify({
                        'message': 'student_id already exists for this school/class'
                    }), 409

                user.username = student.student_id
                changed = True

            if changed:
                db.session.commit()

            return jsonify({
                'message': 'student updated',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'mobile_number': user.mobile_number
                },
                'student': {
                    'user_id': student.user_id,
                    'student_id': student.student_id,
                    'name': student.name,
                    'class_number': student.class_number,
                    'school_id': student.school_id
                }
            }), 200

        except IntegrityError as ie:
            db.session.rollback()
            # Catch uniqueness errors (e.g., if UNIQUE(student_id) is violated from another path)
            return jsonify({'message': 'update failed - duplicate value', 'detail': str(ie)}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': 'update failed', 'detail': str(e)}), 500

    # DELETE
    db.session.delete(student)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'student deleted'}), 200


@app.get('/admin/students/<int:user_id>/attempts')
@role_required('admin', 'school_admin')
def admin_student_attempts(current_user, user_id):
    user = User.query.get_or_404(user_id)
    if user.role != 'student':
        return jsonify({'message': 'not a student user'}), 400

    student = Student.query.filter_by(user_id=user_id).first_or_404()
    if current_user.role == 'school_admin' and student.school_id != current_user.school_id:
        return jsonify({'message': 'Forbidden'}), 403

    attempt_rows = (
        db.session.query(StudentExamAttempt, Exam)
        .join(Exam, Exam.id == StudentExamAttempt.exam_id)
        .filter(StudentExamAttempt.student_id == user_id)
        .filter(StudentExamAttempt.submitted_time.isnot(None))
        .order_by(desc(StudentExamAttempt.submitted_time))
        .all()
    )

    attempts = []
    percentages = []
    for att, exam in attempt_rows:
        peer_scores = [
            s for (s,) in db.session.query(StudentExamAttempt.score)
            .filter(StudentExamAttempt.exam_id == exam.id)
            .filter(StudentExamAttempt.submitted_time.isnot(None))
            .filter(StudentExamAttempt.score.isnot(None))
            .all()
        ]
        pct = round((att.score / exam.total_marks) * 100, 2) if exam.total_marks else None
        if pct is not None:
            percentages.append(pct)

        attempts.append({
            "attempt_id": att.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "submitted_time": att.submitted_time.isoformat() if att.submitted_time else None,
            "score": att.score,
            "total_marks": exam.total_marks,
            "percentage": pct,
            "percentile": _calculate_percentile(att.score, peer_scores),
            "rank": _competition_rank(att.score, peer_scores),
            "participants": len(peer_scores)
        })

    summary = {
        "attempted_exams": len(attempts),
        "average_percentage": round(sum(percentages) / len(percentages), 2) if percentages else 0,
        "best_percentage": round(max(percentages), 2) if percentages else 0,
        "latest_exam": attempts[0]["exam_title"] if attempts else None
    }

    return jsonify({
        "student": {
            "user_id": student.user_id,
            "student_id": student.student_id,
            "name": student.name,
            "class_number": student.class_number,
            "school_id": student.school_id
        },
        "summary": summary,
        "attempts": attempts
    }), 200


@app.route('/admin/students/import', methods=['POST', 'OPTIONS'])
@role_required('admin', 'school_admin')
def admin_import_students(current_user):
    if request.method == 'OPTIONS':
        return '', 200
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    if not allowed_file(file.filename, ALLOWED_CSV):
        return jsonify({'message': 'Invalid file type'}), 400
    csv_path = save_csv_file(file)
    try:
        created = import_students_csv(csv_path)
        return jsonify({'message': f'{len(created)} students imported', 'students': created}), 201
    except Exception as e:
        return jsonify({'message': 'Import failed', 'detail': str(e)}), 400

# ------------------------------
# ADMIN/SCHOOL-ADMIN: Exams
# ------------------------------
@app.route('/admin/exams', methods=['GET','POST','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exams(current_user):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    # --- POST: Create Exam ---
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'message':'title is required'}), 400

        description = data.get('description')
        access_start = data.get('access_start')
        access_end = data.get('access_end')
        duration = int(data.get('duration_minutes') or data.get('duration') or 60)
        total_marks = int(data.get('total_marks') or 0)
        
        # 1. Define the correct variable
        school_id_to_use = data.get('school_id') 
        if current_user.role == 'school_admin':
            school_id_to_use = current_user.school_id

        try:
            ast = datetime.fromisoformat(access_start) if access_start else None
            aend = datetime.fromisoformat(access_end) if access_end else None
        except Exception:
            return jsonify({'message':'invalid datetime format (use ISO)'}), 400

        exam = Exam(
            title=title, description=description,
            access_start=ast, access_end=aend,
            duration_minutes=duration, total_marks=total_marks,
            created_by=current_user.id, 
            
            # --- FIX 1: Use the variable defined above (school_id_to_use) ---
            school_id=school_id_to_use 
        )
        db.session.add(exam); db.session.commit()
        return jsonify({'message':'exam created','exam': exam.to_dict()}), 201

    # --- GET: List Exams ---
    if request.method == 'GET':
        query = Exam.query
    
        if current_user.role == 'school_admin':
        # 1. Exams created by this school
        # 2. Global exams (school_id is None) BUT ONLY if one of their students is assigned to it
            school_id = current_user.school_id
        
        # Filter: (Own Exams) OR (Global Exams assigned to my students)
            query = query.join(ExamStudent, isouter=True).join(Student, ExamStudent.student_id == Student.user_id, isouter=True).filter(
            or_(
                Exam.school_id == school_id,
                Student.school_id == school_id
            )
        ).distinct()
    
        exams = query.order_by(desc(Exam.created_at)).all()
        return jsonify({'exams': [e.to_dict() for e in exams]}), 200

@app.route('/admin/exams/fetch-repo-ids', methods=['GET'])
@token_required
def fetch_repo_ids_for_exam(current_user):
    cls = request.args.get('class_number')
    subject = request.args.get('subject')
    chapter = request.args.get('chapter')
    start_num = request.args.get('start', type=int)
    end_num = request.args.get('end', type=int)

    query = QuestionRepository.query
    if cls: query = query.filter(QuestionRepository.class_number == cls)
    if subject: query = query.filter(QuestionRepository.subject.ilike(subject))
    if chapter: query = query.filter(QuestionRepository.chapter.ilike(chapter))

    if start_num is not None and end_num is not None:
        query = query.filter(
            func.cast(func.right(QuestionRepository.custom_id, 4), Integer).between(start_num, end_num)
        )

    ids = [q.id for q in query.with_entities(QuestionRepository.id).all()]
    return jsonify({"ids": ids}), 200

@app.route('/admin/exams/<int:exam_id>/bulk-add', methods=['POST'])
@token_required
def bulk_add_to_exam(current_user, exam_id):
    data = request.get_json()
    question_ids = data.get('question_ids', [])
    
    exam = Exam.query.get_or_404(exam_id)

    # 1. Fetch the actual questions from the Repository
    repo_questions = QuestionRepository.query.filter(QuestionRepository.id.in_(question_ids)).all()

    # 2. Duplicate them into the Exam Questions table
    for repo_q in repo_questions:
        # Use repo linkage to preserve subject/chapter metadata in downstream analysis.
        exists = Question.query.filter_by(exam_id=exam_id, repo_question_id=repo_q.id).first()
        if not exists:
            new_exam_q = Question(
                exam_id=exam_id,
                repo_question_id=repo_q.id,
                text=repo_q.text,
                option_a=repo_q.option_a,
                option_b=repo_q.option_b,
                option_c=repo_q.option_c,
                option_d=repo_q.option_d,
                correct_answer=repo_q.correct_answer,
                marks=repo_q.marks,
                image_path=repo_q.image_path
            )
            db.session.add(new_exam_q)
        
    db.session.commit()
    return jsonify({"message": f"Successfully added {len(question_ids)} questions"}), 200

@app.route('/admin/exams/<int:exam_id>', methods=['GET','PUT','DELETE','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exam_detail(current_user, exam_id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    exam = Exam.query.get_or_404(exam_id)

    # GET is allowed for everyone
    if request.method == 'GET':
        assigned = ExamStudent.query.filter_by(exam_id=exam_id).all()
        assigned_users = [a.student_id for a in assigned]
        d = exam.to_dict(); d['assigned_users'] = assigned_users
        return jsonify({'exam': d}), 200

    # --- SECURITY CHECK FOR PUT/DELETE ---
    allowed, error_response = check_restricted_access(exam, current_user, action="edit/delete")
    if not allowed:
        return error_response

    if request.method == 'PUT':
        data = request.json or {}
        if 'title' in data: exam.title = data['title']
        if 'description' in data: exam.description = data['description']
        if 'access_start' in data:
            exam.access_start = datetime.fromisoformat(data['access_start']) if data['access_start'] else None
        if 'access_end' in data:
            exam.access_end = datetime.fromisoformat(data['access_end']) if data['access_end'] else None
        if 'duration_minutes' in data: exam.duration_minutes = int(data['duration_minutes'])
        if 'total_marks' in data: exam.total_marks = int(data['total_marks'])
        
        # Security: School Admins cannot release results for Admin Exams (double check)
        if 'results_released' in data: 
            exam.results_released = bool(data['results_released'])
            
        db.session.commit()
        return jsonify({'message':'exam updated','exam': exam.to_dict()}), 200

    # DELETE
    ExamStudent.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)
    Question.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)
    StudentExamAttempt.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)
    db.session.delete(exam); db.session.commit()
    return jsonify({'message':'exam deleted'}), 200

@app.route('/admin/exams/<int:exam_id>/questions', methods=['GET', 'POST', 'OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exam_questions(current_user, exam_id):
    if request.method == 'OPTIONS':
        return '', 200

    exam = Exam.query.get_or_404(exam_id)

    # --- GET: List Questions for THIS Exam Only ---
    if request.method == 'GET':
        # FIX: Query the 'Question' table, filtered by THIS exam_id
        questions = Question.query.filter_by(exam_id=exam_id).all()
        
        # Use the to_dict() method which handles the Live Sync automatically
        return jsonify({'questions': [q.to_dict() for q in questions]}), 200

    # --- POST: Add New Question ---
    if request.method == 'POST':
        # Branch 1: CSV Upload
        if 'file' in request.files:
            csv_file = request.files['file']
            if not csv_file or csv_file.filename == '':
                return jsonify({'message': 'No file selected'}), 400
            if not allowed_file(csv_file.filename, ALLOWED_CSV):
                return jsonify({'message': 'Upload a CSV file (.csv)'}), 400

            csv_path = save_csv_file(csv_file)
            try:
                # Assuming import_questions_csv is defined in utils.files
                count = import_questions_csv(csv_path, exam_id, uploaded_images_map={})
                db.session.commit()
                return jsonify({'message': f'Imported {count} questions'}), 201
            except Exception as e:
                db.session.rollback()
                return jsonify({'message': 'Import failed', 'detail': str(e)}), 500
            finally:
                try:
                    os.remove(csv_path)
                except Exception:
                    pass

        # Branch 2: JSON Body (Single Question)
        data = request.get_json(silent=True) or {}
        
        # Option A: Pick Existing from Repo
        if 'repo_question_id' in data:
            repo_id = data['repo_question_id']
            # Prevent duplicates
            exists = Question.query.filter_by(exam_id=exam.id, repo_question_id=repo_id).first()
            if exists:
                return jsonify({'message':'Question already in exam'}), 400
            
            repo_q = QuestionRepository.query.get(repo_id)
            if not repo_q:
                return jsonify({'message':'Repository question not found'}), 404
                
            q = Question(
                exam_id=exam.id,
                repo_question_id=repo_q.id,
                marks=repo_q.marks # Copy default marks
            )
            db.session.add(q)
            db.session.commit()
            return jsonify({'message': 'Question linked', 'question': q.to_dict()}), 201

        # Option B: Create Manual Question
        text = (data.get('text') or '').strip()
        if not text:
            return jsonify({'message': 'Question text is required'}), 400

        q = Question(
            exam_id=exam.id,
            text=text,
            option_a=data.get('option_a'),
            option_b=data.get('option_b'),
            option_c=data.get('option_c'),
            option_d=data.get('option_d'),
            correct_answer=data.get('correct_answer'),
            marks=int(data.get('marks') or 1),
            image_path=data.get('image_path'),
        )
        db.session.add(q)
        db.session.commit()

        return jsonify({
            'message': 'Question created',
            'question': q.to_dict()
        }), 201



@app.route('/admin/exams/<int:exam_id>/questions/<int:question_id>', methods=['GET','PUT','DELETE','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exam_question_detail(current_user, exam_id, question_id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    exam = Exam.query.get_or_404(exam_id)
    q = Question.query.filter_by(exam_id=exam_id, id=question_id).first_or_404()

    if request.method == 'GET':
        # .to_dict() now uses the new Model logic to pull from Repo automatically!
        return jsonify({'question': q.to_dict()}), 200

    # --- PUT: LIVE SYNC LOGIC ---
    if request.method == 'PUT':
        data = request.json or {}
        
        # 1. CHECK IF GLOBAL LINKED
        if q.repo_question_id:
            # 2. PERMISSION CHECK
            if current_user.role == 'school_admin':
                return jsonify({
                    'message': 'Restricted: You cannot edit a Global Admin Question.',
                    'error_code': 'READ_ONLY_CONTENT'
                }), 403
            
            # 3. MASTER SYNC (Admin Only)
            # Update the REPOSITORY, not the local table
            repo_q = QuestionRepository.query.get(q.repo_question_id)
            if repo_q:
                print(f"SYNC: Admin updating Global Repo Question {repo_q.id}")
                for field in ['text','option_a','option_b','option_c','option_d','correct_answer','marks','image_path']:
                    if field in data:
                        setattr(repo_q, field, data[field])
                db.session.commit()
                return jsonify({'message':'Global Repository Question updated (Synced)', 'question': q.to_dict()}), 200
            
        # 4. LOCAL UPDATE (Standard behavior for unlinked questions)
        for field in ['text','option_a','option_b','option_c','option_d','correct_answer','marks','image_path']:
            if field in data:
                setattr(q, field, data[field])
        db.session.commit()
        return jsonify({'message':'Local Question updated','question': q.to_dict()}), 200

    # --- DELETE LOGIC ---
    # School Admins cannot delete questions from Admin Exams
    if current_user.role == 'school_admin':
        if is_admin_exam(exam):
            return jsonify({'message': 'Permission Denied: Cannot delete questions from Admin Exam.'}), 403
        # Even if exam is their own, if they try to delete a repo-linked question, 
        # do we allow it? Yes, they are just removing the LINK from their exam.
        
    db.session.delete(q)
    db.session.commit()
    return jsonify({'message':'Question deleted'}), 200

@app.post('/admin/exams/<int:exam_id>/questions/pick')
@role_required('admin', 'school_admin')
def pick_repo_questions(current_user, exam_id):
    _ = Exam.query.get_or_404(exam_id)
    data = request.get_json(silent=True) or {}
    repo_ids = data.get('repository_ids', [])
    if not isinstance(repo_ids, list) or not repo_ids:
        return jsonify({'message':'repository_ids list required'}), 400

    repo_questions = QuestionRepository.query.filter(
        QuestionRepository.id.in_(repo_ids)
    ).all()

    if not repo_questions:
        return jsonify({'message':'no repository questions found'}), 404

    created = 0
    for rq in repo_questions:
        exists = Question.query.filter_by(exam_id=exam_id, repo_question_id=rq.id).first()
        if exists:
            continue
        q = Question(
            exam_id=exam_id,
            repo_question_id=rq.id,
            text=rq.text,
            option_a=rq.option_a, option_b=rq.option_b,
            option_c=rq.option_c, option_d=rq.option_d,
            correct_answer=rq.correct_answer,
            marks=rq.marks,
            image_path=rq.image_path
        )
        db.session.add(q)
        created += 1
    db.session.commit()
    return jsonify({'message': f'{created} questions added from repository'}), 201

@app.route('/admin/exams/<int:exam_id>/attempts', methods=['GET', 'OPTIONS'])
@role_required('admin', 'school_admin')
def get_exam_attempts_list(current_user, exam_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'ok'}), 200

    # Base query for assignments
    query = db.session.query(ExamStudent, Student, User)\
        .join(Student, ExamStudent.student_id == Student.user_id)\
        .join(User, Student.user_id == User.id)\
        .filter(ExamStudent.exam_id == exam_id)

    # --- SCOPE LOCK: Filter assignments by School ID if not Super Admin ---
    if current_user.role == 'school_admin':
        query = query.filter(Student.school_id == current_user.school_id)

    assignments = query.all()

    # Fetch attempts only for students relevant to this school (to save performance)
    student_ids = [a[1].user_id for a in assignments]
    attempts = StudentExamAttempt.query.filter(
        StudentExamAttempt.exam_id == exam_id,
        StudentExamAttempt.student_id.in_(student_ids)
    ).all()
    
    attempt_map = {a.student_id: a for a in attempts}

    result = []
    for (assign, student, user) in assignments:
        att = attempt_map.get(student.user_id)
        
        status = "Not Started"
        score = None
        start_time = None
        
        if att:
            start_time = att.start_time
            if att.submitted_time:
                status = "Completed"
                score = att.score
            else:
                status = "Discontinued"

        result.append({
            "user_id": student.user_id,
            "student_id": student.student_id,
            "name": student.name,
            "status": status,
            "score": score,
            "start_time": start_time
        })

    return jsonify({"students": result}), 200

# 2. RESET ATTEMPT (The "Re-attempt" Button)
@app.delete('/admin/exams/<int:exam_id>/attempts/<int:user_id>')
@role_required('admin', 'school_admin')
def reset_student_attempt(current_user, exam_id, user_id):
    # 1. Find the attempt
    attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id, student_id=user_id).first()
    
    if not attempt:
        return jsonify({'message': 'No attempt found to reset'}), 404

    try:
        # 2. Delete associated answers first (Cascade usually handles this, but safe to be explicit)
        StudentAnswer.query.filter_by(attempt_id=attempt.id).delete()
        
        # 3. Delete the attempt itself
        db.session.delete(attempt)
        db.session.commit()
        
        return jsonify({'message': 'Attempt reset. Student can start exam again.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Reset failed', 'detail': str(e)}), 500
    
@app.post('/admin/exams/<int:exam_id>/clone')
@role_required('admin', 'school_admin')
def clone_exam(current_user, exam_id):
    original_exam = Exam.query.get_or_404(exam_id)
    new_exam = Exam(
        title=f"Copy of {original_exam.title}",
        description=original_exam.description,
        duration_minutes=original_exam.duration_minutes,
        total_marks=original_exam.total_marks,
        created_by=current_user.id,
        school_id=original_exam.school_id
    )
    for original_q in original_exam.questions:
        new_q = Question(
            text=original_q.text,
            option_a=original_q.option_a, option_b=original_q.option_b,
            option_c=original_q.option_c, option_d=original_q.option_d,
            correct_answer=original_q.correct_answer, marks=original_q.marks,
            image_path=original_q.image_path
        )
        new_exam.questions.append(new_q)
    try:
        db.session.add(new_exam)
        db.session.commit()
        return jsonify({'message': 'Exam cloned successfully', 'new_exam_id': new_exam.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to clone exam', 'detail': str(e)}), 500

@app.post('/admin/exams/<int:exam_id>/assign')
@role_required('admin', 'school_admin')
def admin_assign_students(current_user, exam_id):
    exam = Exam.query.get_or_404(exam_id)

    # --- SECURITY CHECK ---
    allowed, error_response = check_restricted_access(
        exam, current_user, action="assign students to"
    )
    if not allowed:
        return error_response

    data = request.get_json(silent=True) or {}
    replace = bool(data.get('replace', False))

    try:
        # =====================================================
        # 1️⃣ SINGLE STUDENT ASSIGN (HIGHEST PRIORITY)
        # =====================================================
        if data.get("student_id"):
            student = Student.query.filter_by(
                student_id=data["student_id"]
            ).first()

            if not student:
                return jsonify({"message": "Student not found"}), 404

            # school_admin safety
            if (
                current_user.role == "school_admin"
                and student.school_id != current_user.school_id
            ):
                return jsonify({"message": "Unauthorized student"}), 403

            exists = ExamStudent.query.filter_by(
                exam_id=exam.id,
                student_id=student.user_id
            ).first()

            if exists:
                return jsonify({"message": "Student already assigned"}), 200

            db.session.add(
                ExamStudent(
                    exam_id=exam.id,
                    student_id=student.user_id
                )
            )
            db.session.commit()

            return jsonify(
                {"message": "Student assigned successfully"}
            ), 200

        # =====================================================
        # 2️⃣ BULK ASSIGN (SCHOOL / CLASS)
        # =====================================================

        if replace:
            del_query = ExamStudent.query.filter_by(exam_id=exam.id)
            if current_user.role == "school_admin":
                del_query = del_query.join(Student).filter(
                    Student.school_id == current_user.school_id
                )
            del_query.delete(synchronize_session=False)

        students_query = Student.query

        # scope lock
        if current_user.role == "school_admin":
            students_query = students_query.filter_by(
                school_id=current_user.school_id
            )
        else:
            if data.get("school_id"):
                students_query = students_query.filter_by(
                    school_id=data["school_id"]
                )

        if data.get("class_number"):
            students_query = students_query.filter_by(
                class_number=data["class_number"]
            )

        students_to_assign = students_query.all()

        existing_rows = db.session.query(
            ExamStudent.student_id
        ).filter_by(exam_id=exam.id).all()
        already = {sid[0] for sid in existing_rows}

        new_count = 0
        for stu in students_to_assign:
            if stu.user_id not in already:
                db.session.add(
                    ExamStudent(
                        exam_id=exam.id,
                        student_id=stu.user_id
                    )
                )
                new_count += 1

        db.session.commit()

        return jsonify({
            "message": f"Assignment complete. Added {new_count} new students."
        }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.exception("admin_assign_students failed")
        return jsonify({
            "message": "Assignment failed",
            "detail": str(e)
        }), 500

@app.get('/admin/exams/<int:exam_id>/students')
@role_required('admin', 'school_admin')
def get_assigned_students(current_user, exam_id):
    assignments = ExamStudent.query.filter_by(exam_id=exam_id).all()
    student_user_ids = [a.student_id for a in assignments]
    assigned_students = Student.query.filter(Student.user_id.in_(student_user_ids)).all()
    student_list = [{
        'user_id': s.user_id,
        'name': s.name,
        'student_id': s.student_id
    } for s in assigned_students]
    return jsonify(student_list), 200

    

# ------------------------------
# Uploads and Export
# ------------------------------
@app.post('/admin/upload/image')
@role_required('admin', 'school_admin')
def admin_upload_image(current_user):
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400
    if file and allowed_file(file.filename, ALLOWED_IMG):
        saved_url = save_image_file(file)
        if saved_url:
            return jsonify({"message": "Image uploaded successfully","url": saved_url}), 201
        else:
            return jsonify({"message": "Image upload failed"}), 500
    return jsonify({"message": "Invalid image type"}), 400

@app.get('/admin/export_student_attempts')
@role_required('admin', 'school_admin')
def admin_export_student_attempts(current_user):
    try:
        exam_id = request.args.get('exam_id', type=int)
        output = export_student_attempts_to_excel(exam_id)
        filename = f'exam_{exam_id}_attempts.xlsx' if exam_id else 'all_student_attempts.xlsx'
        return send_file(output, as_attachment=True, download_name=filename,
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        tb = traceback.format_exc()
        app.logger.error("Export failed: %s\n%s", str(e), tb)
        return jsonify({'message': 'Export failed', 'detail': str(e), 'trace': tb}), 500


# ------------------------------
# Run
# ------------------------------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Bind to 0.0.0.0 for LAN testing; change if you want only localhost
    app.run(host='0.0.0.0', port=5000, debug=True)
