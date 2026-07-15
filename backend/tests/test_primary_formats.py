"""End-to-end test for primary (class 1-5) interactive question formats:
authoring -> sanitized student payload -> format-aware grading with
partial credit.
"""
import json

import pytest

from app import app, db
from models import ExamStudent, School, Student, User


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

        student_user = User(username='kid1', role='student', school_id=school.id)
        student_user.set_password('kidpass123')
        db.session.add(student_user)
        db.session.commit()
        db.session.add(Student(
            user_id=student_user.id, student_id='TST00001', number='1',
            class_number='2', school_id=school.id,
        ))
        db.session.commit()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def login_headers(client, username, password):
    resp = client.post('/login', json={'username': username, 'password': password})
    assert resp.status_code == 200
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def test_primary_exam_end_to_end(client):
    admin = login_headers(client, 'admin', 'adminpass123')

    resp = client.post('/admin/exams', json={'title': 'Fun Class 2 Exam', 'duration_minutes': 30}, headers=admin)
    assert resp.status_code == 201
    exam_id = resp.get_json()['exam']['id']

    questions = [
        {
            'text': 'Tap the RED fruit',
            'marks': 2,
            'question_format': 'tap_select',
            'content_json': {
                'options': [
                    {'emoji': '🍎', 'value': 'red'},
                    {'emoji': '🍌', 'value': 'yellow'},
                ],
                'answer': 'red',
            },
        },
        {
            'text': 'How many dogs?',
            'marks': 1,
            'question_format': 'count_tap',
            'content_json': {'display': '🐶 🐶 🐶', 'options': [2, 3, 4], 'answer': 3},
        },
        {
            'text': 'Match the animal with its sound',
            'marks': 4,
            'question_format': 'match_line',
            'content_json': {
                'left': ['🐶', '🐱'],
                'right': ['BARK', 'MEOW'],
                'pairs': {'🐶': 'BARK', '🐱': 'MEOW'},
            },
        },
        {
            'text': 'Sort the animals',
            'marks': 2,
            'question_format': 'drag_drop_bucket',
            'content_json': {
                'buckets': ['Land', 'Water'],
                'items': [
                    {'label': '🐘', 'bucket': 'Land'},
                    {'label': '🐟', 'bucket': 'Water'},
                ],
            },
        },
        {
            'text': 'Classic MCQ still works',
            'marks': 1,
            'option_a': 'yes', 'option_b': 'no', 'option_c': '-', 'option_d': '-',
            'correct_answer': 'A',
        },
    ]
    qids = []
    for payload in questions:
        resp = client.post(f'/admin/exams/{exam_id}/questions', json=payload, headers=admin)
        assert resp.status_code == 201, resp.get_json()
        qids.append(resp.get_json()['question']['id'])

    # Invalid content is rejected
    resp = client.post(
        f'/admin/exams/{exam_id}/questions',
        json={'text': 'bad', 'question_format': 'match_line', 'content_json': 'not json'},
        headers=admin,
    )
    assert resp.status_code == 400

    with app.app_context():
        student_id = User.query.filter_by(username='kid1').first().id
        db.session.add(ExamStudent(exam_id=exam_id, student_id=student_id))
        db.session.commit()

    kid = login_headers(client, 'kid1', 'kidpass123')
    assert client.post(f'/student/exams/{exam_id}/start', headers=kid).status_code == 200

    # Answer keys must be stripped from the student payload
    resp = client.get(f'/student/exams/{exam_id}/questions', headers=kid)
    assert resp.status_code == 200
    served = {q['id']: q for q in resp.get_json()['questions']}
    tap = served[qids[0]]
    assert tap['question_format'] == 'tap_select'
    assert 'answer' not in tap['content']
    assert len(tap['content']['options']) == 2
    match = served[qids[2]]
    assert match['content']['left'] == ['🐶', '🐱']
    assert 'pairs' not in match['content']
    bucket = served[qids[3]]
    assert all('bucket' not in item for item in bucket['content']['items'])
    mcq = served[qids[4]]
    assert mcq['question_format'] == 'mcq'
    assert mcq['content'] is None

    # Submit: tap right (2), count wrong (0), match half right (2 of 4),
    # buckets all right (2), mcq right lowercase (1) -> 7 total
    answers = [
        {'question_id': qids[0], 'answer': {'answer': 'red'}},
        {'question_id': qids[1], 'answer': {'answer': 2}},
        {'question_id': qids[2], 'answer': {'pairs': {'🐶': 'BARK', '🐱': 'WRONG'}}},
        {'question_id': qids[3], 'answer': {'placements': {'🐘': 'Land', '🐟': 'Water'}}},
        {'question_id': qids[4], 'answer': 'a'},
    ]
    resp = client.post(f'/student/exams/{exam_id}/submit', json={'answers': answers}, headers=kid)
    assert resp.status_code == 200, resp.get_json()
    assert resp.get_json()['score'] == 7
