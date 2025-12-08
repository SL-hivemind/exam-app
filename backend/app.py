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

import jwt
import traceback

from models import (
    db, bcrypt,
    User, School, Student,
    Exam, Question, ExamStudent,
    StudentExamAttempt, StudentAnswer,
    QuestionRepository,QuestionAuditLog,   # <- must exist in your models.py
)

from utils.files import (
    ALLOWED_CSV, ALLOWED_IMG, allowed_file, import_repository_csv, save_csv_file,
    save_image_file, import_students_csv, import_questions_csv,
    IMAGES_DIR, CSV_DIR, export_student_attempts_to_excel
)

# ------------------------------
# Environment/bootstrap
# ------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)
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
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 280,
    'pool_pre_ping': True,
    'pool_size': 10,
    'max_overflow': 20,
    'pool_timeout': 10
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

        payload = {
            'sub': str(user.id),
            'role': user.role,
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + timedelta(hours=6)
        }
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        profile = {'id': user.id, 'username': user.username, 'role': user.role, 'name': getattr(user, 'name', None), 'specialist_subject': getattr(user, 'specialist_subject', None)}
        return jsonify({'auth_token': token, 'user': profile}), 200
    except Exception as e:
        return jsonify({'message': 'Login failed', 'detail': str(e)}), 500



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
    username = data.get('username')
    password = data.get('password')
    school_code = data.get('school_code') or data.get('school_id')
    number = data.get('number')
    name = data.get('name') or username
    class_number = data.get('class_number') or data.get('class')

    if not username or not password or not school_code or not number:
        return jsonify({'message': 'username, password, school_code (or school_id), and number are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'username already exists'}), 400

    school = None
    if isinstance(school_code, int) or (isinstance(school_code, str) and school_code.isdigit()):
        school = School.query.get(int(school_code))
    if not school:
        school = School.query.filter((School.code == school_code) | (School.name == school_code)).first()
    if not school:
        return jsonify({'message':'school not found'}), 400

    try:
        with db.session.begin():
            user = User(username=username, role='student',
                        email=data.get('email'), mobile_number=data.get('mobile_number'))
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

            student = Student(
                user_id=user.id,
                name=name,
                class_number=class_number,
                number=str(number),
                school_id=school.id
            )
            student.school = school
            student.generate_student_id()
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
        number = (data.get("number") or "").strip()
        if not name or not school_id or not number:
            return jsonify({"message": "name, school_id and number are required"}), 400

        if current_user.role == "school_admin":
            if not current_user.school_id or int(school_id) != int(current_user.school_id):
                return jsonify({"message": "Forbidden: wrong school"}), 403

        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        email = (data.get("email") or "").strip() or None
        mobile_number = (data.get("mobile_number") or "").strip() or None
        class_number = (data.get("class_number") or "").strip() or None

        sch = School.query.get(int(school_id))
        if not sch:
            return jsonify({"message": "school not found"}), 404

        if not username:
            num3 = f"{int(number):03d}"
            username = f"{sch.code}-{num3}" if not class_number else f"{sch.code}-{class_number}-{num3}"

        u = User(
            username=username, role="student",
            email=email, mobile_number=mobile_number, name=name
        )
        u.set_password(password or username)
        db.session.add(u)
        db.session.flush()

        stu = Student(
            user_id=u.id, name=name, school_id=int(school_id),
            class_number=class_number or None, number=number
        )
        stu.school = sch
        stu.generate_student_id()
        db.session.add(stu)
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
            'number': student.number,
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
                student.name = data.get('name') or student.name
                changed = True

            # Track inputs that may affect the student_id
            old_school_id = student.school_id
            old_class = student.class_number
            old_number = student.number

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

            if 'number' in data:
                student.number = str(data.get('number'))
                changed = True

            # If student_id is provided explicitly, validate uniqueness and apply it
            explicit_student_id = data.get('student_id')
            if explicit_student_id:
                # Check uniqueness against other records
                exists = Student.query.filter(
                    Student.student_id == explicit_student_id,
                    Student.user_id != student.user_id
                ).first()
                if exists:
                    return jsonify({'message': 'student_id already exists'}), 409

                # Apply and sync username
                student.student_id = explicit_student_id
                user.username = explicit_student_id
                changed = True
            else:
                # No explicit student_id; if any of the components changed, regenerate
                if (student.school_id != old_school_id) or \
                   (student.class_number != old_class) or \
                   (student.number != old_number):
                    # Need School on relationship for generator
                    if not student.school:
                        student.school = School.query.get(student.school_id)

                    # Generate the new ID
                    student.generate_student_id()

                    # Uniqueness check
                    clash = Student.query.filter(
                        Student.student_id == student.student_id,
                        Student.user_id != student.user_id
                    ).first()
                    if clash:
                        return jsonify({
                            'message': 'student_id already exists for this combination (school/class/number)'
                        }), 409

                    # Sync username with student_id (your convention)
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
                    'number': student.number,
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
# ADMIN/SCHOOL-ADMIN: Question Repository
# NOTE: This version assumes QuestionRepository has:
#   subject, class_number, text, options, correct_answer, marks, image_path, created_by
# Remove filters/fields if your model is simpler.
# ------------------------------
@app.route('/admin/repository/questions', methods=['GET','POST','OPTIONS'])
@token_required
def repository_questions(current_user):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    # GET - allow admin, school_admin, subject_specialist
    if request.method == 'GET':
        if current_user.role not in ('admin', 'school_admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403
        cls = request.args.get('class_number')
        subject = request.args.get('subject')
        search = request.args.get('search')
        query = QuestionRepository.query
        if current_user.role == 'subject_specialist':
            query = query.filter(QuestionRepository.subject.ilike(current_user.specialist_subject))
        if cls:
            query = query.filter(QuestionRepository.class_number == cls)
        if subject:
            query = query.filter(QuestionRepository.subject.ilike(subject))
        if search:
            like = f'%{search}%'
            query = query.filter(or_(
                QuestionRepository.text.ilike(like),
                QuestionRepository.option_a.ilike(like),
                QuestionRepository.option_b.ilike(like),
                QuestionRepository.option_c.ilike(like),
                QuestionRepository.option_d.ilike(like),
            ))
        results = query.order_by(desc(QuestionRepository.id)).limit(500).all()
        out = []
        for q in results:
            out.append({
                'id': q.id, 'text': q.text,
                'option_a': q.option_a, 'option_b': q.option_b,
                'option_c': q.option_c, 'option_d': q.option_d,
                'correct_answer': q.correct_answer,
                'class_number': q.class_number, 'subject': q.subject,
                'marks': q.marks, 'image_path': q.image_path
            })
        return jsonify({'questions': out}), 200

    # POST - allow admin and subject_specialist (create new repo question)
    if current_user.role not in ('admin', 'subject_specialist'):
        return jsonify({'message':'forbidden'}), 403

    data = request.json or {}
    final_subject = data.get('subject')
    if current_user.role == 'subject_specialist':
        final_subject = current_user.specialist_subject
    if not final_subject:
        return jsonify({'message':'subject is required'}), 400

    q = QuestionRepository(
        text=data.get('text'),
        option_a=data.get('option_a'),
        option_b=data.get('option_b'),
        option_c=data.get('option_c'),
        option_d=data.get('option_d'),
        correct_answer=(data.get('correct_answer') or '').strip() or None,
        class_number=data.get('class_number'),
        marks=int(data.get('marks') or 1),
        image_path=data.get('image_path'),
        subject=final_subject,
        created_by=current_user.id
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({'message': 'repository question created', 'question': q.id}), 201

@app.route('/admin/repository/questions/import', methods=['POST', 'OPTIONS'])
@token_required
def route_import_repository_csv(current_user):
    # Preflight check
    if request.method == 'OPTIONS':
        return jsonify({'message': 'ok'}), 200

    # Permission check
    if current_user.role not in ('admin', 'subject_specialist', 'school_admin'):
        return jsonify({'message': 'forbidden'}), 403

    # File check
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    
    if not allowed_file(file.filename, ALLOWED_CSV):
        return jsonify({'message': 'File must be a CSV'}), 400

    try:
        # A. Save file temporarily
        csv_path = save_csv_file(file)

        # B. Call the logic in utils/files.py
        count = import_repository_csv(csv_path, current_user.id)

        # C. Commit changes
        db.session.commit()

        # D. Clean up (Optional: remove the temp csv file to save space)
        try:
            os.remove(csv_path)
        except:
            pass

        return jsonify({'message': f'Successfully imported {count} questions'}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Import Error: {e}")
        return jsonify({'message': 'Import failed', 'detail': str(e)}), 500

@app.route('/admin/repository/questions/<int:q_id>', methods=['GET','PUT','DELETE','OPTIONS'])
@token_required
def repository_question_detail(current_user, q_id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    q = QuestionRepository.query.get_or_404(q_id)
    # GET: allow admin, school_admin, subject_specialist
    if request.method == 'GET':
        if current_user.role not in ('admin', 'school_admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403
        return jsonify({
            'id': q.id,
            'text': q.text,
            'option_a': q.option_a,
            'option_b': q.option_b,
            'option_c': q.option_c,
            'option_d': q.option_d,
            'correct_answer': q.correct_answer,
            'class_number': q.class_number,
            'subject': q.subject,
            'marks': q.marks,
            'image_path': q.image_path,
            'created_by': q.created_by
        }), 200

    # PUT: allow admin and subject_specialist to edit
    if request.method == 'PUT':
        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403
        data = request.get_json(silent=True) or {}
        for field in ['text','option_a','option_b','option_c','option_d','correct_answer','class_number','subject','marks','image_path']:
            if field in data:
                setattr(q, field, data.get(field))
        try:
            q.last_edited_by = current_user.id
            q.last_edited_at = datetime.utcnow()
        except Exception:
            pass
        db.session.commit()
        app.logger.info("repo question %s updated by %s", q.id, current_user.username)
        return jsonify({'message':'updated'}), 200

    # DELETE: allow admin and subject_specialist
    if request.method == 'DELETE':
        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message':'forbidden'}), 403
        db.session.delete(q)
        db.session.commit()
        return jsonify({'message':'deleted'}), 200
    
@app.route('/admin/repository/questions/bulk', methods=['PUT', 'OPTIONS']) # <--- CHANGED
@token_required
def bulk_update_questions(current_user):
    # 1. Handle Preflight (CORS Check)
    if request.method == 'OPTIONS':
        return jsonify({'message': 'ok'}), 200

    # 2. Security Check
    if current_user.role not in ('admin', 'subject_specialist'):
        return jsonify({'message': 'forbidden'}), 403

    # 3. Main Logic
    data = request.json or [] 
    updated_count = 0
    
    try:
        for item in data:
            q_id = item.get('id')
            q = QuestionRepository.query.get(q_id)
            
            if not q:
                continue

            # Security: If Specialist, ensure they own the subject
            if current_user.role == 'subject_specialist':
                if not q.subject or q.subject.lower() != (current_user.specialist_subject or '').lower():
                    continue 

            # Track changes for Audit Log
            changes = []
            
            def check_change(obj, field, new_val):
                old_val = getattr(obj, field)
                # Convert to string for safe comparison
                if str(old_val) != str(new_val):
                    setattr(obj, field, new_val)
                    changes.append(f"{field}: {old_val} -> {new_val}")

            check_change(q, 'text', item.get('text'))
            check_change(q, 'option_a', item.get('option_a'))
            check_change(q, 'option_b', item.get('option_b'))
            check_change(q, 'option_c', item.get('option_c'))
            check_change(q, 'option_d', item.get('option_d'))
            check_change(q, 'correct_answer', item.get('correct_answer'))
            check_change(q, 'marks', int(item.get('marks') or 1))
            check_change(q, 'class_number', item.get('class_number'))
            
            # If changes occurred, save and log
            if changes:
                # Create Log Entry
                log = QuestionAuditLog(
                    user_id=current_user.id,
                    action='UPDATE',
                    question_id=q.id,
                    details="; ".join(changes)
                )
                db.session.add(log)
                updated_count += 1

        db.session.commit()
        return jsonify({'message': f'Successfully updated {updated_count} questions'}), 200

    except Exception as e:
        db.session.rollback()
        # Print error to terminal for debugging
        print(f"Bulk Update Error: {str(e)}")
        return jsonify({'message': 'Bulk update failed', 'detail': str(e)}), 500
@app.get('/admin/audit-logs')
@token_required
def get_audit_logs(current_user):
    if current_user.role not in ('admin', 'subject_specialist'):
        return jsonify({'message': 'forbidden'}), 403
    
    query = QuestionAuditLog.query
    
    # Specialists only see their own history
    if current_user.role == 'subject_specialist':
        query = query.filter_by(user_id=current_user.id)
        
    logs = query.order_by(desc(QuestionAuditLog.timestamp)).limit(100).all()
    
    return jsonify({'logs': [{
        'id': l.id,
        'action': l.action,
        'question_id': l.question_id,
        'details': l.details,
        'timestamp': l.timestamp.isoformat(),
        'username': l.user.username
    } for l in logs]}), 200



# ------------------------------
# ADMIN/SCHOOL-ADMIN: Exams
# ------------------------------
@app.route('/admin/exams', methods=['GET','POST','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exams(current_user):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

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
        school_id = data.get('school_id')

        try:
            ast = datetime.fromisoformat(access_start) if access_start else None
            aend = datetime.fromisoformat(access_end) if access_end else None
        except Exception:
            return jsonify({'message':'invalid datetime format (use ISO)'}), 400

        exam = Exam(
            title=title, description=description,
            access_start=ast, access_end=aend,
            duration_minutes=duration, total_marks=total_marks,
            created_by=current_user.id, school_id=school_id
        )
        db.session.add(exam); db.session.commit()
        return jsonify({'message':'exam created','exam': exam.to_dict()}), 201

    exams = Exam.query.order_by(desc(Exam.created_at)).all()
    return jsonify({'exams':[e.to_dict() for e in exams]}), 200

@app.route('/admin/exams/<int:exam_id>', methods=['GET','PUT','DELETE','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exam_detail(current_user, exam_id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    exam = Exam.query.get_or_404(exam_id)
    if request.method == 'GET':
        assigned = ExamStudent.query.filter_by(exam_id=exam_id).all()
        assigned_users = [a.student_id for a in assigned]
        d = exam.to_dict(); d['assigned_users'] = assigned_users
        return jsonify({'exam': d}), 200

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
        if 'results_released' in data: exam.results_released = bool(data['results_released'])
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
    # --- Preflight ---
    if request.method == 'OPTIONS':
        return '', 200

    exam = Exam.query.get_or_404(exam_id)

    # --- GET: list questions ---
    if request.method == 'GET':
        questions = Question.query.filter_by(exam_id=exam.id).all()
        out = [{
            'id': q.id,
            'exam_id': q.exam_id,
            'text': q.text,
            'option_a': q.option_a,
            'option_b': q.option_b,
            'option_c': q.option_c,
            'option_d': q.option_d,
            'correct_answer': q.correct_answer,
            'image_path': q.image_path,
            'marks': q.marks,
            'repo_question_id': getattr(q, 'repo_question_id', None),
        } for q in questions]
        return jsonify({'questions': out}), 200

    # --- POST: create (CSV or single JSON) ---
    try:
        # Branch 1: CSV upload
        if 'file' in request.files:
            csv_file = request.files['file']
            if not csv_file or csv_file.filename == '':
                return jsonify({'message': 'No file selected'}), 400
            if not allowed_file(csv_file.filename, ALLOWED_CSV):
                return jsonify({'message': 'Upload a CSV file (.csv)'}), 400

            csv_path = save_csv_file(csv_file)
            with db.session.begin_nested():
                count = import_questions_csv(csv_path, exam_id, uploaded_images_map={})
            db.session.commit()
            return jsonify({'message': f'Imported {count} questions'}), 201

        # Branch 2: JSON body (single question)
        data = request.get_json(silent=True) or {}
        text = (data.get('text') or '').strip()
        if not text:
            # Explicit error so we don't fall through
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
        # Optional linkage to repository question for traceability
        if 'repo_question_id' in data:
            try:
                q.repo_question_id = int(data['repo_question_id'])
            except (TypeError, ValueError):
                pass

        db.session.add(q)
        db.session.commit()

        # Return explicit JSON (don’t rely on model method)
        return jsonify({
            'message': 'Question created',
            'question': {
                'id': q.id,
                'exam_id': q.exam_id,
                'text': q.text,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
                'correct_answer': q.correct_answer,
                'image_path': q.image_path,
                'marks': q.marks,
                'repo_question_id': getattr(q, 'repo_question_id', None),
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        app.logger.exception("Create question failed")
        return jsonify({'message': 'Failed to create question', 'detail': str(e)}), 500


@app.route('/admin/exams/<int:exam_id>/questions/<int:question_id>', methods=['GET','PUT','DELETE','OPTIONS'])
@role_required('admin', 'school_admin')
def admin_exam_question_detail(current_user, exam_id, question_id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "ok"}), 200

    _ = Exam.query.get_or_404(exam_id)
    q = Question.query.filter_by(exam_id=exam_id, id=question_id).first_or_404()

    if request.method == 'GET':
        return jsonify({'question': q.to_dict()}), 200
    if request.method == 'PUT':
        data = request.json or {}
        for field in ['text','option_a','option_b','option_c','option_d','correct_answer','marks','image_path']:
            if field in data:
                setattr(q, field, data[field])
        db.session.commit()
        return jsonify({'message':'Question updated','question': q.to_dict()}), 200

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
        q = Question(
            exam_id=exam_id,
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

    # Fetch all assigned students
    assignments = db.session.query(ExamStudent, Student, User)\
        .join(Student, ExamStudent.student_id == Student.user_id)\
        .join(User, Student.user_id == User.id)\
        .filter(ExamStudent.exam_id == exam_id).all()

    # Fetch all actual attempts
    attempts = StudentExamAttempt.query.filter_by(exam_id=exam_id).all()
    # Map attempt by user_id for O(1) lookup
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
                status = "Discontinued" # or "In Progress"

        result.append({
            "user_id": student.user_id,
            "student_id": student.student_id, # The text ID (SCH-10-01)
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
    data = request.get_json(silent=True) or {}
    replace = bool(data.get('replace', False))

    try:
        if replace:
            ExamStudent.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)

        students_query = Student.query
        if data.get('school_id'):
            students_query = students_query.filter_by(school_id=data['school_id'])
        if data.get('class_number'):
            students_query = students_query.filter_by(class_number=data['class_number'])

        students_to_assign = students_query.all()

        existing_rows = db.session.query(ExamStudent.student_id).filter_by(exam_id=exam.id).all()
        already = {sid for (sid,) in existing_rows} if existing_rows and isinstance(existing_rows[0], tuple) else {r.student_id for r in existing_rows}

        new_count = 0
        for stu in students_to_assign:
            if stu.user_id not in already:
                db.session.add(ExamStudent(exam_id=exam.id, student_id=stu.user_id))
                new_count += 1

        db.session.commit()
        return jsonify({'message': f'Assignment complete. Added {new_count} new students.'}), 200

    except Exception as e:
        db.session.rollback()
        app.logger.exception("admin_assign_students failed")
        return jsonify({'message': 'Assignment failed', 'detail': str(e)}), 500

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
# STUDENT FLOW
# ------------------------------
@app.get('/student/exams')
@role_required('student')
def student_list_exams(current_user):
    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify({'message':'student profile not found'}), 400
    assigned = ExamStudent.query.filter_by(student_id=student.user_id).join(Exam).order_by(desc(Exam.id)).all()
    exams = []
    for a in assigned:
        e = a.exam
        attempt = StudentExamAttempt.query.filter_by(exam_id=e.id, student_id=student.user_id).first()
        exams.append({
            'exam': e.to_dict(),
            'assigned': True,
            'attempted': bool(attempt and attempt.submitted_time is not None)
        })
    return jsonify({'exams': exams}), 200

@app.get('/student/exams/<int:exam_id>/can_start')
@role_required('student')
def student_can_start(current_user, exam_id):
    student = Student.query.filter_by(user_id=current_user.id).first()
    exam = Exam.query.get_or_404(exam_id)
    assigned = ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first() is not None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    access_start = to_utc_naive(exam.access_start)
    access_end = to_utc_naive(exam.access_end)
    within_window = True
    if access_start and now < access_start: within_window = False
    if access_end and now > access_end: within_window = False
    attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
    already_submitted = bool(attempt and attempt.submitted_time)
    if access_end and now > access_end:
        within_window = False
    if exam.results_released:
        within_window = False
    return jsonify({
        'assigned': assigned,
        'within_window': within_window,
        'already_submitted': already_submitted,
        'duration_minutes': exam.duration_minutes,
        'exam': exam.to_dict()
    }), 200

@app.post('/student/exams/<int:exam_id>/start')
@role_required('student')
def student_start_exam(current_user, exam_id):
    student = Student.query.filter_by(user_id=current_user.id).first()
    exam = Exam.query.get_or_404(exam_id)
    if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first():
        return jsonify({'message':'not assigned to exam'}), 403
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    access_start = to_utc_naive(exam.access_start)
    access_end = to_utc_naive(exam.access_end)
    if access_start and now < access_start:
        return jsonify({'message':'exam not opened yet'}), 403
    if access_end and now > access_end:
        return jsonify({'message':'exam start window closed'}), 403
    attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
    if attempt and attempt.submitted_time:
        return jsonify({'message':'already submitted'}), 400
    if not attempt:
        attempt = StudentExamAttempt(exam_id=exam.id, student_id=student.user_id, start_time=now)
        allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
        if exam.access_end:
            access_end_utc = to_utc_naive(exam.access_end)
            allowed_end = min(allowed_end, access_end_utc)
        db.session.add(attempt)
        db.session.commit()
        return jsonify({'message':'started','attempt_id': attempt.id, 'start_time': attempt.start_time.isoformat() + 'Z', 'expires_at': allowed_end.isoformat() + 'Z'}), 200
    else:
        allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
        if exam.access_end:
            access_end_utc = to_utc_naive(exam.access_end)
            allowed_end = min(allowed_end, access_end_utc)
        return jsonify({'message':'exam already started', 'attempt_id': attempt.id, 'start_time': attempt.start_time.isoformat() + 'Z', 'expires_at': allowed_end.isoformat()+ 'Z'}), 200

@app.get('/student/exams/<int:exam_id>/questions')
@role_required('student')
def student_get_exam_questions(current_user, exam_id):
    student = Student.query.filter_by(user_id=current_user.id).first()
    exam = Exam.query.get_or_404(exam_id)
    if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first():
        return jsonify({'message':'not assigned to exam'}), 403
    questions = Question.query.filter_by(exam_id=exam.id).all()
    questions_data = [{
        'id': q.id, 'text': q.text,
        'option_a': q.option_a, 'option_b': q.option_b,
        'option_c': q.option_c, 'option_d': q.option_d,
        'marks': q.marks, 'image_path': q.image_path
    } for q in questions]
    return jsonify({'questions': questions_data}), 200

@app.post('/student/exams/<int:exam_id>/submit')
@role_required('student')
def student_submit_exam(current_user, exam_id):
    student = Student.query.filter_by(user_id=current_user.id).first()
    exam = Exam.query.get_or_404(exam_id)
    payload = request.get_json(silent=True) or {}
    answers = payload.get('answers', [])

    attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
    if not attempt:
        return jsonify({'message': 'start the exam first'}), 400
    if attempt.submitted_time:
        return jsonify({'message': 'already submitted'}), 400

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
    if now > allowed_end:
        return jsonify({'message': 'time is over'}), 403

    total_score = 0
    try:
        for ans in answers:
            qid = ans.get('question_id')
            resp = ans.get('answer')
            if not qid:
                continue
            q = Question.query.get(qid)
            if not q:
                continue
            is_correct = False
            marks_awarded = 0
            if q.correct_answer and str(resp).strip().upper() == str(q.correct_answer).strip().upper():
                is_correct = True
                marks_awarded = int(q.marks or 0)
            sa = StudentAnswer(
                attempt_id=attempt.id,
                question_id=qid,
                answer=resp,
                is_correct=is_correct,
                marks_awarded=marks_awarded
            )
            db.session.add(sa)
            total_score += marks_awarded

        attempt.submitted_time = now
        attempt.score = total_score
        db.session.add(attempt)
        db.session.commit()
        return jsonify({'message': 'submitted', 'score': total_score}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'message': 'submission failed','detail': str(e.__dict__.get("orig") or e)}), 500

@app.get('/student/exams/<int:exam_id>/result')
@role_required('student')
def student_view_result(current_user, exam_id):
    exam = Exam.query.get_or_404(exam_id)
    if not exam.results_released:
        return jsonify({'message':'results not released yet'}), 403
    student = Student.query.filter_by(user_id=current_user.id).first()
    attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
    if not attempt or not attempt.submitted_time:
        return jsonify({'message':'no attempt found'}), 400
    answers = []
    for a in attempt.answers:
        q = Question.query.get(a.question_id)
        answers.append({
            'question_id': q.id, 'text': q.text,
            'answer': a.answer, 'is_correct': a.is_correct,
            'marks_awarded': a.marks_awarded, 'marks': q.marks
        })
    return jsonify({
        'exam': exam.to_dict(),
        'attempt': {
            'start_time': attempt.start_time.isoformat(),
            'submitted_time': attempt.submitted_time.isoformat(),
            'score': attempt.score
        },
        'answers': answers
    }), 200

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
