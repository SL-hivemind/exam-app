"""Chapter and topic lists must be scoped to a subject.

Seeded with the real collisions measured in the live repository: 'Thermodynamics'
is a chapter under both Physics and Chemistry, and the topic 'Density' occurs
under Physics, Chemistry and Botany. Those overlaps are the reason a flat list is
ambiguous, so they are what these tests assert against.
"""
import pytest

from app import app, db
from models import QuestionRepository, SpecialistScope, User


# (subject, chapter, topic) — chapter and topic names deliberately overlap.
SEED = [
    ('Physics',   'Thermodynamics', 'Density'),
    ('Physics',   'Thermodynamics', 'Entropy'),
    ('Physics',   'Laws of Motion', 'Friction'),
    ('Chemistry', 'Thermodynamics', 'Density'),
    ('Chemistry', 'Equilibrium',    'Le Chatelier'),
    ('Botany',    'Transport',      'Density'),
]


@pytest.fixture
def client():
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

    with app.app_context():
        db.create_all()

        admin = User(username='meta_admin', role='admin', email='meta@example.com')
        admin.set_password('adminpass123')
        db.session.add(admin)

        solo = User(username='solo_spec', role='subject_specialist')
        solo.set_password('specpass123')
        multi = User(username='multi_spec', role='subject_specialist')
        multi.set_password('specpass123')
        db.session.add_all([solo, multi])
        db.session.commit()

        db.session.add_all([
            SpecialistScope(user_id=solo.id, subject='Physics'),
            SpecialistScope(user_id=multi.id, subject='Physics'),
            SpecialistScope(user_id=multi.id, subject='Chemistry'),
        ])

        for i, (subject, chapter, topic) in enumerate(SEED):
            db.session.add(QuestionRepository(
                custom_id=f'META-{i:03d}',
                subject=subject, class_number='11', chapter=chapter, topic=topic,
                text=f'{subject}/{chapter}/{topic}?',
                correct_answer='a', created_by=admin.id,
            ))
        db.session.commit()

    with app.test_client() as c:
        yield c

    with app.app_context():
        db.session.remove()
        db.drop_all()


def headers(client, username='meta_admin', password='adminpass123'):
    resp = client.post('/login', json={'username': username, 'password': password})
    assert resp.status_code == 200, resp.get_json()
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def meta(client, user='meta_admin', pw='adminpass123', **params):
    resp = client.get('/api/metadata/repository', query_string=params,
                      headers=headers(client, user, pw))
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()


# ── the cascade ──────────────────────────────────────────────────────────────

def test_no_subject_returns_no_chapters_or_topics(client):
    body = meta(client)
    assert body['chapters'] == []
    assert body['topics'] == []
    assert body['requires_subject'] is True


def test_parents_are_still_listed_without_a_subject(client):
    """Only the children cascade — you still need something to choose from."""
    body = meta(client)
    assert sorted(body['subjects']) == ['Botany', 'Chemistry', 'Physics']
    assert body['classes'] == ['11']


def test_subject_narrows_chapters(client):
    physics = meta(client, subject='Physics')
    assert sorted(physics['chapters']) == ['Laws of Motion', 'Thermodynamics']
    assert physics['requires_subject'] is False

    chemistry = meta(client, subject='Chemistry')
    assert sorted(chemistry['chapters']) == ['Equilibrium', 'Thermodynamics']
    # The collision is real: shared with Physics, but Physics' other chapter
    # must not leak in.
    assert 'Laws of Motion' not in chemistry['chapters']


def test_subject_narrows_topics(client):
    assert sorted(meta(client, subject='Physics')['topics']) == [
        'Density', 'Entropy', 'Friction']
    assert sorted(meta(client, subject='Chemistry')['topics']) == [
        'Density', 'Le Chatelier']


def test_chapter_narrows_topics_further(client):
    body = meta(client, subject='Physics', chapter='Thermodynamics')
    assert sorted(body['topics']) == ['Density', 'Entropy']
    assert 'Friction' not in body['topics']


# ── specialist convenience ───────────────────────────────────────────────────

def test_single_subject_specialist_gets_chapters_without_asking(client):
    body = meta(client, user='solo_spec', pw='specpass123')
    assert body['requires_subject'] is False
    assert body['applied_subject'] == 'Physics'
    assert sorted(body['chapters']) == ['Laws of Motion', 'Thermodynamics']


def test_multi_subject_specialist_must_still_choose(client):
    body = meta(client, user='multi_spec', pw='specpass123')
    assert body['requires_subject'] is True
    assert body['chapters'] == []
    # ... and only their own subjects are on offer.
    assert sorted(body['subjects']) == ['Chemistry', 'Physics']


# ── the filter guard ─────────────────────────────────────────────────────────

def test_topic_filter_without_subject_is_rejected(client):
    resp = client.get('/admin/repository/questions',
                      query_string={'topic': 'Density'},
                      headers=headers(client))
    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'SUBJECT_REQUIRED'


def test_chapter_filter_without_subject_is_rejected(client):
    resp = client.get('/admin/repository/questions',
                      query_string={'chapter': 'Thermodynamics'},
                      headers=headers(client))
    assert resp.status_code == 400


def test_colliding_topic_resolves_to_one_subject(client):
    """'Density' exists under three subjects; with a subject you get one."""
    resp = client.get('/admin/repository/questions',
                      query_string={'subject': 'Physics', 'topic': 'Density'},
                      headers=headers(client))
    assert resp.status_code == 200
    rows = resp.get_json()['questions']
    assert len(rows) == 1
    assert rows[0]['subject'] == 'Physics'


def test_plain_listing_without_filters_still_works(client):
    """The guard must only fire on chapter/topic, not on every request."""
    resp = client.get('/admin/repository/questions', headers=headers(client))
    assert resp.status_code == 200
    assert resp.get_json()['total'] == len(SEED)


def test_class_filter_alone_is_not_blocked(client):
    resp = client.get('/admin/repository/questions',
                      query_string={'class_number': '11'},
                      headers=headers(client))
    assert resp.status_code == 200
