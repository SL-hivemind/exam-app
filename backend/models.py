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
    role = db.Column(db.String(30), nullable=False)  # 'admin', 'student', 'school_admin', 'subject_specialist'

    email = db.Column(db.String(100), unique=True, nullable=True)
    mobile_number = db.Column(db.String(20), nullable=True)

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
            "name": self.username,
            "school_id": self.school_id,
            "specialist_subject": self.specialist_subject
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
        if not self.school or not self.school.code:
            raise ValueError("school code required")

        q = Student.query.filter_by(school_id=self.school_id)

        seq = q.count() + 1
        seq5 = f"{seq:05d}"
        self.student_id = f"{self.school.code}-{seq5}"

    # Optional compatibility
        self.number = seq5

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "student_id": self.student_id,
            "name": self.user.username if self.user else None,
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

class QuestionAuditLog(db.Model):
    __tablename__ = 'question_audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False) # 'UPDATE', 'DELETE', 'CREATE'
    question_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='audit_logs')

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
            'marks': src.marks,
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
    __table_args__ = (db.UniqueConstraint('exam_id', 'student_id', name='uq_exam_attempt'),)

class StudentAnswer(db.Model):
    __tablename__ = 'student_answers'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('student_exam_attempts.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    answer = db.Column(db.Text, nullable=True)
    is_correct = db.Column(db.Boolean, default=False)
    marks_awarded = db.Column(db.Integer, default=0)
    attempt = db.relationship('StudentExamAttempt', backref=db.backref('answers', lazy=True))

# -------------------- EVENT LISTENERS --------------------

@event.listens_for(QuestionRepository, 'before_insert')
def auto_gen_id(mapper, connection, target):
    """Triggers on first save (CSV upload or UI creation)"""
    target.custom_id = generate_short_id(target.class_number, target.subject, target.chapter)

@event.listens_for(QuestionRepository, 'before_update')
def update_id_on_scope_change(mapper, connection, target):
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
            exclude_id=target.id   # 🔑 THIS LINE FIXES YOUR ERROR
        )
