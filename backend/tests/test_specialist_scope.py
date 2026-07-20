"""Tests for multi-subject specialist scoping.

Covers the behaviour that replaced the single `User.specialist_subject`:
several subjects per specialist, optional class limits, and validate-instead-of
-overwrite on the create path.
"""
import pytest

from app import app, db
from models import QuestionRepository, SpecialistScope, User


@pytest.fixture
def client():
    # conftest.py has already swapped the engine onto isolated in-memory
    # sqlite — create_all/drop_all here never touch the real database.
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

    with app.app_context():
        db.create_all()

        admin = User(username='sc_admin', role='admin', email='sc_admin@example.com')
        admin.set_password('adminpass123')
        db.session.add(admin)

        # Covers Physics and Chemistry, every class.
        science = User(username='sci_spec', role='subject_specialist')
        science.set_password('specpass123')
        db.session.add(science)

        # Covers Mathematics, class 11 only.
        maths = User(username='math_spec', role='subject_specialist')
        maths.set_password('specpass123')
        db.session.add(maths)

        # Deliberately granted nothing.
        empty = User(username='empty_spec', role='subject_specialist')
        empty.set_password('specpass123')
        db.session.add(empty)
        db.session.commit()

        db.session.add_all([
            SpecialistScope(user_id=science.id, subject='Physics'),
            SpecialistScope(user_id=science.id, subject='Chemistry'),
            SpecialistScope(user_id=maths.id, subject='Mathematics', class_number='11'),
        ])

        for subject, cls, chapter in [
            ('Physics', '11', 'Laws of Motion'),
            ('Chemistry', '11', 'Equilibrium'),
            ('Biology', '11', 'Cell Division'),
            ('Mathematics', '11', 'Sets'),
            ('Mathematics', '12', 'Integrals'),
        ]:
            db.session.add(QuestionRepository(
                subject=subject, class_number=cls, chapter=chapter,
                text=f'{subject} {cls} {chapter} question?',
                option_a='a', option_b='b', option_c='c', option_d='d',
                correct_answer='a', created_by=admin.id,
            ))
        db.session.commit()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def headers(client, username, password='specpass123'):
    resp = client.post('/login', json={'username': username, 'password': password})
    assert resp.status_code == 200, resp.get_json()
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def subjects_seen(client, username, password='specpass123'):
    resp = client.get('/admin/repository/questions',
                      headers=headers(client, username, password))
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    rows = body.get('questions', body) if isinstance(body, dict) else body
    return sorted({r['subject'] for r in rows})


def test_specialist_sees_all_granted_subjects(client):
    # The whole point of the change: one specialist, two subjects.
    assert subjects_seen(client, 'sci_spec') == ['Chemistry', 'Physics']


def test_specialist_does_not_see_ungranted_subjects(client):
    assert 'Biology' not in subjects_seen(client, 'sci_spec')


def test_class_limit_narrows_within_a_subject(client):
    resp = client.get('/admin/repository/questions',
                      headers=headers(client, 'math_spec'))
    body = resp.get_json()
    rows = body.get('questions', body) if isinstance(body, dict) else body
    assert sorted(r['chapter'] for r in rows) == ['Sets']  # class 12 'Integrals' excluded


def test_no_scopes_means_no_access(client):
    assert subjects_seen(client, 'empty_spec') == []


def test_metadata_is_scoped_too(client):
    resp = client.get('/api/metadata/repository',
                      headers=headers(client, 'sci_spec'))
    assert resp.status_code == 200
    assert sorted(resp.get_json()['subjects']) == ['Chemistry', 'Physics']


def test_create_rejects_out_of_scope_subject(client):
    resp = client.post('/admin/repository/questions',
                       headers=headers(client, 'sci_spec'),
                       json={'text': 'nope?', 'subject': 'Biology',
                             'class_number': '11', 'correct_answer': 'a'})
    assert resp.status_code == 403
    assert 'Chemistry' in resp.get_json()['allowed_subjects']


def test_create_accepts_in_scope_subject_and_keeps_chapter(client):
    resp = client.post('/admin/repository/questions',
                       headers=headers(client, 'sci_spec'),
                       json={'text': 'in scope?', 'subject': 'Chemistry',
                             'class_number': '11', 'chapter': 'Redox Reactions',
                             'correct_answer': 'a'})
    assert resp.status_code in (200, 201), resp.get_json()

    with app.app_context():
        q = QuestionRepository.query.filter_by(text='in scope?').first()
        assert q is not None
        # Regression: the create path used to drop chapter entirely.
        assert q.chapter == 'Redox Reactions'


def test_class_number_scope_is_not_a_substring_match(client):
    """A scope of class '1' must not match classes '11' or '12'."""
    with app.app_context():
        user = User.query.filter_by(username='empty_spec').first()
        db.session.add(SpecialistScope(user_id=user.id, subject='Mathematics',
                                       class_number='1'))
        db.session.commit()

    resp = client.get('/admin/repository/questions',
                      headers=headers(client, 'empty_spec'))
    body = resp.get_json()
    rows = body.get('questions', body) if isinstance(body, dict) else body
    assert rows == []
