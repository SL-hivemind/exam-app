"""/student/exams/summary — counts over every assignment, not one page.

The dashboard previously tallied whatever rows the paginated list endpoint
returned, which meant its headline numbers described a page of five rather
than the student's actual record. These tests pin the behaviour that fixes
that: the counts must be independent of pagination, and `resume` / `next_up`
must be able to point at an exam that is nowhere near the first page.
"""
import datetime

import pytest

from app import app, db
from models import Exam, ExamStudent, School, Student, StudentExamAttempt, User


# Exam access windows and attempt timestamps use DIFFERENT clocks in this
# codebase, and mixing them silently shifts every window by the local UTC
# offset — enough to make an open exam look missed.
#
#   access_start / access_end -> naive LOCAL wall-clock; the routes run them
#                                through to_utc_naive() before comparing.
#   attempt start/submitted   -> naive UTC (models default to datetime.utcnow).

def _local(**delta):
    """A window boundary, in the local wall-clock the routes expect."""
    return datetime.datetime.now() + datetime.timedelta(**delta)


def _utc(**delta):
    """An attempt timestamp, in UTC as the model stores it."""
    return datetime.datetime.utcnow() + datetime.timedelta(**delta)


@pytest.fixture
def client():
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

    with app.app_context():
        db.create_all()
        admin = User(username='admin', role='admin', email='a@example.com')
        admin.set_password('adminpass123')
        db.session.add(admin)
        db.session.commit()

        school = School(name='Test School', code='TST', created_by=admin.id)
        db.session.add(school)
        db.session.commit()

        user = User(username='kid', role='student', school_id=school.id)
        user.set_password('kidpass123')
        db.session.add(user)
        db.session.commit()
        db.session.add(Student(
            user_id=user.id, student_id='STU00001', number='1',
            class_number='8', school_id=school.id,
        ))
        db.session.commit()

    with app.test_client() as test_client:
        yield test_client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def headers(client):
    resp = client.post('/login', json={'username': 'kid', 'password': 'kidpass123'})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def make_exam(title, start=None, end=None, released=False):
    with app.app_context():
        school = School.query.first()
        student = Student.query.first()
        exam = Exam(
            title=title, access_start=start, access_end=end,
            duration_minutes=30, total_marks=50,
            school_id=school.id, results_released=released,
        )
        db.session.add(exam)
        db.session.commit()
        db.session.add(ExamStudent(exam_id=exam.id, student_id=student.user_id))
        db.session.commit()
        return exam.id


def attempt(exam_id, submitted=False, score=None, started=None):
    with app.app_context():
        student = Student.query.first()
        db.session.add(StudentExamAttempt(
            exam_id=exam_id, student_id=student.user_id,
            start_time=started or _utc(minutes=-10),
            submitted_time=_utc(minutes=-5) if submitted else None,
            score=score,
        ))
        db.session.commit()


def test_summary_of_an_empty_slate(client):
    body = client.get('/student/exams/summary', headers=headers(client)).get_json()
    assert body['total'] == 0
    assert body['average_score'] is None
    assert body['resume'] is None and body['next_up'] is None


def test_every_bucket_is_counted(client):
    make_exam('open', start=_local(hours=-1), end=_local(hours=1))
    make_exam('later', start=_local(days=1), end=_local(days=2))
    make_exam('gone', start=_local(days=-3), end=_local(days=-2))
    done = make_exam('marked', released=True)
    attempt(done, submitted=True, score=40)
    waiting = make_exam('unmarked', released=False)
    attempt(waiting, submitted=True, score=30)
    running = make_exam('running', start=_local(hours=-1), end=_local(hours=1))
    attempt(running, submitted=False)

    body = client.get('/student/exams/summary', headers=headers(client)).get_json()

    assert body['total'] == 6
    assert body['active_now'] == 1
    assert body['upcoming'] == 1
    assert body['missed'] == 1
    assert body['completed'] == 1
    assert body['results_pending'] == 1
    assert body['in_progress'] == 1


def test_average_uses_only_released_scores(client):
    a = make_exam('one', released=True)
    attempt(a, submitted=True, score=80)
    b = make_exam('two', released=True)
    attempt(b, submitted=True, score=60)
    hidden = make_exam('withheld', released=False)
    attempt(hidden, submitted=True, score=10)   # must not drag the average down

    body = client.get('/student/exams/summary', headers=headers(client)).get_json()
    assert body['average_score'] == 70.0
    assert body['scored_count'] == 2


def test_resume_outranks_a_startable_exam(client):
    make_exam('open now', start=_local(hours=-1), end=_local(hours=1))
    running = make_exam('half finished', start=_local(hours=-2), end=_local(hours=2))
    attempt(running, submitted=False)

    body = client.get('/student/exams/summary', headers=headers(client)).get_json()
    assert body['resume']['title'] == 'half finished'


def test_next_up_prefers_the_exam_closing_soonest(client):
    make_exam('closes later', start=_local(hours=-1), end=_local(hours=6))
    make_exam('closes soon', start=_local(hours=-1), end=_local(minutes=30))
    make_exam('not open yet', start=_local(days=2), end=_local(days=3))

    body = client.get('/student/exams/summary', headers=headers(client)).get_json()
    assert body['next_up']['title'] == 'closes soon'


def test_next_up_falls_back_to_the_soonest_upcoming(client):
    make_exam('next week', start=_local(days=7), end=_local(days=8))
    make_exam('tomorrow', start=_local(days=1), end=_local(days=2))

    body = client.get('/student/exams/summary', headers=headers(client)).get_json()
    assert body['next_up']['title'] == 'tomorrow'


def test_counts_ignore_pagination(client):
    """The bug this endpoint exists to fix."""
    for i in range(12):
        exam_id = make_exam(f'done {i}', released=True)
        attempt(exam_id, submitted=True, score=50)

    auth = headers(client)
    page = client.get('/student/exams?page=1&per_page=5', headers=auth).get_json()
    assert len(page['exams']) == 5           # a page tally would say 5

    body = client.get('/student/exams/summary', headers=auth).get_json()
    assert body['completed'] == 12           # the truth
    assert body['total'] == 12


def test_summary_needs_a_student_account(client):
    assert client.get('/student/exams/summary').status_code == 401
