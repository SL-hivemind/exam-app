import os
import csv
import secrets
import boto3
import re
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from models import db, School, User, Student, Question, Exam, StudentExamAttempt, QuestionRepository
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from models import db, QuestionRepository, generate_short_id

files_bp = Blueprint("files", __name__)

S3_BUCKET = os.getenv('S3_BUCKET_NAME')
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION')

s3 = boto3.client('s3', region_name=AWS_REGION)


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
    """Save uploaded image to S3 and return the public URL."""
    if not S3_BUCKET:
        print("Error: S3_BUCKET_NAME environment variable not set.")
        return None

    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit(".", 1)[1].lower()
    # FIX: Add "images/" prefix for better organization
    unique_filename = f"images/{prefix}_{secrets.token_hex(10)}.{ext}"

    try:
        s3.upload_fileobj(
            file_storage,
            S3_BUCKET,
            unique_filename,
            ExtraArgs={"ContentType": file_storage.content_type}
            )
        url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
        return url
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        return None


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
       saved_url = save_image_file(file)
       if saved_url:
            return jsonify({
                "message": "Image uploaded successfully",
                "url": saved_url 
            }), 201
       else:
            return jsonify({"message": "Image upload to S3 failed"}), 500
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

def import_students_csv(path, fix_existing=False):
    """
    Import students from CSV.
    - Does NOT modify existing student_id
    - Auto-generates student_id ONLY for new students
    """

    created = []

    # -------------------------------
    # OPTIONAL: Fix existing students
    # -------------------------------
    if fix_existing:
        students = Student.query.filter(
            (Student.student_id == None) | (Student.school_id == None)
        ).all()

        for s in students:
            if not s.school_id and s.student_id:
                school_code = s.student_id.split("-")[0]
                school = School.query.filter_by(code=school_code).first()
                if school:
                    s.school_id = school.id
                    s.school = school

            if not s.student_id:
                if not s.school and s.school_id:
                    s.school = School.query.get(s.school_id)
                s.generate_student_id()

            user = User.query.get(s.user_id)
            if user and user.username != s.student_id:
                user.username = s.student_id

            created.append({
                "user_id": s.user_id,
                "student_id": s.student_id,
                "fixed": True
            })

        db.session.commit()

    # -------------------------------
    # NEW STUDENT CSV IMPORT
    # -------------------------------
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)

        required = {"name", "school_code"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("CSV must contain: name, school_code")

        for row in reader:
            name = (row.get("name") or "").strip()
            school_code = (row.get("school_code") or "").strip()
            class_number = row.get("class_number") or row.get("class")
            email = row.get("email") or None
            password = row.get("password") or None
            number = str(row.get("number") or "").strip()
            username = (row.get("username") or "").strip()

            if not name or not school_code:
                continue

            school = School.query.filter_by(code=school_code).first()
            if not school:
                raise ValueError(f"School not found: {school_code}")

            # -------------------------------
            # Create USER (TEMP)
            # -------------------------------
            temp_password = password or secrets.token_hex(6)

            user = User(
                username="__tmp__",
                role="student",
                email=email
            )
            user.set_password(temp_password)
            db.session.add(user)
            db.session.flush()

            # -------------------------------
            # Create STUDENT
            # -------------------------------
            student = Student(
                user_id=user.id,
                name=name,
                class_number=class_number,
                number=number or None,
                school_id=school.id
            )
            student.school = school

            # Auto-generate ONLY if missing
            if not username:
                student.generate_student_id_auto()
            else:
                student.student_id = username

            db.session.add(student)
            db.session.flush()

            # Sync username
            user.username = student.student_id
            db.session.add(user)

            created.append({
                "student_id": student.student_id,
                "user_id": user.id,
                "password": temp_password if not password else password
            })

    db.session.commit()
    return created


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
    from io import BytesIO
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment
    from sqlalchemy import desc

    logger = logging.getLogger(__name__)

    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Student Exam Attempts"

        headers = [
            "Rank", "Student ID", "Student Name", "School",
            "Exam Title", "Score", "Percentage", "Status"
        ]
        ws.append(headers)

        # Style headers
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center")

        logger.info(f"Starting export for exam_id: {exam_id}")

        if exam_id:
            attempts = (
                StudentExamAttempt.query
                .filter_by(exam_id=exam_id)
                .order_by(desc(StudentExamAttempt.score))
                .all()
            )
        else:
            attempts = (
                StudentExamAttempt.query
                .order_by(desc(StudentExamAttempt.score))
                .all()
            )

        logger.info(f"Found {len(attempts)} attempts to export")

        # ✅ Loop MUST be inside try
        for idx, attempt in enumerate(attempts, start=1):
            try:
                student = Student.query.filter_by(
                    user_id=attempt.student_id
                ).first()

                exam = Exam.query.get(attempt.exam_id)

                score = attempt.score or 0
                total = exam.total_marks if exam and exam.total_marks > 0 else 1
                percentage = f"{(score / total) * 100:.2f}%"

                row = [
                    idx,  # Rank
                    student.student_id if student else "N/A",
                    student.name if student else "N/A",
                    student.school.name if student and student.school else "N/A",
                    exam.title if exam else "N/A",
                    score,
                    percentage,
                    "Completed" if attempt.submitted_time else "Discontinued"
                ]

                ws.append(row)

            except Exception as e:
                logger.error(
                    f"Error processing attempt {attempt.id}: {str(e)}",
                    exc_info=True
                )
                continue  # safely skip this attempt

        # Auto-adjust column widths
        for col in ws.columns:
            max_length = 0
            column_letter = col[0].column_letter
            for cell in col:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
            ws.column_dimensions[column_letter].width = max_length + 2

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        logger.info("Export completed successfully")
        return output

    except Exception as e:
        logger.error(
            f"Error in export_student_attempts_to_excel: {str(e)}",
            exc_info=True
        )
        raise

def abbrev(text):
    if not text:
        return "GEN"
    clean = re.sub(r'\b(the|a|an|of|and|in|to|on|for|with)\b', '', str(text), flags=re.IGNORECASE)
    clean = re.sub(r'[^a-zA-Z0-9]', '', clean)
    return clean[:3].upper().ljust(3, 'X')


def get_last_serial(class_number, subject, chapter):
    """
    Fetch last used serial for (class, subject, chapter) ONCE.
    Bulk-safe.
    """
    prefix = f"{str(class_number).zfill(2)}-{abbrev(subject)}-{abbrev(chapter)}-"

    last = (
        db.session.query(QuestionRepository.custom_id)
        .filter(QuestionRepository.custom_id.like(f"{prefix}%"))
        .order_by(QuestionRepository.custom_id.desc())
        .first()
    )

    if not last:
        return 0

    return int(last[0].split("-")[-1])


def _norm_key_part(value, fallback=None, lower=False):
    if value is None:
        value = fallback
    value = (value or "").strip()
    if not value and fallback is not None:
        value = str(fallback).strip()
    if lower:
        value = value.lower()
    return value


def import_repository_csv(path, current_user_id):
    count = 0
    skipped = 0
    seen_rows = set()

    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        reader.fieldnames = [h.strip().lower() if h else '' for h in reader.fieldnames]

        for row in reader:
            raw_text = (row.get("text") or "").strip()
            text_key = _norm_key_part(raw_text, lower=True)
            if not text_key:
                continue

            class_number = _norm_key_part(row.get("class") or row.get("class_number"))
            subject_key = _norm_key_part(row.get("subject"), lower=True)
            chapter_key = _norm_key_part(row.get("chapter"), fallback="GEN", lower=True)
            image_url = row.get("image") or row.get("image_path") or row.get("image_url")
            duplicate_key = (text_key, class_number, subject_key, chapter_key)

            if duplicate_key in seen_rows:
                skipped += 1
                continue

            # 🔒 CRITICAL: prevent premature autoflush
            with db.session.no_autoflush:

                # ✅ DUPLICATE GUARD (text-based)
                exists = (
                    QuestionRepository.query
                    .filter(func.lower(func.trim(QuestionRepository.text)) == text_key)
                    .filter(func.trim(QuestionRepository.class_number) == class_number)
                    .filter(func.lower(func.trim(QuestionRepository.subject)) == subject_key)
                    .filter(func.lower(func.trim(QuestionRepository.chapter)) == chapter_key)
                    .first()
                )

                if exists:
                    skipped += 1
                    continue

                q = QuestionRepository(
                    text=raw_text,
                    option_a=row.get("option_a"),
                    option_b=row.get("option_b"),
                    option_c=row.get("option_c"),
                    option_d=row.get("option_d"),
                    correct_answer=row.get("correct_answer"),
                    marks=int(row.get("marks") or 1),
                    subject=(row.get("subject") or "").strip(),
                    class_number=class_number,
                    chapter=(row.get("chapter") or "GEN").strip() or "GEN",
                    topic=row.get("topic"),
                    image_path=image_url,
                    created_by=current_user_id
                )

                # ✅ SAFE ID generation (monotonic)
                q.custom_id = generate_short_id(
                    q.class_number,
                    q.subject,
                    q.chapter
                )

                db.session.add(q)
                db.session.flush()   # now safe
                seen_rows.add(duplicate_key)

                count += 1

    return {
        "inserted": count,
        "skipped": skipped
    }

