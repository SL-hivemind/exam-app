# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime
from sqlalchemy import Integer, event
from sqlalchemy.dialects import mysql
import json
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
            "scopes": [s.to_dict() for s in self.scopes],
            "is_verified": self.is_verified
        }

# -------------------- SPECIALIST SCOPE --------------------
class SpecialistScope(db.Model):
    """What a subject_specialist is allowed to see and edit.

    One row per grant. NULL on class_number/board/paper_code means
    "unrestricted on that axis", so a science specialist covering both
    Physics and Chemistry across every class is two rows with three NULLs
    each, while a maths specialist limited to first year is a single
    ('Mathematics', '11', NULL, NULL).

    Replaces the single User.specialist_subject string, which could only
    ever express one subject and was exact-matched against
    QuestionRepository.subject.
    """
    __tablename__ = 'specialist_scope'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'),
                        nullable=False, index=True)

    subject = db.Column(db.String(100), nullable=False)
    class_number = db.Column(db.String(10), nullable=True)
    board = db.Column(db.String(20), nullable=True)
    paper_code = db.Column(db.String(4), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('scopes', lazy=True,
                                                      cascade='all, delete-orphan'))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'subject', 'class_number', 'board', 'paper_code',
                            name='uq_specialist_scope'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "subject": self.subject,
            "class_number": self.class_number,
            "board": self.board,
            "paper_code": self.paper_code,
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

    # Per-school switch for the daily puzzle games. Schools that would rather
    # their students not see games during exam season can turn them off
    # without affecting anything else.
    games_enabled = db.Column(db.Boolean, nullable=False, default=True, server_default='1')

    students = db.relationship('Student', backref='school', lazy=True)
    exams = db.relationship('Exam', backref='school', lazy=True)
    admins = db.relationship('User', foreign_keys='User.school_id', backref='owned_school', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "total_students": len(self.students),
            "games_enabled": self.games_enabled is not False
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

    # Curriculum the question was authored against. NULL means untagged, which
    # is treated as "visible under every board" so subjects can be tagged one
    # at a time instead of all at once.
    board = db.Column(db.String(20), nullable=True, index=True)   # 'AP-TS' | 'CBSE'
    # AP/TS Intermediate splits each year into two papers and colleges pick by
    # them. CBSE has no such division, so CBSE rows leave this NULL rather than
    # being forced into an invented split.
    paper_code = db.Column(db.String(4), nullable=True, index=True)  # '1A'|'1B'|'2A'|'2B'

    text = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(10))
    # Worked solution shown to a student once the exam is over. Mirrors
    # PublicQuestionRepo.explanation so both banks can carry the same content.
    explanation = db.Column(db.Text, nullable=True)
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
            "board": self.board,
            "paper_code": self.paper_code,
            "difficulty": self.difficulty,
            "text": self.text,
            "option_a": self.option_a,
            "option_b": self.option_b,
            "option_c": self.option_c,
            "option_d": self.option_d,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "image_path": self.image_path,
            "marks": self.marks,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# -------------------- CHAPTER CATALOG --------------------
class ChapterCatalog(db.Model):
    """The canonical syllabus: which chapters exist, per board and class.

    Chapters used to exist only as a side effect of a question row — the
    dropdowns were built from `SELECT DISTINCT chapter`. That meant a school
    could not see its full syllabus until questions had been loaded, and any
    typo silently became a new chapter (which is how 'Mathematics 1A 1A' got
    into the repository). This table is the vocabulary those inputs validate
    against.

    `concept_group` links chapters that teach the same material across boards.
    It is deliberately many-to-many rather than a name alias, because the
    syllabi disagree on granularity: NCERT's single 'Conic Sections' is five
    separate AP chapters (Circle, System of Circles, Parabola, Ellipse,
    Hyperbola). It powers "show me the state board's version of this chapter"
    without moving or copying any question.
    """
    __tablename__ = 'chapter_catalog'
    id = db.Column(db.Integer, primary_key=True)

    board = db.Column(db.String(20), nullable=False)          # 'AP-TS' | 'CBSE'
    subject = db.Column(db.String(100), nullable=False)
    class_number = db.Column(db.String(10), nullable=False)
    paper_code = db.Column(db.String(4), nullable=True)       # AP-TS only; NULL for CBSE
    chapter = db.Column(db.String(100), nullable=False)

    concept_group = db.Column(db.String(50), nullable=True, index=True)
    sequence = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)

    __table_args__ = (
        db.UniqueConstraint('board', 'subject', 'class_number', 'chapter',
                            name='uq_catalog_chapter'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "board": self.board,
            "subject": self.subject,
            "class_number": self.class_number,
            "paper_code": self.paper_code,
            "chapter": self.chapter,
            "concept_group": self.concept_group,
            "sequence": self.sequence,
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

# -------------------- PROCTORING POLICY --------------------

# Canonical defaults. Keys are camelCase because this dict is serialised
# straight to the browser and consumed by useExamSecurity without remapping —
# see frontend/src/utils/proctorEvents.js, which must stay in step with this.
DEFAULT_PROCTOR_POLICY = {
    # Browser restrictions
    'disableRightClick': True,
    'disableCopy': True,
    'disablePaste': True,
    'disableShortcuts': True,
    'warnOnUnload': True,

    # Focus & visibility
    'detectTabSwitch': True,
    'detectWindowBlur': True,
    'blurGraceMs': 1200,

    # Fullscreen
    'requireFullscreen': True,
    'fullscreenSoftFail': True,

    # Camera (Phase 3+). Off by default: a camera requirement that nobody
    # asked for is the fastest way to lock a cohort out of an exam.
    'cameraRequired': False,
    'facePresence': False,

    # Enforcement — HARD signals only
    'maxViolations': 3,
    'autoSubmitOnMaxViolations': True,

    # Arming. Listeners attach before the page has settled; a permission prompt
    # or a late fullscreen transition must not be charged to the student. HARD
    # events inside the warmup are still recorded, just flagged `suppressed`.
    'armWarmupMs': 1500,
    # Safari fires both `fullscreenchange` and `webkitfullscreenchange` for a
    # single transition. Collapse repeats of one type inside this window.
    'dedupMs': 250,

    # Face attention thresholds. These lived inside the tracker as constants,
    # so an exam could not tune them — a supervised lab wants different numbers
    # from a student sitting at home.
    'faceAbsenceMs': 5000,
    'faceAwayMs': 4000,
    'faceRecoverMs': 1500,
    'faceMultipleMs': 3000,
    # None = derive from calibration. Ships disabled until the pitch thresholds
    # have been measured on real hardware rather than derived from geometry.
    'facePitchTolerance': None,
}

# The five environments from the design. Each is a sparse patch over
# DEFAULT_PROCTOR_POLICY, not a full copy, so a change to a default
# propagates instead of being silently shadowed by every profile.
SYSTEM_PROCTOR_PROFILES = {
    'home': {
        'label': 'Home Examination',
        'description': 'Unsupervised. Full browser lockdown, camera monitoring available.',
        'settings': {'cameraRequired': True, 'facePresence': True},
    },
    'classroom': {
        'label': 'Classroom Examination',
        'description': 'Invigilated in person. Browser lockdown only — no camera needed.',
        'settings': {'cameraRequired': False, 'facePresence': False},
    },
    'lab': {
        'label': 'Computer Lab',
        'description': 'Supervised lab machines. Lockdown and tab detection, camera optional.',
        'settings': {'cameraRequired': False, 'facePresence': False},
    },
    'practice': {
        'label': 'Practice Test',
        'description': 'Low stakes. Minimal restrictions, nothing auto-submits.',
        'settings': {
            'disableCopy': False, 'disablePaste': False, 'disableShortcuts': False,
            'requireFullscreen': False, 'detectWindowBlur': False,
            'warnOnUnload': False, 'autoSubmitOnMaxViolations': False,
        },
    },
    'open_book': {
        'label': 'Open Book Examination',
        'description': 'Reference material permitted by design. Restrictions off deliberately.',
        'settings': {
            'disableRightClick': False, 'disableCopy': False, 'disablePaste': False,
            'disableShortcuts': False, 'requireFullscreen': False,
            'detectTabSwitch': False, 'detectWindowBlur': False,
            'autoSubmitOnMaxViolations': False,
        },
    },
}


class ProctorProfile(db.Model):
    """A reusable monitoring policy. System profiles (school_id NULL,
    is_system True) ship with the platform; schools may add their own."""
    __tablename__ = 'proctor_profiles'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), nullable=True)          # set for system profiles
    label = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id', ondelete='CASCADE'), nullable=True)
    is_system = db.Column(db.Boolean, nullable=False, default=False, server_default='0')
    # Sparse patch over DEFAULT_PROCTOR_POLICY. Text + json.dumps rather than a
    # JSON column, matching how every other settings blob in this schema is
    # stored (CourseContent.answer_key_json, GamePuzzle.payload_json, ...).
    settings_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('key', 'school_id', name='uq_proctor_profile_key_school'),
    )

    @property
    def settings(self):
        if not self.settings_json:
            return {}
        try:
            loaded = json.loads(self.settings_json)
            return loaded if isinstance(loaded, dict) else {}
        except (ValueError, TypeError):
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'label': self.label,
            'description': self.description,
            'school_id': self.school_id,
            'is_system': bool(self.is_system),
            'settings': self.settings,
        }


def resolve_proctor_policy(profile=None, overrides=None):
    """Layer the policy: defaults <- profile <- per-exam overrides.

    Unknown keys are dropped. Without that, a typo in an override would sit
    silently in the DB looking like it was doing something.
    """
    policy = dict(DEFAULT_PROCTOR_POLICY)
    for layer in (profile.settings if profile else {}, overrides or {}):
        for key, value in (layer or {}).items():
            if key in DEFAULT_PROCTOR_POLICY:
                policy[key] = value
    return policy


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
    # Practice/mock exams can opt out of aggregate analytics (student/school
    # analysis endpoints); results and ranks for the exam itself still show.
    include_in_analysis = db.Column(db.Boolean, nullable=False, default=True, server_default='1')

    # Monitoring policy. NULL profile means platform defaults — every exam that
    # existed before proctoring shipped keeps behaving exactly as it did.
    proctor_profile_id = db.Column(db.Integer, db.ForeignKey('proctor_profiles.id', ondelete='SET NULL'), nullable=True)
    proctor_overrides = db.Column(db.Text, nullable=True)   # JSON patch over the profile

    questions = db.relationship('Question', backref='exam', lazy=True, cascade="all, delete-orphan")
    assigned = db.relationship('ExamStudent', backref='exam', lazy=True, cascade="all, delete-orphan")
    attempts = db.relationship('StudentExamAttempt', backref='exam', lazy=True, cascade="all, delete-orphan")
    proctor_profile = db.relationship('ProctorProfile', foreign_keys=[proctor_profile_id])

    def recalc_total_marks(self):
        """Recalculate total_marks as the sum of all question marks."""
        self.total_marks = sum(q.marks or 0 for q in self.questions)

    @property
    def proctor_policy(self):
        """The effective policy sent to the browser at exam start."""
        return resolve_proctor_policy(self.proctor_profile, self.proctor_override_dict)

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
            "include_in_analysis": self.include_in_analysis is not False,
            "school_name": self.school.name if self.school else "Global",
            "proctor_profile_id": self.proctor_profile_id,
            "proctor_profile_label": self.proctor_profile.label if self.proctor_profile else None,
            "proctor_overrides": self.proctor_override_dict,
        }

    @property
    def proctor_override_dict(self):
        if not self.proctor_overrides:
            return {}
        try:
            loaded = json.loads(self.proctor_overrides)
            return loaded if isinstance(loaded, dict) else {}
        except (ValueError, TypeError):
            return {}

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
    # What the browser could actually offer when the exam started: camera
    # granted or refused, fullscreen entered or unavailable. Client-asserted and
    # therefore advisory — but it is corroborated by the camera_* event rows,
    # and it lets the admin list flag an unproctored attempt without scanning
    # the event table. JSON in Text, matching every other settings blob here.
    proctoring_state = db.Column(db.Text, nullable=True)
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


class ProctorEvent(db.Model):
    """An integrity event observed in the browser during an attempt.

    Rows are TRANSITIONS, never samples. The distinction decides whether this
    table holds thousands of rows or millions: one 60-minute attempt sampled
    at 1 Hz would write 3,600 rows on its own. MAX_EVENTS_PER_ATTEMPT is the
    backstop if a client ever gets that wrong.
    """
    __tablename__ = 'proctor_events'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('student_exam_attempts.id', ondelete='CASCADE'), nullable=False)
    # Monotonic per attempt, assigned by the client. A gap means events were
    # lost or the page was tampered with — the gap is itself a signal.
    seq = db.Column(db.Integer, nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.SmallInteger, nullable=False, default=0)
    # Client clock — useful for ordering, never trusted for anything else.
    client_ts = db.Column(db.BigInteger, nullable=True)
    received_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    duration_ms = db.Column(db.Integer, nullable=True)
    meta = db.Column(db.Text, nullable=True)
    # True when the client recorded this event but did not count it: the exam
    # was still warming up, or a camera permission prompt was on screen. A
    # column rather than a key inside `meta` because both the auto-submit
    # recount and the live-monitor aggregate filter on it.
    suppressed = db.Column(db.Boolean, nullable=False, default=False, server_default='0')

    attempt = db.relationship(
        'StudentExamAttempt',
        backref=db.backref('proctor_events', lazy=True, cascade='all, delete-orphan'),
    )

    __table_args__ = (
        # Idempotent ingest: a retried flush after a flaky connection must not
        # duplicate rows. The client's seq is the dedup key.
        db.UniqueConstraint('attempt_id', 'seq', name='uq_proctor_event_seq'),
        # The admin live view filters by attempt and orders by severity.
        db.Index('ix_proctor_event_attempt_sev', 'attempt_id', 'severity'),
    )

    def to_dict(self):
        meta = None
        if self.meta:
            try:
                meta = json.loads(self.meta)
            except (ValueError, TypeError):
                meta = None
        return {
            'seq': self.seq,
            'type': self.event_type,
            'severity': self.severity,
            'client_ts': self.client_ts,
            'received_at': self.received_at.isoformat() if self.received_at else None,
            'duration_ms': self.duration_ms,
            'suppressed': bool(self.suppressed),
            'meta': meta,
        }


# Hard ceiling per attempt. Beyond this, events are dropped rather than
# written — a runaway client must never be able to fill the table.
MAX_EVENTS_PER_ATTEMPT = 500

# Events that may contribute to automatic enforcement. Must mirror
# HARD_EVENTS in frontend/src/utils/proctorEvents.js.
HARD_EVENT_TYPES = {'tab_hidden', 'window_blur', 'fullscreen_exited'}

# Accepted event vocabulary. Anything else is discarded at ingest rather than
# stored: this column is grouped and counted in admin reports, so one typo'd
# client would otherwise quietly invent a new category.
# Mirrors EVENT in frontend/src/utils/proctorEvents.js.
KNOWN_EVENT_TYPES = {
    'exam_opened', 'exam_submitted',
    'tab_hidden', 'tab_visible', 'window_blur', 'window_focus',
    'fullscreen_entered', 'fullscreen_exited', 'fullscreen_unsupported',
    'copy_blocked', 'paste_blocked', 'cut_blocked',
    'context_menu_blocked', 'shortcut_blocked',
    'network_offline', 'network_online',
    'camera_granted', 'camera_denied', 'camera_lost',
    'camera_restored', 'camera_unavailable',
    # Soft/inferred (Phase 4). Present in this list so they can be STORED,
    # and deliberately absent from HARD_EVENT_TYPES so they can never be
    # counted toward an auto-submit.
    'face_calibrated', 'face_recalibrated', 'face_absent',
    'face_out_of_region', 'face_returned', 'face_monitor_unavailable',
    'face_multiple', 'face_distance_changed',
}

# Fields a client may attach to an event and have persisted into `meta`.
# A whitelist, not a passthrough: this is student-controlled input that ends up
# rendered in an admin report, and the column is not a dumping ground for
# whatever a future client happens to send.
META_KEYS = {
    'reason', 'key', 'deviceType', 'samples', 'from', 'faces',
    'stage', 'suppressReason', 'proctored', 'unproctoredReason',
    'direction', 'cx', 'cy', 'ipd',
}
# Hard cap on the serialised blob, applied after the whitelist.
MAX_META_CHARS = 512

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
    # 'mcq' | 'assertion_reason' | 'match' | 'statement' | 'nat' | 'msq' — competitive-exam formats
    question_format = db.Column(db.String(30), default='mcq')
    is_pyq = db.Column(db.Boolean, default=False)
    pyq_year = db.Column(db.Integer, nullable=True)
    text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    option_e = db.Column(db.String(500))                            # 5th option (Banking / some SSC)
    # Answer semantics depend on question_format:
    #   mcq/assertion_reason/match/statement -> single letter 'A'..'E'
    #   msq  -> sorted comma letters, e.g. 'A,C'
    #   nat  -> a number '12.5' or an inclusive range 'low|high' e.g. '12.4|12.6'
    correct_answer = db.Column(db.String(30), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    marks = db.Column(db.Integer, default=1)
    negative_marks = db.Column(db.Float, default=0)                 # penalty for a wrong (non-blank) answer, e.g. 0.25
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
            'option_e': self.option_e,
            'marks': self.marks,
            'negative_marks': self.negative_marks or 0,
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
    question_format = db.Column(db.String(30), default='mcq')
    is_pyq = db.Column(db.Boolean, default=False)
    pyq_year = db.Column(db.Integer, nullable=True)
    text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    option_e = db.Column(db.String(500))
    correct_answer = db.Column(db.String(30), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    marks = db.Column(db.Integer, default=1)
    negative_marks = db.Column(db.Float, default=0)
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
    score = db.Column(db.Float, nullable=True)           # float: negative marking yields fractional scores
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

# ==================== DAILY PUZZLE GAMES (School side) ====================
# Self-contained: nothing here references the question repository. School
# students already answer repository questions all day as exams, so the games
# are logic puzzles generated from a date seed instead — see utils/games/.

class GamePuzzle(db.Model):
    """One day's puzzle for one game at one difficulty band.

    Rows are created lazily on the first student request of the day rather
    than by a scheduler, so there is nothing to keep running and nothing to
    upload. The unique constraint is what guarantees a whole band shares one
    puzzle, which is the only reason ranking them by solve time is fair.

    `solution_json` must never be serialised to a student. It stays here so
    grading and hints can be computed server-side, the same split
    `utils/grading.py:sanitize_content` applies to exam questions.
    """
    __tablename__ = 'game_puzzles'
    id = db.Column(db.Integer, primary_key=True)

    game_key = db.Column(db.String(30), nullable=False)   # 'gridlock'|'weave'|'splice'
    band = db.Column(db.String(10), nullable=False)       # '6-7'|'8-10'
    puzzle_date = db.Column(db.Date, nullable=False)

    seed = db.Column(db.BigInteger, nullable=False)
    payload_json = db.Column(db.Text, nullable=False)     # safe to send to students
    solution_json = db.Column(db.Text, nullable=False)    # server-only
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('game_key', 'band', 'puzzle_date', name='uq_game_puzzle_day'),
    )

    def to_dict(self):
        """Deliberately omits solution_json — see the class docstring."""
        return {
            'id': self.id,
            'game_key': self.game_key,
            'band': self.band,
            'puzzle_date': self.puzzle_date.isoformat() if self.puzzle_date else None,
        }


class GamePlay(db.Model):
    """One student's run at one puzzle. At most one row per puzzle per student.

    `school_id` and `class_number` are copied from the student rather than
    joined: the standings endpoint groups by them on every request, and
    denormalising keeps that a single-table scan over an index.
    """
    __tablename__ = 'game_plays'
    id = db.Column(db.Integer, primary_key=True)
    puzzle_id = db.Column(db.Integer, db.ForeignKey('game_puzzles.id', ondelete='CASCADE'), nullable=False)
    student_user_id = db.Column(db.Integer, db.ForeignKey('students.user_id', ondelete='CASCADE'), nullable=False)

    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    class_number = db.Column(db.String(50), nullable=True)

    # DATETIME(3) on MySQL, plain DateTime elsewhere (sqlite already keeps
    # microseconds). A bare MySQL DATETIME stores whole seconds and ROUNDS, so
    # a play started at .650 is written as the next second and a fast solve
    # computes a negative elapsed — which sorts as the fastest run of the day.
    # Declared here as well as in migrate_add_games.py because db.create_all()
    # runs on worker boot in production (app.py:277) and would otherwise
    # recreate these columns without precision on a fresh deploy.
    started_at = db.Column(
        db.DateTime().with_variant(mysql.DATETIME(fsp=3), 'mysql'),
        nullable=False, default=datetime.utcnow)
    completed_at = db.Column(
        db.DateTime().with_variant(mysql.DATETIME(fsp=3), 'mysql'),
        nullable=True)
    # Always computed server-side from started_at. The client's own timer is
    # display only, so a forged elapsed time changes nothing.
    elapsed_ms = db.Column(db.Integer, nullable=True)

    hints_used = db.Column(db.Integer, nullable=False, default=0)
    revealed = db.Column(db.Boolean, nullable=False, default=False)
    solved = db.Column(db.Boolean, nullable=False, default=False)
    state_json = db.Column(db.Text, nullable=True)   # in-progress board, for resume

    puzzle = db.relationship('GamePuzzle', backref=db.backref('plays', lazy=True, cascade='all, delete-orphan'))

    __table_args__ = (
        db.UniqueConstraint('puzzle_id', 'student_user_id', name='uq_game_play'),
        # Leaderboard: solved plays for a puzzle, ordered by time.
        db.Index('ix_gameplay_puzzle_solved', 'puzzle_id', 'solved', 'elapsed_ms'),
        # Class and school cohort slices of the same puzzle.
        db.Index('ix_gameplay_cohort', 'puzzle_id', 'school_id', 'class_number'),
    )

    @property
    def ranking_ms(self):
        """Time used for standings: hints cost 30s each so they stay useful
        without being a free route to a top time. Reveals do not rank at all.
        """
        if not self.solved or self.revealed or self.elapsed_ms is None:
            return None
        from utils.games import HINT_PENALTY_SECONDS
        return self.elapsed_ms + (self.hints_used or 0) * HINT_PENALTY_SECONDS * 1000

    def to_dict(self):
        return {
            'id': self.id,
            'puzzle_id': self.puzzle_id,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'elapsed_ms': self.elapsed_ms,
            'hints_used': self.hints_used or 0,
            'revealed': bool(self.revealed),
            'solved': bool(self.solved),
        }


class GameProfile(db.Model):
    """Per-student streak and lifetime totals across all games."""
    __tablename__ = 'game_profiles'
    student_user_id = db.Column(db.Integer, db.ForeignKey('students.user_id', ondelete='CASCADE'),
                                primary_key=True)
    current_streak = db.Column(db.Integer, nullable=False, default=0)
    longest_streak = db.Column(db.Integer, nullable=False, default=0)
    last_played_date = db.Column(db.Date, nullable=True)
    total_solved = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            'current_streak': self.current_streak or 0,
            'longest_streak': self.longest_streak or 0,
            'last_played_date': self.last_played_date.isoformat() if self.last_played_date else None,
            'total_solved': self.total_solved or 0,
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
