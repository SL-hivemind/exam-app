import os
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
import secrets

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import desc

import jwt

from models import (
    db, bcrypt, User, School, Student, Exam, Question,
    ExamStudent, StudentExamAttempt, StudentAnswer
)
from utils.files import (
    ALLOWED_CSV, ALLOWED_IMG, allowed_file, save_csv_file,
    save_image_file, import_students_csv, import_questions_csv,
    IMAGES_DIR, CSV_DIR, export_student_attempts_to_excel
)

# ----- Load environment -----
BASE_DIR = os.path.dirname(__file__)
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

# ----- App init -----
app = Flask(__name__)

# Database config built directly from env (no hardcoding)
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

if not all([DB_USER, DB_PASSWORD, DB_HOST, DB_NAME]):
    raise RuntimeError("Database environment variables not set correctly!")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", secrets.token_hex(16))

# ----- Logging -----
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"DB_USER: {DB_USER}")
logger.info(f"DB_PASSWORD: {'*' * 8} (hidden)")
logger.info(f"DB_HOST: {DB_HOST}")
logger.info(f"DB_NAME: {DB_NAME}")

# Init extensions
db.init_app(app)
bcrypt.init_app(app)
# In app.py
CORS(
  app,
  resources={r"/*": {"origins": [
      "http://localhost:3000", 
      "https://sl-exam.onrender.com"  # 👈 Add this line
  ]}},
  supports_credentials=True,
)

# File paths
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
CSV_FOLDER = CSV_DIR
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CSV_FOLDER, exist_ok=True)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ----- Auth helpers -----
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

def admin_required(f):
    @wraps(f)
    @token_required
    def wrapper(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': 'Admin only'}), 403
        return f(current_user, *args, **kwargs)
    return wrapper

# ----- DB Initialization -----
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables ensured.")
    except Exception as e:
        logger.error(f"Database init failed: {e}")

# ----- Health check route -----
@app.route("/health")
def health():
    return jsonify({"status": "ok"})



# ----- Auth routes -----
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        identifier = data.get('username')  # this can be username OR student_id
        password = data.get('password')
        if not identifier or not password:
            return jsonify({'message': 'username/student_id and password required'}), 400

        # Try login by username first
        user = User.query.filter_by(username=identifier).first()
        
        # If no user, try login by student_id
        if not user:
            student = Student.query.filter_by(student_id=identifier).first()
            if student:
                user = User.query.get(student.user_id)

        # If still no user or wrong password
        if not user or not user.check_password(password):
            return jsonify({'message': 'invalid credentials'}), 401

        # Create JWT token
        payload = {
            'sub': str(user.id),
            'role': user.role,
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + timedelta(hours=6)
        }
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        # return profile info
        profile = {'id': user.id, 'username': user.username, 'role': user.role}
        return jsonify({'auth_token': token, 'user': profile}), 200
    except Exception as e:
        return jsonify({'message': 'Login failed', 'detail': str(e)}), 500


# ----- Registration (student self-register) -----
@app.route('/register', methods=['POST'])
def register_student():
    """
    Accepts:
    {
      "username": "SCHOOL-10-1",   # required: this will be the login username
      "password": "...",           # required
      "name": "...",               # student name (optional but recommended)
      "school_code": "ABC",        # required to link student to a school (or school_id)
      "class_number": "10",        # optional
      "number": "1",               # required - student number
      "email": "...",              # optional
      "mobile_number": "..."       # optional
    }
    """
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    school_code = data.get('school_code') or data.get('school_id')
    number = data.get('number')
    name = data.get('name') or username
    class_number = data.get('class_number') or data.get('class')

    if not username or not password or not school_code or not number:
        return jsonify({'message': 'username, password, school_code (or school_id), and number are required'}), 400

    # check user uniqueness
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'username already exists'}), 400

    # find school
    school = None
    if isinstance(school_code, int) or (isinstance(school_code, str) and school_code.isdigit()):
        school = School.query.get(int(school_code))
    if not school:
        school = School.query.filter((School.code == school_code) | (School.name == school_code)).first()
    if not school:
        return jsonify({'message':'school not found'}), 400

    try:
        with db.session.begin():
            user = User(username=username, role='student', email=data.get('email'), mobile_number=data.get('mobile_number'))
            user.set_password(password)
            db.session.add(user)
            db.session.flush()  # get user.id

            student = Student(
                user_id=user.id,
                name=name,
                class_number=class_number,
                number=str(number),
                school_id=school.id
            )
            # Explicitly load school relationship before generating student_id
            student.school = school
            student.generate_student_id()  # <-- generate and set student_id before add/flush
            db.session.add(student)
            db.session.flush()

            # Now set the username to the generated student_id
            user.username = student.student_id
            db.session.add(user)
            db.session.commit()
            return jsonify({'message':'student created','username': user.username}), 201
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'message': 'registration failed', 'detail': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'registration failed', 'detail': str(e)}), 500

# ----- Public: Schools list (for registration) -----
@app.route('/schools', methods=['GET'])
def public_schools():
    schools = School.query.all()
    return jsonify({'schools': [s.to_dict() for s in schools]}), 200

# ----- Admin: Schools CRUD -----
@app.route('/admin/schools', methods=['GET', 'POST'])
@admin_required
def admin_schools(current_user):
    if request.method == 'POST':
        data = request.json or {}
        name = data.get('name'); code = data.get('code')
        if not name or not code:
            return jsonify({'message': 'name and code required'}), 400
        if School.query.filter_by(code=code).first():
            return jsonify({'message': 'code already exists'}), 400
        s = School(name=name, code=code, created_by=current_user.id)
        db.session.add(s); db.session.commit()
        return jsonify({'message':'school created','school': s.to_dict()}), 201

    # GET list
    schools = School.query.all()
    return jsonify({'schools': [s.to_dict() for s in schools]}), 200


@app.route('/admin/schools/<int:school_id>', methods=['GET','PUT','DELETE'])
@admin_required
def admin_school_detail(current_user, school_id):
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


# ----- Admin: Students CRUD (single + list) -----

@app.route('/admin/students/import', methods=['POST', 'OPTIONS'])
@admin_required
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
        import traceback
        traceback.print_exc()  # <--- Add this line for debugging
        return jsonify({'message': 'Import failed', 'detail': str(e)}), 400


@app.route('/admin/students', methods=['GET','POST'])
@admin_required
def admin_students(current_user):
    if request.method == 'POST':
        data = request.json or {}
        username = data.get('username')
        password = data.get('password') or secrets.token_urlsafe(8)
        number = data.get('number')
        school_code = data.get('school_code') or data.get('school_id')
        name = data.get('name') or username
        class_number = data.get('class_number') or data.get('class')

        if not number or not school_code:
            return jsonify({'message': 'number and school_code (or school_id) required'}), 400

        school = None
        if isinstance(school_code, int) or (isinstance(school_code, str) and school_code.isdigit()):
            school = School.query.get(int(school_code))
        if not school:
            school = School.query.filter((School.code == school_code) | (School.name == school_code)).first()
        if not school:
            return jsonify({'message':'school not found'}), 400

        try:
            # Use a temporary username
            user = User(username="__tmp__", role='student')
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
            # Explicitly load school relationship before generating student_id
            student.school = school
            student.generate_student_id()  # <-- generate and set student_id before add/flush
            db.session.add(student)
            db.session.flush()

            # Now set the username to the generated student_id
            user.username = student.student_id
            db.session.add(user)
            db.session.commit()
            return jsonify({'message':'student created','username': user.username}), 201
        except IntegrityError as e:
            db.session.rollback()
            print("IntegrityError:", e)
            return jsonify({'message':'create failed','detail': str(e)}), 400
        except Exception as e:
            db.session.rollback()
            print("Exception:", e)
            return jsonify({'message':'create failed','detail': str(e)}), 500

     # GET list with pagination and search
    page = request.args.get('page', 1, type=int)
    per_page = 20  # Show 20 students per page
    search_term = request.args.get('search', '', type=str)

    students_query = Student.query.join(School).join(User)

    if search_term:
        students_query = students_query.filter(
            User.username.ilike(f'%{search_term}%') |
            Student.name.ilike(f'%{search_term}%')
        )

    pagination = students_query.order_by(Student.name).paginate(page=page, per_page=per_page, error_out=False)
    students_on_page = pagination.items

    out = []
    for s in students_on_page:
        # ... (your existing loop to build the student dictionary)
        out.append({
            'id': s.user_id,
            'username': s.user.username,
            'name': s.name,
            # ... other fields
        })

    return jsonify({
        'students': out,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }), 200



@app.route('/admin/students/<int:user_id>', methods=['GET','PUT','DELETE'])
@admin_required
def admin_student_detail(current_user, user_id):
    user = User.query.get_or_404(user_id)
    if user.role != 'student':
        return jsonify({'message':'not a student user'}), 400
    student = Student.query.filter_by(user_id=user.id).first_or_404()

    if request.method == 'GET':
        return jsonify({
            'user_id': user.id, 'username': user.username, 'email': user.email,
            'name': student.name, 'class_number': student.class_number, 'number': student.number,
            'school_id': student.school_id
        }), 200

    if request.method == 'PUT':
        data = request.json or {}
        changed = False
        if 'email' in data: user.email = data.get('email'); changed = True
        if 'password' in data: user.set_password(data.get('password')); changed = True
        if 'name' in data: student.name = data.get('name'); changed = True
        if 'class_number' in data: student.class_number = data.get('class_number'); changed = True
        if 'number' in data: student.number = str(data.get('number')); changed = True
        if 'school_id' in data:
            s = School.query.get(data.get('school_id'))
            if not s: return jsonify({'message':'school not found'}), 400
            student.school_id = s.id; changed = True
        if changed: db.session.commit()
        return jsonify({'message':'student updated'}), 200

    # DELETE
    db.session.delete(student)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message':'student deleted'}), 200


# ----- Admin: Exams CRUD -----
@app.route('/admin/exams', methods=['GET','POST'])
@admin_required
def admin_exams(current_user):
    if request.method == 'POST':
        data = request.json or {}
        title = data.get('title'); description = data.get('description')
        access_start = data.get('access_start'); access_end = data.get('access_end')
        duration = data.get('duration_minutes') or data.get('duration') or 60
        total_marks = data.get('total_marks') or 0
        school_id = data.get('school_id')

        if not title:
            return jsonify({'message':'title is required'}), 400
        try:
            ast = datetime.fromisoformat(access_start) if access_start else None
            aend = datetime.fromisoformat(access_end) if access_end else None
        except Exception:
            return jsonify({'message':'invalid datetime format (use ISO)'}), 400

        exam = Exam(title=title, description=description, access_start=ast, access_end=aend,
                    duration_minutes=int(duration), total_marks=int(total_marks),
                    created_by=current_user.id)
        db.session.add(exam); db.session.commit()
        return jsonify({'message':'exam created','exam':exam.to_dict()}), 201

    exams = Exam.query.order_by(desc(Exam.created_at)).all()
    return jsonify({'exams':[e.to_dict() for e in exams]}), 200


@app.route('/admin/exams/<int:exam_id>', methods=['GET','PUT','DELETE'])
@admin_required
def admin_exam_detail(current_user, exam_id):
    exam = Exam.query.get_or_404(exam_id)
    if request.method == 'GET':
        assigned = ExamStudent.query.filter_by(exam_id=exam_id).all()
        assigned_users = [a.student_id for a in assigned]
        d = exam.to_dict(); d['assigned_users'] = assigned_users
        return jsonify({'exam': d}), 200

    if request.method == 'PUT':
        data = request.json or {}
        exam.title = data.get('title', exam.title)
        exam.description = data.get('description', exam.description)
        if 'access_start' in data:
            exam.access_start = datetime.fromisoformat(data['access_start']) if data['access_start'] else None
        if 'access_end' in data:
            exam.access_end = datetime.fromisoformat(data['access_end']) if data['access_end'] else None
        if 'duration_minutes' in data:
            exam.duration_minutes = int(data['duration_minutes'])
        if 'total_marks' in data:
            exam.total_marks = int(data['total_marks'])
        if 'results_released' in data:
            exam.results_released = bool(data['results_released'])
        db.session.commit()
        return jsonify({'message':'exam updated','exam': exam.to_dict()}), 200

    # DELETE
    ExamStudent.query.filter_by(exam_id=exam.id).delete()
    Question.query.filter_by(exam_id=exam.id).delete()
    StudentExamAttempt.query.filter_by(exam_id=exam.id).delete()
    db.session.delete(exam); db.session.commit()
    return jsonify({'message':'exam deleted'}), 200


# ----- Admin: Questions CRUD for an exam (single + bulk import) -----
@app.route('/admin/exams/<int:exam_id>/questions', methods=['GET', 'POST'])
@admin_required
def admin_exam_questions(current_user, exam_id):
    exam = Exam.query.get_or_404(exam_id)

    if request.method == 'POST':
        # Determine if this is a single question (JSON) or bulk CSV upload
        if 'file' in request.files:
            # ---- BULK CSV + optional images ----
            csv_file = request.files['file']
            if csv_file.filename == '':
                return jsonify({'message': 'No file selected'}), 400
            if not allowed_file(csv_file.filename, ALLOWED_CSV):
                return jsonify({'message': 'Upload a CSV file'}), 400

            csv_path = save_csv_file(csv_file)

            # Handle optional images (multiple files)
            uploaded_images = {}
            for key in request.files:
                f = request.files[key]
                if allowed_file(f.filename, ALLOWED_IMG):
                    saved_name = save_image_file(f)
                    uploaded_images[f.filename] = saved_name

            try:
                with db.session.begin_nested():  # nested transaction
                    count = import_questions_csv(csv_path, exam_id, uploaded_images)
                db.session.commit()
                return jsonify({'message': f'Imported {count} questions', 
                                'uploaded_images': list(uploaded_images.values())}), 201
            except Exception as e:
                db.session.rollback()
                return jsonify({'message': 'Import failed', 'detail': str(e)}), 400

        else:
            # ---- SINGLE QUESTION JSON ----
            data = request.json or {}
            text = data.get('text')
            if not text:
                return jsonify({'message': 'Question text is required'}), 400
            option_a = data.get('option_a')
            option_b = data.get('option_b')
            option_c = data.get('option_c')
            option_d = data.get('option_d')
            correct = data.get('correct_answer')
            marks = int(data.get('marks') or 1)
            image_path = data.get('image_path')  # optional, must be uploaded separately via files.py

            q = Question(
                exam_id=exam.id, text=text, option_a=option_a, option_b=option_b,
                option_c=option_c, option_d=option_d, correct_answer=correct,
                marks=marks, image_path=image_path
            )
            db.session.add(q)
            db.session.commit()
            return jsonify({'message': 'Question created', 'question': q.to_dict()}), 201

    # ---- GET all questions for this exam ----
    questions = Question.query.filter_by(exam_id=exam.id).all()
    out = [q.to_dict() for q in questions]
    return jsonify({'questions': out}), 200


# ----- Admin: Question detail (GET, PUT, DELETE) -----
@app.route('/admin/exams/<int:exam_id>/questions/<int:question_id>', methods=['GET','PUT','DELETE'])
@admin_required
def admin_exam_question_detail(current_user, exam_id, question_id):
    exam = Exam.query.get_or_404(exam_id)
    q = Question.query.filter_by(exam_id=exam.id, id=question_id).first_or_404()

    if request.method == 'GET':
        return jsonify({'question': q.to_dict()}), 200

    if request.method == 'PUT':
        data = request.json or {}
        changed = False
        for field in ['text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'marks', 'image_path']:
            if field in data:
                setattr(q, field, data[field])
                changed = True
        if changed:
            db.session.commit()
        return jsonify({'message': 'Question updated', 'question': q.to_dict()}), 200

    # DELETE
    db.session.delete(q)
    db.session.commit()
    return jsonify({'message': 'Question deleted'}), 200

# POST to clone an existing exam and its questions
@app.route('/admin/exams/<int:exam_id>/clone', methods=['POST'])
@admin_required
def clone_exam(current_user, exam_id):
    original_exam = Exam.query.get_or_404(exam_id)
    new_exam = Exam(
        title=f"Copy of {original_exam.title}",
        description=original_exam.description,
        duration_minutes=original_exam.duration_minutes,
        total_marks=original_exam.total_marks,
        created_by=current_user.id
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

# ----- Admin: assign students to exam ----- (keeps existing flexible behavior)

# In app.py

@app.route('/admin/exams/<int:exam_id>/assign', methods=['POST'])
@admin_required
def admin_assign_students(current_user, exam_id):
    exam = Exam.query.get_or_404(exam_id)
    data = request.json or {}
    replace = data.get('replace', False)  # <-- FIX: default is append (False)

    try:
        if replace:
            # Clear existing assignments
            ExamStudent.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)

        # Build student query
        students_query = Student.query
        if data.get('school_id'):
            students_query = students_query.filter_by(school_id=data['school_id'])
        if data.get('class_number'):
            students_query = students_query.filter_by(class_number=data['class_number'])
        students_to_assign = students_query.all()

        # Get already assigned
        existing_assignments = db.session.query(ExamStudent.student_id).filter_by(exam_id=exam.id).all()
        assigned_student_ids = {row.student_id for row in existing_assignments}

        new_assignments_count = 0
        for student in students_to_assign:
            if student.user_id not in assigned_student_ids:
                db.session.add(ExamStudent(exam_id=exam.id, student_id=student.user_id))
                new_assignments_count += 1

        db.session.commit()
        return jsonify({
            'message': f'Assignment complete. Added {new_assignments_count} new students.'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Assignment failed for exam {exam_id}: {e}")
        return jsonify({'message': 'Assignment failed due to an internal error'}), 500


# GET a list of students assigned to an exam
@app.route('/admin/exams/<int:exam_id>/students', methods=['GET'])
@admin_required
def get_assigned_students(current_user, exam_id):
    assignments = ExamStudent.query.filter_by(exam_id=exam_id).all()
    student_user_ids = [a.student_id for a in assignments]
    
    assigned_students = Student.query.filter(Student.user_id.in_(student_user_ids)).all()
    
    # Serialize the student data
    student_list = []
    for s in assigned_students:
        student_list.append({
            'user_id': s.user_id,
            'name': s.name,
            'student_id': s.student_id
            # Add other fields as needed by your frontend
        })
        
    return jsonify(student_list), 200


# ----- Student: list assigned exams (student side) -----
@app.route('/student/exams', methods=['GET'])
@token_required
def student_list_exams(current_user):
    if current_user.role != 'student':
        return jsonify({'message':'unauthorized'}), 403
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

from datetime import timezone

def to_utc_naive(dt):
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    # Assume naive is local time
    local_tz = datetime.now().astimezone().tzinfo
    dt = dt.replace(tzinfo=local_tz)
    return dt.astimezone(timezone.utc).replace(tzinfo=None)

# ----- Student: can_start, start, get questions, submit, view result -----
@app.route('/student/exams/<int:exam_id>/can_start', methods=['GET'])
@token_required
def student_can_start(current_user, exam_id):
    if current_user.role != 'student':
        return jsonify({'message':'unauthorized'}), 403
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
    # FIX: include exam details and check if results released and access window expired
    results_released = exam.results_released
    if access_end and now > access_end:
        # If access window expired, mark within_window as False and disallow start
        within_window = False
    # If results are released, disallow start
    if results_released:
        within_window = False
    return jsonify({
        'assigned': assigned,
        'within_window': within_window,
        'already_submitted': already_submitted,
        'duration_minutes': exam.duration_minutes,
        'exam': exam.to_dict()
    }), 200

@app.route('/student/exams/<int:exam_id>/start', methods=['POST'])
@token_required
def student_start_exam(current_user, exam_id):
    if current_user.role != 'student':
        return jsonify({'message':'unauthorized'}), 403
    student = Student.query.filter_by(user_id=current_user.id).first()
    exam = Exam.query.get_or_404(exam_id)
    if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first():
        return jsonify({'message':'not assigned to exam'}), 403
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    access_start = to_utc_naive(exam.access_start)
    access_end = to_utc_naive(exam.access_end)
    # Debug logging for time checks
    logger.info(f"Exam start check: now={now}, access_start={access_start}, access_end={access_end}")
    if access_start and now < access_start:
        logger.info("Exam not opened yet")
        return jsonify({'message':'exam not opened yet'}), 403
    if access_end and now > access_end:
        logger.info("Exam start window closed")
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
        return jsonify({'message':'started','attempt_id': attempt.id, 'start_time': attempt.start_time.isoformat(), 'expires_at': allowed_end.isoformat()}), 200
    else:
        # Attempt exists and not submitted, calculate allowed_end_time on the fly
        allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
        if exam.access_end:
            access_end_utc = to_utc_naive(exam.access_end)
            allowed_end = min(allowed_end, access_end_utc)
        return jsonify({'message':'exam already started', 'attempt_id': attempt.id, 'start_time': attempt.start_time.isoformat(), 'expires_at': allowed_end.isoformat()}), 200

@app.route('/student/exams/<int:exam_id>/questions', methods=['GET'])
@token_required
def student_get_exam_questions(current_user, exam_id):
    if current_user.role != 'student': return jsonify({'message':'unauthorized'}), 403
    student = Student.query.filter_by(user_id=current_user.id).first()
    exam = Exam.query.get_or_404(exam_id)
    if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first():
        return jsonify({'message':'not assigned to exam'}), 403
    questions = Question.query.filter_by(exam_id=exam.id).all()
    questions_data = []
    for q in questions:
        questions_data.append({
            'id': q.id,
            'text': q.text,
            'option_a': q.option_a,
            'option_b': q.option_b,
            'option_c': q.option_c,
            'option_d': q.option_d,
            'marks': q.marks,
            'image_path': q.image_path
        })
    return jsonify({'questions': questions_data}), 200

@app.route('/student/exams/<int:exam_id>/submit', methods=['POST'])
@token_required
def student_submit_exam(current_user, exam_id):
    if current_user.role != 'student':
        return jsonify({'message': 'unauthorized'}), 403

    # Get student profile
    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify({'message': 'student profile not found'}), 404

    # Get exam
    exam = Exam.query.get_or_404(exam_id)

    payload = request.get_json(silent=True) or {}
    answers = payload.get('answers', [])

    # Check attempt (use student.user_id, not student.id)
    attempt = StudentExamAttempt.query.filter_by(
        exam_id=exam.id, student_id=student.user_id
    ).first()

    if not attempt:
        return jsonify({'message': 'start the exam first'}), 400
    if attempt.submitted_time:
        return jsonify({'message': 'already submitted'}), 400

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)

    # Debug logging for time check
    logger.info(f"Submit exam time check: now={now}, attempt_start={attempt.start_time}, allowed_end={allowed_end}, time_diff={(allowed_end - now).total_seconds()} seconds")

    if now > allowed_end:
        return jsonify({'message': 'time is over'}), 403

    total_score = 0
    try:
        # Insert answers
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

        # Update attempt
        attempt.submitted_time = now
        attempt.score = total_score
        db.session.add(attempt)

        # Commit transaction
        db.session.commit()

        return jsonify({'message': 'submitted', 'score': total_score}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            'message': 'submission failed',
            'detail': str(e.__dict__.get("orig") or e)
        }), 500

@app.route('/student/exams/<int:exam_id>/result', methods=['GET'])
@token_required
def student_view_result(current_user, exam_id):
    if current_user.role != 'student': return jsonify({'message':'unauthorized'}), 403
    exam = Exam.query.get_or_404(exam_id)
    if not exam.results_released: return jsonify({'message':'results not released yet'}), 403
    student = Student.query.filter_by(user_id=current_user.id).first()
    attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
    if not attempt or not attempt.submitted_time: return jsonify({'message':'no attempt found'}), 400
    answers = []
    for a in attempt.answers:
        q = Question.query.get(a.question_id)
        answers.append({'question_id': q.id, 'text': q.text, 'answer': a.answer, 'is_correct': a.is_correct, 'marks_awarded': a.marks_awarded, 'marks': q.marks})
    return jsonify({'exam': exam.to_dict(), 'attempt': {'start_time': attempt.start_time.isoformat(), 'submitted_time': attempt.submitted_time.isoformat(), 'score': attempt.score}, 'answers': answers}), 200

# ----- Admin: Upload image -----
@app.route('/admin/upload/image', methods=['POST'])
@admin_required
def admin_upload_image(current_user):
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if file and allowed_file(file.filename, ALLOWED_IMG):
        saved_url = save_image_file(file)
        if saved_url:
            return jsonify({
                "message": "Image uploaded successfully",
                "url": saved_url
            }), 201
        else:
            return jsonify({"message": "Image upload to S3 failed"}), 500
    return jsonify({"message": "Invalid image type"}), 400

# ----- Admin: Export student attempts -----
@app.route('/admin/export_student_attempts', methods=['GET'])
@admin_required
def admin_export_student_attempts(current_user):
    try:
        exam_id = request.args.get('exam_id', type=int)
        logger.info(f"Export requested by admin {current_user.username} for exam_id: {exam_id}")
        output = export_student_attempts_to_excel(exam_id)
        filename = f'exam_{exam_id}_attempts.xlsx' if exam_id else 'all_student_attempts.xlsx'
        logger.info(f"Export completed successfully, filename: {filename}")
        return send_file(output, as_attachment=True, download_name=filename, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        import traceback
        logger.error(f"Export failed for exam_id {exam_id}: {str(e)}", exc_info=True)
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'message': 'Export failed', 'detail': str(e)}), 500

# ----- Run -----
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
