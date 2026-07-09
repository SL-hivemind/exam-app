# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime
from sqlalchemy import Integer, event
import re

db = SQLAlchemy()
bcrypt = Bcrypt()

# -------------------- UTILS: ID GENERATION --------------------

from sqlalchemy import func
import re

from sqlalchemy import func
import re

def generate_short_id(class_num, subject, chapter, exclude_id=None):
    """
    Generates a monotonic scoped ID.
    NEVER reuses numbers.
    """

    def abbreviate(text):
        if not text or str(text).strip() == "":
            return "GEN"
        clean = re.sub(
            r'\b(the|a|an|of|and|in|to|on|for|with)\b',
            '',
            str(text),
            flags=re.IGNORECASE
        )
        clean = re.sub(r'[^a-zA-Z0-9]', '', clean)
        return clean[:3].upper().ljust(3, 'X')

    c_code = str(class_num).zfill(2) if class_num else "00"
    s_code = abbreviate(subject)
    ch_code = abbreviate(chapter)

    prefix = f"{c_code}-{s_code}-{ch_code}-"

    # 🔑 CORRECT QUERY: USE custom_id PREFIX
    query = db.session.query(
        func.max(QuestionRepository.custom_id)
    ).filter(
        QuestionRepository.custom_id.like(f"{prefix}%")
    )

    if exclude_id:
        query = query.filter(QuestionRepository.id != exclude_id)

    last_id = query.scalar()

    last_num = int(last_id.split("-")[-1]) if last_id else 0
    new_serial = str(last_num + 1).zfill(4)

    return f"{prefix}{new_serial}"

# -------------------- USERS --------------------
class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(30), nullable=False)  # 'admin', 'student', 'school_admin', 'subject_specialist', 'public_user'

    email = db.Column(db.String(100), unique=True, nullable=True)
    mobile_number = db.Column(db.String(20), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)

    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    specialist_subject = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "email": self.email,
            "school_id": self.school_id,
            "specialist_subject": self.specialist_subject,
            "is_verified": self.is_verified
        }

# -------------------- SCHOOL --------------------
class School(db.Model):
    __tablename__ = 'schools'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    students = db.relationship('Student', backref='school', lazy=True)
    exams = db.relationship('Exam', backref='school', lazy=True)
    admins = db.relationship('User', foreign_keys='User.school_id', backref='owned_school', lazy=True)

    def to_dict(self):
        return {
            "id": self.id, 
            "name": self.name, 
            "code": self.code,
            "total_students": len(self.students)
        }

# -------------------- STUDENT --------------------
class Student(db.Model):
    __tablename__ = 'students'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), primary_key=True)
    user = db.relationship('User', backref=db.backref('student_profile', uselist=False))
    student_id = db.Column(db.String(120), unique=True, nullable=False)
    old_student_id = db.Column(db.String(120), nullable=True)
    class_number = db.Column(db.String(50), nullable=True)
    number = db.Column(db.String(50), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def generate_student_id_auto(self):
        if not self.school_id:
            raise ValueError("school id required")

        school = self.school if self.school else School.query.get(self.school_id)
        if not school or not school.code:
            raise ValueError("school code required")

        with db.session.no_autoflush:
            q = Student.query.filter_by(school_id=self.school_id)
            if self.user_id:
                q = q.filter(Student.user_id != self.user_id)

            seq = q.count() + 1
        seq5 = f"{seq:05d}"
        self.student_id = f"{school.code}-{seq5}"

    # Optional compatibility
        self.number = seq5

    @property
    def username(self):
        return self.user.username if self.user else None

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "student_id": self.student_id,
            "username": self.username,
            "class_number": self.class_number,
            "roll_number": self.number,
            "school_name": self.school.name if self.school else None,
            "email": self.user.email if self.user else None
        }

# -------------------- QUESTION REPOSITORY --------------------
class QuestionRepository(db.Model):
    __tablename__ = 'question_repository'
    id = db.Column(db.Integer, primary_key=True)
    custom_id = db.Column(db.String(50), unique=True, nullable=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    subject = db.Column(db.String(100), nullable=False)
    class_number = db.Column(db.String(50), nullable=True)
    chapter = db.Column(db.String(100), nullable=True)
    topic = db.Column(db.String(150), nullable=True)
    difficulty = db.Column(db.String(20), nullable=True)

    text = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(10))
    image_path = db.Column(db.String(255))
    marks = db.Column(db.Integer, nullable=False, default=1)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_edited_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    last_edited_at = db.Column(db.DateTime, nullable=True)

    creator = db.relationship('User', foreign_keys=[created_by], backref='created_repo_questions', lazy=True)
    editor = db.relationship('User', foreign_keys=[last_edited_by], backref='edited_repo_questions', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "custom_id": self.custom_id,
            "subject": self.subject,
            "class_number": self.class_number,
            "chapter": self.chapter,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "text": self.text,
            "option_a": self.option_a,
            "option_b": self.option_b,
            "option_c": self.option_c,
            "option_d": self.option_d,
            "correct_answer": self.correct_answer,
            "image_path": self.image_path,
            "marks": self.marks,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # 'QUESTION_EDIT', 'PASSWORD_RESET', 'REPORT_RESOLVED', etc.
    target_type = db.Column(db.String(50), nullable=True)  # 'question', 'user', 'report'
    target_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='audit_logs')

# Legacy alias so existing imports (QuestionAuditLog) keep working
QuestionAuditLog = AuditLog

class QuestionReport(db.Model):
    __tablename__ = 'question_reports'
    id = db.Column(db.Integer, primary_key=True)
    repo_question_id = db.Column(db.Integer, db.ForeignKey('question_repository.id', ondelete='CASCADE'), nullable=False)
    reported_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'resolved'
    resolved_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    question = db.relationship('QuestionRepository', backref='reports')
    reporter = db.relationship('User', foreign_keys=[reported_by])
    resolver = db.relationship('User', foreign_keys=[resolved_by])

# -------------------- EXAMS --------------------
class Exam(db.Model):
    __tablename__ = 'exams'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    description = db.Column(db.Text)
    access_start = db.Column(db.DateTime, nullable=True)
    access_end = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    total_marks = db.Column(db.Integer, nullable=False, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    results_released = db.Column(db.Boolean, default=False)

    questions = db.relationship('Question', backref='exam', lazy=True, cascade="all, delete-orphan")
    assigned = db.relationship('ExamStudent', backref='exam', lazy=True, cascade="all, delete-orphan")
    attempts = db.relationship('StudentExamAttempt', backref='exam', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, 
            "title": self.title, 
            "description": self.description,
            "access_start": self.access_start.isoformat() if self.access_start else None,
            "access_end": self.access_end.isoformat() if self.access_end else None,
            "duration_minutes": self.duration_minutes, 
            "total_marks": self.total_marks,
            "school_id": self.school_id, 
            "results_released": self.results_released,
            "school_name": self.school.name if self.school else "Global"
        }

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    
    text = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(50))
    image_path = db.Column(db.String(255))
    marks = db.Column(db.Integer, nullable=False, default=1)

    repo_question_id = db.Column(db.Integer, db.ForeignKey('question_repository.id'), nullable=True)
    repo = db.relationship('QuestionRepository', backref='linked_questions')

    @property
    def source(self):
        if self.repo_question_id and self.repo:
            return self.repo
        return self

    def to_dict(self):
        src = self.source
        return {
            'id': self.id,
            'custom_id': getattr(src, 'custom_id', None),
            'exam_id': self.exam_id,
            'text': src.text,
            'option_a': src.option_a,
            'option_b': src.option_b,
            'option_c': src.option_c,
            'option_d': src.option_d,
            'correct_answer': src.correct_answer,
            'marks': self.marks,
            'image_path': src.image_path if hasattr(src, 'image_path') else None,
            'repo_question_id': self.repo_question_id,
            'is_global': bool(self.repo_question_id)
        }

class ExamStudent(db.Model):
    __tablename__ = 'exam_students'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.user_id', ondelete='CASCADE'), nullable=False)
    __table_args__ = (db.UniqueConstraint('exam_id', 'student_id', name='uq_exam_student'),)

class StudentExamAttempt(db.Model):
    __tablename__ = 'student_exam_attempts'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.user_id', ondelete='CASCADE'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    submitted_time = db.Column(db.DateTime, nullable=True)
    score = db.Column(db.Integer, nullable=True)
    submission_reason = db.Column(db.String(50), nullable=True, default='manual')
    __table_args__ = (
        db.UniqueConstraint('exam_id', 'student_id', name='uq_exam_attempt'),
        # Peer-score/percentile queries filter on (exam_id, submitted_time).
        db.Index('ix_attempt_exam_submitted', 'exam_id', 'submitted_time'),
    )

class StudentAnswer(db.Model):
    __tablename__ = 'student_answers'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('student_exam_attempts.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    answer = db.Column(db.Text, nullable=True)
    is_correct = db.Column(db.Boolean, default=False)
    marks_awarded = db.Column(db.Integer, default=0)
    attempt = db.relationship('StudentExamAttempt', backref=db.backref('answers', lazy=True, cascade='all, delete-orphan'))
    __table_args__ = (
        # One answer row per question per attempt: speeds up the autosave/
        # submit upserts and prevents duplicate rows from racing requests.
        db.UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question'),
    )

# -------------------- OTP FOR PASSWORD RESET --------------------

class PasswordResetOTP(db.Model):
    __tablename__ = 'password_reset_otps'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    user = db.relationship('User', backref=db.backref('otps', lazy=True))

# -------------------- STUDENT REQUESTS --------------------

class StudentRequest(db.Model):
    __tablename__ = 'student_requests'
    id = db.Column(db.Integer, primary_key=True)
    student_user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    request_type = db.Column(db.String(30), nullable=False)  # 'password_reset' or 'profile_update'
    message = db.Column(db.Text, nullable=True)  # student's note
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    student = db.relationship('User', foreign_keys=[student_user_id], backref=db.backref('requests_made', lazy=True))
    resolver = db.relationship('User', foreign_keys=[resolved_by])

# ==================== PUBLIC PORTAL MODELS (B2C) ====================
# These tables are completely isolated from the School/Student/Exam B2B system.

# -------------------- PUBLIC USER --------------------
class PublicUser(db.Model):
    __tablename__ = 'public_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='public_user')
    is_verified = db.Column(db.Boolean, default=False)
    
    phone_number = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    daily_streak = db.Column(db.Integer, default=0)
    last_challenge_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'phone_number': self.phone_number,
            'address': self.address,
            'daily_streak': self.daily_streak or 0,
            'last_challenge_date': self.last_challenge_date.isoformat() if self.last_challenge_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------- PUBLIC COURSE --------------------
class PublicCourse(db.Model):
    __tablename__ = 'public_courses'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    description = db.Column(db.Text, nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    price = db.Column(db.Float, default=0.0)  # 0 = Free course
    status = db.Column(db.String(20), default='draft')  # 'draft', 'published'
    target_tags = db.Column(db.String(255), nullable=True)  # explicit tags to match against question repo (e.g. 'JEE,NEET')
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contents = db.relationship('CourseContent', backref='course', lazy=True, cascade='all, delete-orphan')
    subscriptions = db.relationship('CourseSubscription', backref='course', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'thumbnail_url': self.thumbnail_url,
            'price': self.price,
            'status': self.status,
            'target_tags': self.target_tags,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'content_count': len(self.contents) if self.contents else 0,
            'subscriber_count': len(self.subscriptions) if self.subscriptions else 0,
        }

# -------------------- COURSE CONTENT --------------------
class CourseContent(db.Model):
    __tablename__ = 'course_contents'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('public_courses.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(250), nullable=False)
    content_type = db.Column(db.String(30), nullable=False)  # 'pdf_exam', 'cbt_exam', 'pdf_material', 'video'
    file_url = db.Column(db.String(500), nullable=True)
    is_free = db.Column(db.Boolean, default=False)
    order_index = db.Column(db.Integer, default=0)
    total_questions = db.Column(db.Integer, nullable=True)  # For exam PDFs/CBTs
    answer_key_json = db.Column(db.Text, nullable=True)  # JSON: {"1":"A","2":"C",...}
    duration_minutes = db.Column(db.Integer, nullable=True, default=60)
    status = db.Column(db.String(20), default='published')  # 'draft' or 'published'
    subject = db.Column(db.String(100), nullable=True)
    is_previous_paper = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, include_answers=False):
        d = {
            'id': self.id,
            'course_id': self.course_id,
            'title': self.title,
            'content_type': self.content_type,
            'file_url': self.file_url,
            'is_free': self.is_free,
            'order_index': self.order_index,
            'total_questions': self.total_questions,
            'duration_minutes': self.duration_minutes,
            'status': self.status,
            'subject': self.subject,
            'is_previous_paper': self.is_previous_paper,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_answers:
            d['answer_key_json'] = self.answer_key_json
        return d

# -------------------- PUBLIC QUESTION (CBT) --------------------
class PublicQuestion(db.Model):
    __tablename__ = 'public_questions'
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('course_contents.id', ondelete='CASCADE'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    options_json = db.Column(db.Text, nullable=False)  # JSON: {"A":"opt1", "B":"opt2", "C":"opt3", "D":"opt4"}
    correct_option = db.Column(db.String(10), nullable=False)  # 'A', 'B', 'C', 'D'
    explanation = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, default=1)

    content = db.relationship('CourseContent', backref=db.backref('questions', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self, include_answer=False):
        d = {
            'id': self.id,
            'content_id': self.content_id,
            'question_text': self.question_text,
            'options_json': self.options_json,
            'order_index': self.order_index,
        }
        if include_answer:
            d['correct_option'] = self.correct_option
            d['explanation'] = self.explanation
        return d

# -------------------- COURSE SUBSCRIPTION --------------------
class CourseSubscription(db.Model):
    __tablename__ = 'course_subscriptions'
    id = db.Column(db.Integer, primary_key=True)
    public_user_id = db.Column(db.Integer, db.ForeignKey('public_users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('public_courses.id', ondelete='CASCADE'), nullable=False)
    razorpay_order_id = db.Column(db.String(100), nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default='active')  # 'active', 'expired', 'pending'
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('PublicUser', backref=db.backref('subscriptions', lazy=True, cascade='all, delete-orphan'))
    __table_args__ = (db.UniqueConstraint('public_user_id', 'course_id', name='uq_publicuser_course'),)

    def to_dict(self):
        return {
            'id': self.id,
            'public_user_id': self.public_user_id,
            'course_id': self.course_id,
            'course_title': self.course.title if self.course else None,
            'razorpay_payment_id': self.razorpay_payment_id,
            'status': self.status,
            'enrolled_at': self.enrolled_at.isoformat() if self.enrolled_at else None,
        }

# -------------------- PUBLIC EXAM ATTEMPT --------------------
class PublicExamAttempt(db.Model):
    __tablename__ = 'public_exam_attempts'
    id = db.Column(db.Integer, primary_key=True)
    public_user_id = db.Column(db.Integer, db.ForeignKey('public_users.id', ondelete='CASCADE'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('course_contents.id', ondelete='CASCADE'), nullable=False)
    answers_json = db.Column(db.Text, nullable=True)  # JSON: {"1":"B","2":"A",...}
    score = db.Column(db.Integer, nullable=True)
    total_questions = db.Column(db.Integer, nullable=True)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('PublicUser', backref=db.backref('exam_attempts', lazy=True, cascade='all, delete-orphan'))
    content = db.relationship('CourseContent', backref=db.backref('attempts', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'content_id': self.content_id,
            'content_title': self.content.title if self.content else None,
            'score': self.score,
            'total_questions': self.total_questions,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
        }

# -------------------- EMAIL VERIFICATION OTP --------------------
class EmailVerificationOTP(db.Model):
    __tablename__ = 'email_verification_otps'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(30), default='registration')  # 'registration', 'forgot_password'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

# -------------------- MODULE 3: QUICK EXAM (Zero-Auth) --------------------

class QuickExam(db.Model):
    __tablename__ = 'quick_exams'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False, index=True)
    title = db.Column(db.String(250), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    duration_minutes = db.Column(db.Integer, default=30)
    total_questions = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship('QuickQuestion', backref='exam', cascade='all, delete-orphan', lazy='dynamic')
    responses = db.relationship('QuickResponse', backref='exam', cascade='all, delete-orphan', lazy='dynamic')

    def is_expired(self):
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

    def to_dict(self, include_stats=False):
        d = {
            'id': self.id,
            'code': self.code,
            'title': self.title,
            'duration_minutes': self.duration_minutes,
            'total_questions': self.total_questions,
            'is_active': self.is_active,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_expired': self.is_expired(),
        }
        if include_stats:
            d['response_count'] = self.responses.count()
        return d


class QuickQuestion(db.Model):
    __tablename__ = 'quick_questions'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('quick_exams.id', ondelete='CASCADE'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    options_json = db.Column(db.Text, nullable=False)
    correct_option = db.Column(db.String(5), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, default=1)

    def to_dict(self, include_answer=True):
        d = {
            'id': self.id,
            'order_index': self.order_index,
            'question_text': self.question_text,
            'options_json': self.options_json,
        }
        if include_answer:
            d['correct_option'] = self.correct_option
            d['explanation'] = self.explanation
        return d


class QuickResponse(db.Model):
    __tablename__ = 'quick_responses'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('quick_exams.id', ondelete='CASCADE'), nullable=False)
    participant_name = db.Column(db.String(100), nullable=False)
    answers_json = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, default=0)
    total = db.Column(db.Integer, default=0)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'participant_name': self.participant_name,
            'score': self.score,
            'total': self.total,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'answers_json': self.answers_json,
        }

# ==================== B2C PUBLIC QUESTION REPOSITORY (Isolated) ====================
# These are completely separate from the B2B school QuestionRepository.

# -------------------- PUBLIC QUESTION REPOSITORY --------------------
class PublicQuestionRepo(db.Model):
    """Centralized question bank for B2C competitive exams (NEET, Banking, SSC, etc.)."""
    __tablename__ = 'public_question_repository'
    id = db.Column(db.Integer, primary_key=True)
    custom_id = db.Column(db.String(50), unique=True, nullable=True)
    course_tags = db.Column(db.String(255), nullable=True)          # e.g. 'NEET,JEE' or 'BANKING,SSC'
    subject = db.Column(db.String(100), nullable=False)             # e.g. 'Physics', 'Quantitative Aptitude'
    chapter = db.Column(db.String(100), nullable=True)              # e.g. 'Kinematics', 'Time & Work'
    topic = db.Column(db.String(150), nullable=True)                # e.g. 'Projectile Motion'
    difficulty = db.Column(db.String(20), default='Medium')         # 'Easy', 'Medium', 'Hard'
    # 'mcq' | 'assertion_reason' | 'match' | 'statement' — competitive-exam formats
    question_format = db.Column(db.String(30), default='mcq')
    is_pyq = db.Column(db.Boolean, default=False)
    pyq_year = db.Column(db.Integer, nullable=True)
    text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(10), nullable=False)       # 'A', 'B', 'C', 'D'
    explanation = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    marks = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, include_answer=False):
        d = {
            'id': self.id,
            'custom_id': self.custom_id,
            'course_tags': self.course_tags,
            'subject': self.subject,
            'chapter': self.chapter,
            'topic': self.topic,
            'difficulty': self.difficulty,
            'question_format': self.question_format or 'mcq',
            'is_pyq': self.is_pyq,
            'pyq_year': self.pyq_year,
            'text': self.text,
            'option_a': self.option_a,
            'option_b': self.option_b,
            'option_c': self.option_c,
            'option_d': self.option_d,
            'marks': self.marks,
            'image_path': self.image_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_answer:
            d['correct_answer'] = self.correct_answer
            d['explanation'] = self.explanation
        return d

# -------------------- PUBLIC COURSE ↔ REPO JOIN TABLE --------------------

class PublicPendingImageQuestion(db.Model):
    __tablename__ = 'public_pending_image_questions'
    id = db.Column(db.Integer, primary_key=True)
    custom_id = db.Column(db.String(50), unique=True, nullable=True)
    course_tags = db.Column(db.String(255), nullable=True)
    subject = db.Column(db.String(100), nullable=False)
    chapter = db.Column(db.String(100), nullable=True)
    topic = db.Column(db.String(150), nullable=True)
    difficulty = db.Column(db.String(20), default='Medium')
    is_pyq = db.Column(db.Boolean, default=False)
    pyq_year = db.Column(db.Integer, nullable=True)
    text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(10), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    marks = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PublicCourseContentQuestion(db.Model):
    """Links a CourseContent (mock test) to questions from the central repository."""
    __tablename__ = 'public_course_content_questions'
    content_id = db.Column(db.Integer, db.ForeignKey('course_contents.id', ondelete='CASCADE'), primary_key=True)
    public_q_id = db.Column(db.Integer, db.ForeignKey('public_question_repository.id', ondelete='CASCADE'), primary_key=True)
    order_index = db.Column(db.Integer, default=1)

    content = db.relationship('CourseContent', backref=db.backref('repo_question_links', lazy=True))
    question = db.relationship('PublicQuestionRepo', backref=db.backref('content_links', lazy=True))

# -------------------- PUBLIC PRACTICE ATTEMPT --------------------
class PublicPracticeAttempt(db.Model):
    """Tracks dynamic practice sessions pulled from the central repository."""
    __tablename__ = 'public_practice_attempts'
    id = db.Column(db.Integer, primary_key=True)
    public_user_id = db.Column(db.Integer, db.ForeignKey('public_users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('public_courses.id', ondelete='CASCADE'), nullable=False)
    subject = db.Column(db.String(100), nullable=True)
    chapter = db.Column(db.String(100), nullable=True)
    difficulty = db.Column(db.String(20), default='Random')
    questions_json = db.Column(db.Text, nullable=False)  # JSON list of PublicQuestionRepo IDs
    answers_json = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, nullable=True)
    total_questions = db.Column(db.Integer, default=30)
    is_adaptive = db.Column(db.Boolean, default=False)
    current_index = db.Column(db.Integer, default=0)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('PublicUser', backref=db.backref('practice_attempts', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'subject': self.subject,
            'chapter': self.chapter,
            'difficulty': self.difficulty,
            'score': self.score,
            'total_questions': self.total_questions,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
        }

# -------------------- PUBLIC DAILY CHALLENGE ATTEMPT --------------------
class PublicDailyChallengeAttempt(db.Model):
    """Tracks daily 5-question challenge attempts for streak tracking."""
    __tablename__ = 'public_daily_challenge_attempts'
    id = db.Column(db.Integer, primary_key=True)
    public_user_id = db.Column(db.Integer, db.ForeignKey('public_users.id', ondelete='CASCADE'), nullable=False)
    challenge_date = db.Column(db.Date, nullable=False)
    questions_json = db.Column(db.Text, nullable=False)  # JSON list of PublicQuestionRepo IDs
    answers_json = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('PublicUser', backref=db.backref('daily_challenges', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'challenge_date': self.challenge_date.isoformat() if self.challenge_date else None,
            'score': self.score,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }

# -------------------- EVENT LISTENERS --------------------


@event.listens_for(QuestionRepository, 'before_insert')
def auto_gen_id(mapper, connection, target):
    """Triggers on first save (CSV upload or UI creation)"""
    if target.custom_id:
        return
    target.custom_id = generate_short_id(target.class_number, target.subject, target.chapter)

@event.listens_for(QuestionRepository, 'before_update')
def update_id_on_scope_change(mapper, connection, target):
    # Skip if the bulk update route has already computed a batch-safe ID
    if getattr(target, '_bulk_id_set', False):
        return

    state = db.inspect(target)

    scope_changed = (
        state.attrs.chapter.history.has_changes() or
        state.attrs.subject.history.has_changes() or
        state.attrs.class_number.history.has_changes()
    )

    if scope_changed:
        target.custom_id = generate_short_id(
            target.class_number,
            target.subject,
            target.chapter,
            exclude_id=target.id
        )
