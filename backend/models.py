# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

# -------------------- USERS --------------------
class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)   # login
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(30), nullable=False)  # 'admin', 'student', 'school_admin', 'subject_specialist'

    email = db.Column(db.String(100), unique=True, nullable=True)
    mobile_number = db.Column(db.String(20), nullable=True)
    name = db.Column(db.String(100), nullable=True)

    # Optional: link school_admin to a school they own
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    specialist_subject = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        global bcrypt
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        global bcrypt
        return bcrypt.check_password_hash(self.password_hash, password)

# -------------------- SCHOOL --------------------
class School(db.Model):
    __tablename__ = 'schools'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # owner school admin (optional)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    students = db.relationship('Student', backref='school', lazy=True)
    exams = db.relationship('Exam', backref='school', lazy=True)
    # backref for user.school_id (school_admin)
    admins = db.relationship('User', foreign_keys='User.school_id', backref='owned_school', lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "code": self.code}

# -------------------- STUDENT --------------------
class Student(db.Model):
    __tablename__ = 'students'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), primary_key=True)
    user = db.relationship('User', backref=db.backref('student_profile', uselist=False))
    student_id = db.Column(db.String(120), unique=True, nullable=False)  # e.g., code-class-001
    name = db.Column(db.String(200), nullable=False)
    class_number = db.Column(db.String(50), nullable=True)
    number = db.Column(db.String(50), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def generate_student_id(self):
        sc = (self.school.code if self.school else None)
        if not sc:
            raise ValueError("school code required")
        num = f"{int(self.number):03d}"
        if self.class_number and str(self.class_number).strip() != "":
            self.student_id = f"{sc}-{self.class_number}-{num}"
        else:
            self.student_id = f"{sc}-{num}"

# -------------------- QUESTION REPOSITORY --------------------
class QuestionRepository(db.Model):
    """
    Global repository (or school-scope) to store reusable questions.
    Admin can create global (school_id=None). School admins can create school-specific (school_id=their school).
    """
    __tablename__ = 'question_repository'
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)  # null => global
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # taxonomies for filtering
    subject = db.Column(db.String(100), nullable=False)         # e.g., 'math', 'science'
    class_number = db.Column(db.String(50), nullable=True)      # e.g., '8', '9', '10'
    chapter = db.Column(db.String(100), nullable=True)
    topic = db.Column(db.String(150), nullable=True)
    difficulty = db.Column(db.String(20), nullable=True)        # 'easy','medium','hard','olympiad'

    # content
    text = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(10))
    image_path = db.Column(db.String(255))
    marks = db.Column(db.Integer, nullable=False, default=1)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # tracking edits
    last_edited_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    last_edited_at = db.Column(db.DateTime, nullable=True)

    # relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_repo_questions', lazy=True)
    editor = db.relationship('User', foreign_keys=[last_edited_by], backref='edited_repo_questions', lazy=True)

# models.py

class QuestionAuditLog(db.Model):
    __tablename__ = 'question_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False) # 'UPDATE', 'DELETE', 'CREATE'
    question_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True) # e.g. "Changed marks from 1 to 2"
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
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
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)  # null => global exam
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    results_released = db.Column(db.Boolean, default=False)

    questions = db.relationship('Question', backref='exam', lazy=True, cascade="all, delete-orphan")
    assigned = db.relationship('ExamStudent', backref='exam', lazy=True, cascade="all, delete-orphan")
    attempts = db.relationship('StudentExamAttempt', backref='exam', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "description": self.description,
            "access_start": self.access_start.isoformat() if self.access_start else None,
            "access_end": self.access_end.isoformat() if self.access_end else None,
            "duration_minutes": self.duration_minutes, "total_marks": self.total_marks,
            "school_id": self.school_id, "results_released": self.results_released
        }

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    
    # Local data columns (used if NOT linked to a repo question)
    text = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(50))
    image_path = db.Column(db.String(255))
    marks = db.Column(db.Integer, nullable=False, default=1)

    # Linkage for Live Sync
    repo_question_id = db.Column(db.Integer, db.ForeignKey('question_repository.id'), nullable=True)
    
    # Relationship to fetch the Master Question object
    repo = db.relationship('QuestionRepository', backref='linked_questions')

    @property
    def source(self):
        """
        MASTER SYNC LOGIC:
        If this question is linked to the Repository (repo_question_id is not None),
        we return the Repository object. Otherwise, we return 'self' (local data).
        """
        if self.repo_question_id and self.repo:
            return self.repo
        return self

    def to_dict(self):
        """
        This method automatically pulls data from the correct source.
        The frontend doesn't need to know if it's from Repo or Local.
        """
        src = self.source # Determine source (Repo or Self)
        
        return {
            'id': self.id,
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
