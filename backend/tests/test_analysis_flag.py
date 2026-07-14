"""Tests for the exam `include_in_analysis` flag.

Excluded exams must keep their results/attempts but disappear from the
aggregate analysis endpoints.
"""
from datetime import datetime

import pytest

from app import app, db
from models import Exam, School, Student, StudentExamAttempt, User


@pytest.fixture
def client():
    # conftest.py has already swapped the engine onto isolated in-memory
    # sqlite — create_all/drop_all here never touch the real database.
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

    with app.app_context():
        db.create_all()

        admin = User(username='admin', role='admin', email='admin@example.com')
        admin.set_password('adminpass123')
        db.session.add(admin)
        db.session.commit()

        school = School(name='Test School', code='TST', created_by=admin.id)
        db.session.add(school)
        db.session.commit()

        student_user = User(username='stud1', role='student', school_id=school.id)
        student_user.set_password('studpass123')
        db.session.add(student_user)
        db.session.commit()
        student = Student(
            user_id=student_user.id, student_id='TST00001', number='1',
            class_number='10', school_id=school.id,
        )
        db.session.add(student)
        db.session.commit()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def admin_headers(client):
    resp = client.post('/login', json={'username': 'admin', 'password': 'adminpass123'})
    assert resp.status_code == 200
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def test_include_in_analysis_lifecycle(client):
    headers = admin_headers(client)

    # Created without the field -> included by default
    r1 = client.post('/admin/exams', json={'title': 'Real Exam', 'duration_minutes': 30}, headers=headers)
    assert r1.status_code == 201
    exam1 = r1.get_json()['exam']
    assert exam1['include_in_analysis'] is True

    # Created explicitly excluded
    r2 = client.post(
        '/admin/exams',
        json={'title': 'Mock Exam', 'duration_minutes': 30, 'include_in_analysis': False},
        headers=headers,
    )
    assert r2.status_code == 201
    exam2 = r2.get_json()['exam']
    assert exam2['include_in_analysis'] is False

    # One submitted attempt on each exam
    with app.app_context():
        student_user_id = User.query.filter_by(username='stud1').first().id
        now = datetime.utcnow()
        for exam_id, score in ((exam1['id'], 8), (exam2['id'], 2)):
            exam = db.session.get(Exam, exam_id)
            exam.total_marks = 10
            db.session.add(StudentExamAttempt(
                exam_id=exam_id, student_id=student_user_id,
                start_time=now, submitted_time=now, score=score,
            ))
        db.session.commit()

    # Analysis only counts the included exam
    resp = client.get(f'/student/analysis/{student_user_id}', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['summary']['attempted_exams'] == 1
    assert [e['exam_title'] for e in data['exam_wise']] == ['Real Exam']

    # Toggle the mock exam back in -> both count
    resp = client.put(f"/admin/exams/{exam2['id']}", json={'include_in_analysis': True}, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['exam']['include_in_analysis'] is True

    data = client.get(f'/student/analysis/{student_user_id}', headers=headers).get_json()
    assert data['summary']['attempted_exams'] == 2

    # Toggle the real exam out -> only the mock counts
    resp = client.put(f"/admin/exams/{exam1['id']}", json={'include_in_analysis': False}, headers=headers)
    assert resp.status_code == 200

    data = client.get(f'/student/analysis/{student_user_id}', headers=headers).get_json()
    assert data['summary']['attempted_exams'] == 1
    assert [e['exam_title'] for e in data['exam_wise']] == ['Mock Exam']
