import os
import csv
import secrets
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from models import db, School, User, Student, Question, Exam, StudentExamAttempt
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

files_bp = Blueprint("files", __name__)


# Directories for uploads
BASE_UPLOAD = os.path.join(os.getcwd(), "uploads")
IMAGES_DIR = os.path.join(BASE_UPLOAD, "images")
CSV_DIR = os.path.join(BASE_UPLOAD, "csv")
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(CSV_DIR, exist_ok=True)

ALLOWED_IMG = {"png", "jpg", "jpeg", "webp"}
ALLOWED_CSV = {"csv"}


def allowed_file(filename, allowed_set):
    """Check if the uploaded file is allowed"""
    return filename and "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_set


def save_image_file(file_storage, prefix="img"):
    """Save uploaded image to uploads/images and return the saved filename."""
    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit(".", 1)[1].lower()
    name = f"{prefix}_{secrets.token_hex(8)}.{ext}"
    path = os.path.join(IMAGES_DIR, name)
    file_storage.save(path)
    return name


def save_csv_file(file_storage):
    """Save uploaded CSV to uploads/csv and return the saved path."""
    filename = secure_filename(file_storage.filename)
    path = os.path.join(CSV_DIR, f"{secrets.token_hex(6)}_{filename}")
    file_storage.save(path)
    return path

    # ---------------- IMAGE UPLOAD ROUTE ---------------- #
@files_bp.route("/upload/image", methods=["POST"])
def upload_image():
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if file and allowed_file(file.filename, ALLOWED_IMG):
        saved_name = save_image_file(file)
        return jsonify({
            "message": "Image uploaded successfully",
            "filename": saved_name,
            "url": f"/uploads/images/{saved_name}"
        }), 201
    return jsonify({"message": "Invalid image type"}), 400


# ---------------- CSV UPLOAD ROUTE ---------------- #
@files_bp.route("/upload/csv", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if file and allowed_file(file.filename, ALLOWED_CSV):
        saved_path = save_csv_file(file)
        return jsonify({
            "message": "CSV uploaded successfully",
            "path": saved_path
        }), 201
    return jsonify({"message": "Invalid CSV file"}), 400

# ---------------- UPLOAD QUESTIONS CSV TO EXAM ---------------- #
@files_bp.route("/exam/<int:exam_id>/upload_questions", methods=["POST"])
def upload_questions_csv(exam_id):
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if file and allowed_file(file.filename, ALLOWED_CSV):
        saved_path = save_csv_file(file)
        try:
            count = import_questions_csv(saved_path, exam_id)
            db.session.commit()
            return jsonify({
                "message": f"{count} questions imported successfully into exam {exam_id}"
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    return jsonify({"message": "Invalid CSV file"}), 400


# ---------------- UPLOAD EXAM IMAGE ---------------- #
@files_bp.route("/exam/<int:exam_id>/upload_image", methods=["POST"])
def upload_exam_image(exam_id):
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if file and allowed_file(file.filename, ALLOWED_IMG):
        saved_name = save_image_file(file, prefix=f"exam{exam_id}")
        try:
            exam = exam.query.get(exam_id)
            if not exam:
                return jsonify({"message": "Exam not found"}), 404

            exam.image_path = saved_name
            db.session.commit()
            return jsonify({
                "message": "Exam image uploaded successfully",
                "filename": saved_name,
                "url": f"/uploads/images/{saved_name}"
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    return jsonify({"message": "Invalid image type"}), 400


# ---------------- STUDENT CSV IMPORT ---------------- #


def import_students_csv(path, fix_existing=False, has_header=True):
    """
    Import or fix student data from CSV.

    CSV columns expected:
      - username (optional) -> pre-generated student ID
      - number (required)
      - name (required)
      - school_code (required)
      - class_number / class (optional)
      - email (optional)
      - password (optional)

    fix_existing: if True, will attempt to fix existing students with NULL student_id or school_id.

    Returns list of created or updated student dicts.
    """
    created_or_fixed = []

    # Fix existing students first if flag is set
    if fix_existing:
        students = Student.query.filter((Student.student_id == None) | (Student.school_id == None)).all()
        for s in students:
            # Try to find school by username prefix
            if not s.school_id and s.student_id:
                school_code = s.student_id.split('-')[0]
                school = School.query.filter_by(code=school_code).first()
                if school:
                    s.school_id = school.id
                    s.school = school

            # Generate student_id if missing
            if not s.student_id:
                s.generate_student_id()

            # Update username in User table
            user = User.query.get(s.user_id)
            if user and user.username != s.student_id:
                user.username = s.student_id

            created_or_fixed.append({
                "user_id": s.user_id,
                "student_id": s.student_id,
                "fixed": True
            })
        db.session.commit()

    # Now handle new CSV import
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        fieldnames = set(reader.fieldnames or [])

        required = {'name', 'school_code'}
        if not required.issubset(fieldnames):
            raise ValueError(f"CSV must contain headers: {required}")
        if 'number' not in fieldnames and 'username' not in fieldnames:
            raise ValueError("CSV must contain either 'number' or 'username' header")

        for row in reader:
            name = row.get('name', '').strip()
            school_code = (row.get("school_code") or row.get("code") or "").strip()
            number = str(row.get('number') or '').strip()
            username = row.get('username', '').strip() if 'username' in row else None
            class_ = row.get('class_number') or row.get('class')
            email = row.get('email') or None
            password = row.get('password') or None

            if not number and not username:
                raise ValueError(f"Student number or username required for: {name}")

            school = School.query.filter_by(code=school_code).first()
            if not school:
                raise ValueError(f"school_code not found: {school_code}")

            # Create User
            temp_pw = password or secrets.token_hex(6)
            user = User(username="__tmp__", password_hash="__tmp__", role='student', email=email)
            user.set_password(temp_pw)
            db.session.add(user)
            try:
                db.session.flush()  # ensures user.id exists
            except IntegrityError as e:
                db.session.rollback()
                raise ValueError(f"Duplicate user or student detected for student: {name}, error: {str(e)}")

            # Create Student with school_id
            student = Student(
                user_id=user.id,
                name=name,
                class_number=class_,
                number=number,
                school_id=school.id
            )

            # Explicitly load school relationship before generating student_id
            student.school = school
            # Generate student_id based on school.code
            student.generate_student_id()
            db.session.add(student)
            try:
                db.session.flush()  # ensures student.student_id is in DB
            except IntegrityError as e:
                db.session.rollback()
                raise ValueError(f"Duplicate student_id detected for student: {name}, error: {str(e)}")

            # Update username to match student_id
            user.username = student.student_id
            db.session.add(user)

            created_or_fixed.append({
                "student_id": student.student_id,
                "user_id": user.id,
                "password": temp_pw if not password else password
            })

    db.session.commit()
    return created_or_fixed


def fix_existing_students():
    created_or_fixed = []

    students = Student.query.filter((Student.student_id==None) | (Student.school_id==None)).all()
    for s in students:
        if not s.school_id and s.student_id:
            school_code = s.student_id.split('-')[0]
            school = School.query.filter_by(code=school_code).first()
            if school:
                s.school_id = school.id
                s.school = school

        if not s.student_id:
            # Load school if school_id is set
            if s.school_id and not s.school:
                s.school = School.query.get(s.school_id)
            s.generate_student_id()

        user = User.query.get(s.user_id)
        if user and user.username != s.student_id:
            user.username = s.student_id

        created_or_fixed.append({
            "user_id": s.user_id,
            "student_id": s.student_id,
            "fixed": True
        })
    db.session.commit()
    return created_or_fixed


def import_questions_csv(path, exam_id, uploaded_images_map=None):
    """
    Import questions from CSV for a specific exam.
    Supports optional image column.
    uploaded_images_map: dict mapping original filename -> saved filename
    Returns number of inserted questions.
    """
    count = 0
    uploaded_images_map = uploaded_images_map or {}
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            text = row.get('text', '')
            option_a = row.get('option_a')
            option_b = row.get('option_b')
            option_c = row.get('option_c')
            option_d = row.get('option_d')
            correct = row.get('correct_answer')
            marks = int(row.get('marks') or 1)
            imgfn = row.get('image_filename')
            image_path = uploaded_images_map.get(imgfn) if imgfn else None

            q = Question(
                exam_id=exam_id, text=text,
                option_a=option_a, option_b=option_b, option_c=option_c, option_d=option_d,
                correct_answer=correct, marks=marks,
                image_path=image_path
            )
            db.session.add(q)
            count += 1
    return count

def export_student_attempts_to_excel(exam_id=None):
    """
    Export student exam attempts to an Excel workbook.
    If exam_id is provided, export only attempts for that exam.
    Returns the BytesIO stream.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        from io import BytesIO
        wb = Workbook()
        ws = wb.active
        ws.title = "Student Exam Attempts"

        headers = ["Student ID", "Student Name", "School", "Exam Title", "Start Time", "Submitted Time", "Score", "Status"]
        ws.append(headers)

        # Style headers
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center")

        # Query attempts - use simpler query to avoid join issues
        logger.info(f"Starting export for exam_id: {exam_id}")
        if exam_id:
            attempts = StudentExamAttempt.query.filter_by(exam_id=exam_id).all()
        else:
            attempts = StudentExamAttempt.query.all()

        logger.info(f"Found {len(attempts)} attempts to export")

        for attempt in attempts:
            try:
                # Fetch student and exam separately
                student = Student.query.filter_by(user_id=attempt.student_id).first()
                exam = Exam.query.get(attempt.exam_id)

                # Get school name safely
                school_name = "N/A"
                if student and student.school:
                    school_name = student.school.name
                elif student and student.school_id:
                    school = School.query.get(student.school_id)
                    if school:
                        school_name = school.name

                student_name = student.name if student else "N/A"
                student_id = student.student_id if student else f"User_{attempt.student_id}"
                exam_title = exam.title if exam else f"Exam_{attempt.exam_id}"

                start_time = attempt.start_time.isoformat() if attempt.start_time else ""
                submitted_time = attempt.submitted_time.isoformat() if attempt.submitted_time else ""
                score = attempt.score if attempt.score is not None else ""
                status = "Completed" if attempt.submitted_time else "In Progress"

                row = [student_id, student_name, school_name, exam_title, start_time, submitted_time, score, status]
                ws.append(row)
            except Exception as e:
                logger.error(f"Error processing attempt {attempt.id}: {str(e)}", exc_info=True)
                continue

        # Auto-adjust column widths
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = (max_length + 2)
            ws.column_dimensions[column].width = adjusted_width

        # Save to a BytesIO stream and return
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        logger.info("Export completed successfully")
        return output

    except Exception as e:
        logger.error(f"Error in export_student_attempts_to_excel: {str(e)}", exc_info=True)
        raise
