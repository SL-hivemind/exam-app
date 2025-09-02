from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()


class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)  # student_id OR admin username
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin' or 'student'

    # Optional fields
    email = db.Column(db.String(100), unique=True, nullable=True)   # only useful for admin
    student_id = db.Column(db.String(20), unique=True, nullable=True)  # store separately for clarity
    name = db.Column(db.String(100), nullable=True)

    def set_password(self, password):
        global bcrypt
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        global bcrypt
        return bcrypt.check_password_hash(self.password_hash, password)

class School(db.Model):
    __tablename__ = 'schools'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)  # short code used in student_id
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    students = db.relationship('Student', backref='school', lazy=True)
    exams = db.relationship('Exam', backref='school', lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "code": self.code}


class Student(db.Model):
    __tablename__ = 'students'
    # tie student to user (auth). user_id is PK and FK to user.id
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), primary_key=True)
    user = db.relationship('User', backref=db.backref('student_profile', uselist=False))
    student_id = db.Column(db.String(120), unique=True, nullable=False)  # generated like code-class-number
    name = db.Column(db.String(200), nullable=False)
    class_number = db.Column(db.String(50), nullable=True)   # optional
    number = db.Column(db.String(50), nullable=False)       # provided numeric identifier or seq
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def generate_student_id(self):
        sc = (self.school.code if self.school else None)
        if not sc:
            raise ValueError("school code required")
        # Format number as 3-digit zero-padded string
        num = f"{int(self.number):03d}"
        if self.class_number and str(self.class_number).strip() != "":
            self.student_id = f"{sc}-{self.class_number}-{num}"
        else:
            self.student_id = f"{sc}-{num}"


class Exam(db.Model):
    __tablename__ = 'exams'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    description = db.Column(db.Text)
    access_start = db.Column(db.DateTime, nullable=True)   # when students may start
    access_end = db.Column(db.DateTime, nullable=True)     # after which start not allowed
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)  # time allowed after start
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
    text = db.Column(db.Text, nullable=True)
    # multiple choice options (nullable for descriptive/math)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(50))  # 'A'/'B'/'C'/'D' or expression for math/text
    image_path = db.Column(db.String(255))     # optional saved image filename
    marks = db.Column(db.Integer, nullable=False, default=1)

    def to_dict(self):
        return {
            "id": self.id, "exam_id": self.exam_id, "text": self.text,
            "option_a": self.option_a, "option_b": self.option_b,
            "option_c": self.option_c, "option_d": self.option_d,
            "correct_answer": self.correct_answer, "image_path": self.image_path,
            "marks": self.marks
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
    answer = db.Column(db.Text, nullable=True)  # selected option or text
    is_correct = db.Column(db.Boolean, default=False)
    marks_awarded = db.Column(db.Integer, default=0)

    attempt = db.relationship('StudentExamAttempt', backref=db.backref('answers', lazy=True))
