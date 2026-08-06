"""Tests for adaptive proctoring: policy resolution and the event ledger.

The load-bearing guarantees here are the defensive ones — the event cap, the
seq dedup, and the rule that a client cannot assert a violation it has no
evidence for. Those are what stop a single bad client from filling the table
or rewriting its own submission record.
"""
import json
from datetime import datetime, timedelta

import pytest

from app import app, db
from models import (
    Exam, ExamStudent, ProctorEvent, ProctorProfile, Question, School,
    Student, StudentExamAttempt, User, MAX_EVENTS_PER_ATTEMPT, MAX_META_CHARS,
    resolve_proctor_policy, DEFAULT_PROCTOR_POLICY, SYSTEM_PROCTOR_PROFILES,
)


@pytest.fixture
def client():
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

    with app.app_context():
        db.create_all()

        admin = User(username='padmin', role='admin', email='padmin@example.com')
        admin.set_password('adminpass123')
        db.session.add(admin)
        db.session.commit()

        school = School(name='Proctor School', code='PRC', created_by=admin.id)
        db.session.add(school)
        db.session.commit()

        su = User(username='pstud', role='student', school_id=school.id)
        su.set_password('studpass123')
        db.session.add(su)
        db.session.commit()

        db.session.add(Student(
            user_id=su.id, student_id='PRC00001', number='1',
            class_number='10', school_id=school.id,
        ))

        # System profiles normally arrive via migrate_add_proctoring.py.
        for key, spec in SYSTEM_PROCTOR_PROFILES.items():
            import json as _json
            db.session.add(ProctorProfile(
                key=key, label=spec['label'], description=spec['description'],
                school_id=None, is_system=True,
                settings_json=_json.dumps(spec['settings']),
            ))

        # Naive datetimes are stored as LOCAL time here — to_utc_naive() in
        # app.py reinterprets them against the server's zone. A wide window
        # keeps the fixture correct whatever zone the test machine is in.
        exam = Exam(
            title='Proctored Exam', duration_minutes=60,
            school_id=school.id, created_by=admin.id,
            access_start=datetime.now() - timedelta(days=2),
            access_end=datetime.now() + timedelta(days=2),
        )
        db.session.add(exam)
        db.session.commit()

        db.session.add(Question(
            exam_id=exam.id, text='2+2?', option_a='3', option_b='4',
            option_c='5', option_d='6', correct_answer='B', marks=1,
        ))
        db.session.add(ExamStudent(exam_id=exam.id, student_id=su.id))
        db.session.commit()

    with app.test_client() as c:
        yield c

    with app.app_context():
        db.session.remove()
        db.drop_all()


def admin_headers(client):
    r = client.post('/login', json={'username': 'padmin', 'password': 'adminpass123'})
    assert r.status_code == 200
    return {'Authorization': f"Bearer {r.get_json()['auth_token']}"}


def student_headers(client):
    r = client.post('/login', json={'username': 'pstud', 'password': 'studpass123'})
    assert r.status_code == 200
    return {'Authorization': f"Bearer {r.get_json()['auth_token']}"}


def only_exam_id():
    with app.app_context():
        return Exam.query.filter_by(title='Proctored Exam').first().id


def start_attempt(client, headers, exam_id):
    r = client.post(f'/student/exams/{exam_id}/start', json={}, headers=headers)
    assert r.status_code == 200, r.get_json()
    with app.app_context():
        return StudentExamAttempt.query.filter_by(exam_id=exam_id).first().id


def event(seq, type_='tab_hidden', severity=3, **extra):
    return {'type': type_, 'seq': seq, 'severity': severity, 'ts': 1700000000000, **extra}


# ── Policy resolution ──────────────────────────────────────────────────────

def test_policy_defaults_apply_when_no_profile():
    policy = resolve_proctor_policy(None, None)
    assert policy == DEFAULT_PROCTOR_POLICY
    # Camera must be off unless somebody deliberately turns it on.
    assert policy['cameraRequired'] is False


def test_overrides_layer_over_profile_and_unknown_keys_are_dropped():
    class P:
        settings = {'requireFullscreen': False, 'disableCopy': False}

    policy = resolve_proctor_policy(P(), {'disableCopy': True, 'nonsense': 'x'})
    assert policy['requireFullscreen'] is False   # from profile
    assert policy['disableCopy'] is True          # override wins
    assert 'nonsense' not in policy


def test_open_book_profile_disables_restrictions():
    class P:
        settings = SYSTEM_PROCTOR_PROFILES['open_book']['settings']

    policy = resolve_proctor_policy(P(), None)
    assert policy['detectTabSwitch'] is False
    assert policy['autoSubmitOnMaxViolations'] is False


def test_admin_can_list_profiles_and_attach_one(client):
    headers = admin_headers(client)
    exam_id = only_exam_id()

    r = client.get('/admin/proctor-profiles', headers=headers)
    assert r.status_code == 200
    body = r.get_json()
    keys = {p['key'] for p in body['profiles']}
    assert {'home', 'classroom', 'lab', 'practice', 'open_book'} <= keys
    assert body['defaults']['cameraRequired'] is False

    open_book = next(p for p in body['profiles'] if p['key'] == 'open_book')
    r2 = client.put(f'/admin/exams/{exam_id}',
                    json={'proctor_profile_id': open_book['id']}, headers=headers)
    assert r2.status_code == 200

    r3 = client.get(f'/admin/exams/{exam_id}/proctor-policy', headers=headers)
    assert r3.status_code == 200
    assert r3.get_json()['policy']['detectTabSwitch'] is False


def test_unknown_override_keys_are_not_persisted(client):
    headers = admin_headers(client)
    exam_id = only_exam_id()

    r = client.put(f'/admin/exams/{exam_id}',
                   json={'proctor_overrides': {'requireFullscreen': False, 'evil': 1}},
                   headers=headers)
    assert r.status_code == 200
    assert r.get_json()['exam']['proctor_overrides'] == {'requireFullscreen': False}


def test_exam_can_be_created_with_a_profile(client):
    headers = admin_headers(client)
    profiles = client.get('/admin/proctor-profiles', headers=headers).get_json()['profiles']
    home = next(p for p in profiles if p['key'] == 'home')

    r = client.post('/admin/exams', json={
        'title': 'Home Exam', 'duration_minutes': 30, 'proctor_profile_id': home['id'],
    }, headers=headers)
    assert r.status_code == 201
    exam_id = r.get_json()['exam']['id']

    policy = client.get(f'/admin/exams/{exam_id}/proctor-policy',
                        headers=headers).get_json()['policy']
    assert policy['cameraRequired'] is True


def test_creating_with_an_unknown_profile_is_rejected(client):
    r = client.post('/admin/exams', json={
        'title': 'Bad Exam', 'duration_minutes': 30, 'proctor_profile_id': 99999,
    }, headers=admin_headers(client))
    assert r.status_code == 400


def test_exam_without_a_profile_keeps_default_behaviour(client):
    """Pre-existing exams must be untouched by this feature."""
    headers = admin_headers(client)
    r = client.post('/admin/exams', json={'title': 'Plain', 'duration_minutes': 30},
                    headers=headers)
    exam_id = r.get_json()['exam']['id']

    body = client.get(f'/admin/exams/{exam_id}/proctor-policy', headers=headers).get_json()
    assert body['profile'] is None
    assert body['policy'] == DEFAULT_PROCTOR_POLICY


def test_student_receives_resolved_policy(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    r = client.get(f'/student/exams/{exam_id}/can_start', headers=headers)
    assert r.status_code == 200
    assert r.get_json()['proctor_policy']['maxViolations'] == 3


# ── Event ingest ───────────────────────────────────────────────────────────

def test_events_ride_along_on_autosave(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    with app.app_context():
        qid = Question.query.filter_by(exam_id=exam_id).first().id

    r = client.post(f'/student/exams/{exam_id}/autosave', json={
        'answers': [{'question_id': qid, 'answer': 'B'}],
        'events': [event(1), event(2, 'window_blur', 2)],
    }, headers=headers)
    assert r.status_code == 200
    assert r.get_json()['events_stored'] == 2

    with app.app_context():
        assert ProctorEvent.query.filter_by(attempt_id=attempt_id).count() == 2


def test_duplicate_seq_is_ignored(client):
    """A flush retried after a dropped connection must not double-count."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    payload = {'events': [event(1), event(2)]}
    r1 = client.post(f'/student/exams/{exam_id}/events', json=payload, headers=headers)
    assert r1.get_json()['stored'] == 2

    r2 = client.post(f'/student/exams/{exam_id}/events', json=payload, headers=headers)
    assert r2.get_json()['stored'] == 0

    with app.app_context():
        assert ProctorEvent.query.filter_by(attempt_id=attempt_id).count() == 2


def test_unknown_event_types_are_discarded(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    r = client.post(f'/student/exams/{exam_id}/events', json={'events': [
        event(1, 'tab_hidden'),
        event(2, 'sql_injection_attempt'),
        event(3, ''),
        'not-a-dict',
    ]}, headers=headers)
    assert r.get_json()['stored'] == 1

    with app.app_context():
        types = [e.event_type for e in ProctorEvent.query.filter_by(attempt_id=attempt_id).all()]
        assert types == ['tab_hidden']


def test_event_cap_is_enforced(client):
    """The storage footgun: a client logging samples instead of transitions
    would otherwise write thousands of rows per attempt."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    burst = [event(i) for i in range(1, MAX_EVENTS_PER_ATTEMPT + 200)]
    client.post(f'/student/exams/{exam_id}/events', json={'events': burst}, headers=headers)
    # A second burst must not get past the ceiling either.
    client.post(f'/student/exams/{exam_id}/events', json={
        'events': [event(i) for i in range(10000, 10100)]
    }, headers=headers)

    with app.app_context():
        total = ProctorEvent.query.filter_by(attempt_id=attempt_id).count()
    assert total == MAX_EVENTS_PER_ATTEMPT


def test_malformed_events_never_block_the_answer_save(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)
    with app.app_context():
        qid = Question.query.filter_by(exam_id=exam_id).first().id

    r = client.post(f'/student/exams/{exam_id}/autosave', json={
        'answers': [{'question_id': qid, 'answer': 'B'}],
        'events': [{'type': 'tab_hidden'}, {'seq': 'abc', 'type': 'tab_hidden'}],
    }, headers=headers)
    assert r.status_code == 200
    assert r.get_json()['count'] == 1     # the answer still saved


def test_server_timestamps_the_event_not_the_client(client):
    """client_ts is recorded but never authoritative."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    client.post(f'/student/exams/{exam_id}/events', json={
        'events': [event(1, ts=99999999999999999)]     # absurd client clock
    }, headers=headers)

    with app.app_context():
        ev = ProctorEvent.query.filter_by(attempt_id=attempt_id).first()
        assert ev.received_at is not None
        assert ev.client_ts is None      # out of range, rejected


# ── Submission reason integrity ────────────────────────────────────────────

def test_client_cannot_fake_a_violation_submit(client):
    """reason='tab_switch' with no recorded violations is downgraded."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)

    r = client.post(f'/student/exams/{exam_id}/submit',
                    json={'answers': [], 'reason': 'tab_switch'}, headers=headers)
    assert r.status_code == 200

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.submission_reason == 'manual'


def test_violation_submit_is_accepted_when_evidenced(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)

    r = client.post(f'/student/exams/{exam_id}/submit', json={
        'answers': [],
        'reason': 'tab_switch',
        'events': [event(1), event(2), event(3)],   # three hard violations
    }, headers=headers)
    assert r.status_code == 200

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.submission_reason == 'tab_switch'


def test_soft_events_cannot_trigger_a_violation_submit(client):
    """The HARD/SOFT split: low-severity noise must never enforce."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)

    r = client.post(f'/student/exams/{exam_id}/submit', json={
        'answers': [],
        'reason': 'tab_switch',
        'events': [
            event(1, 'copy_blocked', 1), event(2, 'paste_blocked', 1),
            event(3, 'context_menu_blocked', 0), event(4, 'camera_lost', 3),
        ],
    }, headers=headers)
    assert r.status_code == 200

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        # camera_lost is high severity but NOT a hard enforcement signal.
        assert attempt.submission_reason == 'manual'


def test_face_events_are_stored_but_never_enforce(client):
    """The Phase 4 guarantee: inferred signals are review flags only.

    Face detection is probabilistic and will produce false positives at
    scale. If one of these could reach the auto-submit path it would end a
    child's exam over a misfiring inference, which is unrecoverable.
    """
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    face_events = [
        event(1, 'face_calibrated', 0), event(2, 'face_absent', 2),
        event(3, 'face_out_of_region', 1), event(4, 'face_absent', 2),
        event(5, 'face_returned', 0), event(6, 'face_absent', 2),
    ]
    r = client.post(f'/student/exams/{exam_id}/events',
                    json={'events': face_events}, headers=headers)
    assert r.get_json()['stored'] == 6      # stored for review

    with app.app_context():
        assert ProctorEvent.query.filter_by(attempt_id=attempt_id).count() == 6

    # ...but three face_absent events must not satisfy a violation claim.
    client.post(f'/student/exams/{exam_id}/submit',
                json={'answers': [], 'reason': 'tab_switch'}, headers=headers)

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.submission_reason == 'manual'


def test_hard_and_soft_event_sets_do_not_overlap():
    """Structural guard: nothing inferred may creep into the enforcement set."""
    from models import HARD_EVENT_TYPES, KNOWN_EVENT_TYPES
    soft = {e for e in KNOWN_EVENT_TYPES if e.startswith(('face_', 'camera_'))}
    assert HARD_EVENT_TYPES.isdisjoint(soft)
    assert HARD_EVENT_TYPES <= KNOWN_EVENT_TYPES


def test_arbitrary_reason_strings_are_rejected(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)

    client.post(f'/student/exams/{exam_id}/submit',
                json={'answers': [], 'reason': 'x' * 200}, headers=headers)

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.submission_reason == 'manual'


# ── Live monitor ───────────────────────────────────────────────────────────

def test_live_monitor_aggregates_violations(client):
    s_headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, s_headers, exam_id)

    client.post(f'/student/exams/{exam_id}/events', json={'events': [
        event(1, 'tab_hidden'), event(2, 'tab_hidden'), event(3, 'window_blur', 2),
        event(4, 'copy_blocked', 1),      # below the severity floor
    ]}, headers=s_headers)

    r = client.get(f'/admin/exams/{exam_id}/live', headers=admin_headers(client))
    assert r.status_code == 200
    body = r.get_json()

    assert body['summary']['started'] == 1
    assert body['summary']['flagged'] == 1
    student = body['students'][0]
    assert student['event_counts']['tab_hidden'] == 2
    assert student['hard_violations'] == 3
    assert 'copy_blocked' not in student['event_counts']
    assert body['policy']['maxViolations'] == 3


def test_live_monitor_requires_admin(client):
    exam_id = only_exam_id()
    r = client.get(f'/admin/exams/{exam_id}/live', headers=student_headers(client))
    assert r.status_code in (401, 403)


# ── Suppressed events ──────────────────────────────────────────────────────
#
# A camera permission prompt makes Chrome drop fullscreen and steal focus,
# which used to charge the student two violations for clicking "Allow". The
# client now records those events but marks them suppressed. Both sides must
# agree on that, or the disagreement resolves against the student.

def test_suppressed_hard_events_do_not_satisfy_a_violation_claim(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)

    r = client.post(f'/student/exams/{exam_id}/submit', json={
        'answers': [],
        'reason': 'tab_switch',
        # Three hard events, all raised while a permission prompt was up.
        'events': [
            event(1, suppressed=True, suppressReason='camera_prompt'),
            event(2, suppressed=True, suppressReason='camera_prompt'),
            event(3, suppressed=True, suppressReason='warmup'),
        ],
    }, headers=headers)
    assert r.status_code == 200

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        # Stored for the record...
        assert ProctorEvent.query.filter_by(attempt_id=attempt.id).count() == 3
        # ...but they cannot end the exam.
        assert attempt.submission_reason == 'manual'


def test_unsuppressed_events_still_enforce_alongside_suppressed_ones(client):
    """The suppression must not become a blanket off-switch."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, headers, exam_id)

    client.post(f'/student/exams/{exam_id}/submit', json={
        'answers': [],
        'reason': 'tab_switch',
        'events': [
            event(1, suppressed=True),   # permission prompt — not counted
            event(2), event(3), event(4),  # three real tab switches
        ],
    }, headers=headers)

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.submission_reason == 'tab_switch'


def test_suppressed_events_are_hidden_from_the_live_monitor(client):
    s_headers = student_headers(client)
    exam_id = only_exam_id()
    start_attempt(client, s_headers, exam_id)

    client.post(f'/student/exams/{exam_id}/events', json={'events': [
        event(1, 'tab_hidden'),
        event(2, 'tab_hidden', suppressed=True),
        event(3, 'fullscreen_exited', 2, suppressed=True),
    ]}, headers=s_headers)

    body = client.get(f'/admin/exams/{exam_id}/live',
                      headers=admin_headers(client)).get_json()
    student = body['students'][0]
    assert student['event_counts']['tab_hidden'] == 1
    assert 'fullscreen_exited' not in student['event_counts']
    assert student['hard_violations'] == 1


# ── Event metadata ─────────────────────────────────────────────────────────

def test_whitelisted_meta_is_stored_and_everything_else_dropped(client):
    """Without meta, `face_out_of_region` records that a student looked away
    but not which way or how far — not enough for anyone to review fairly."""
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    client.post(f'/student/exams/{exam_id}/events', json={'events': [
        event(1, 'face_out_of_region', 1,
              reason='pitch', direction='down', deviceType='laptop',
              # Not on the whitelist — must not be persisted.
              evil='<script>alert(1)</script>', answers=['A', 'B']),
    ]}, headers=headers)

    with app.app_context():
        row = ProctorEvent.query.filter_by(attempt_id=attempt_id, seq=1).first()
        meta = json.loads(row.meta)
        assert meta == {'reason': 'pitch', 'direction': 'down',
                        'deviceType': 'laptop'}
        assert 'evil' not in row.meta
        assert row.to_dict()['meta']['direction'] == 'down'


def test_meta_is_length_capped(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    client.post(f'/student/exams/{exam_id}/events', json={'events': [
        event(1, 'camera_denied', 2, reason='x' * 5000),
    ]}, headers=headers)

    with app.app_context():
        row = ProctorEvent.query.filter_by(attempt_id=attempt_id, seq=1).first()
        assert len(row.meta) <= MAX_META_CHARS
        # Truncated mid-JSON, so to_dict() must degrade rather than raise.
        assert row.to_dict()['meta'] is None


def test_events_without_meta_keys_store_null(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    client.post(f'/student/exams/{exam_id}/events',
                json={'events': [event(1)]}, headers=headers)

    with app.app_context():
        row = ProctorEvent.query.filter_by(attempt_id=attempt_id, seq=1).first()
        assert row.meta is None
        assert row.suppressed is False


# ── New soft event types ───────────────────────────────────────────────────

def test_new_face_events_are_stored_but_never_enforce(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    attempt_id = start_attempt(client, headers, exam_id)

    r = client.post(f'/student/exams/{exam_id}/events', json={'events': [
        event(1, 'face_multiple', 2, faces=2),
        event(2, 'face_distance_changed', 1, reason='too_far'),
        event(3, 'face_multiple', 2, faces=3),
    ]}, headers=headers)
    assert r.get_json()['stored'] == 3

    client.post(f'/student/exams/{exam_id}/submit',
                json={'answers': [], 'reason': 'tab_switch'}, headers=headers)

    with app.app_context():
        assert ProctorEvent.query.filter_by(attempt_id=attempt_id).count() == 3
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.submission_reason == 'manual'


# ── Pre-flight state ───────────────────────────────────────────────────────

def test_start_accepts_and_persists_a_preflight_summary(client):
    headers = student_headers(client)
    exam_id = only_exam_id()

    r = client.post(f'/student/exams/{exam_id}/start', json={'preflight': {
        'camera': 'denied', 'fullscreen': True, 'proctored': False,
        'unproctoredReason': 'camera_denied', 'deviceType': 'laptop',
        'ignored': 'nope',
    }}, headers=headers)
    assert r.status_code == 200

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        state = json.loads(attempt.proctoring_state)
        assert state['proctored'] is False
        assert state['unproctoredReason'] == 'camera_denied'
        assert 'ignored' not in state


def test_start_without_a_preflight_still_works(client):
    """Every existing client posts an empty body — the field is additive."""
    headers = student_headers(client)
    exam_id = only_exam_id()

    r = client.post(f'/student/exams/{exam_id}/start', json={}, headers=headers)
    assert r.status_code == 200

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        assert attempt.proctoring_state is None


def test_an_unproctored_attempt_cannot_be_upgraded_on_resume(client):
    """`proctored` is sticky-false: an attempt that ran unproctored for any
    segment is not a proctored attempt, whatever a later resume claims."""
    headers = student_headers(client)
    exam_id = only_exam_id()

    client.post(f'/student/exams/{exam_id}/start', json={'preflight': {
        'camera': 'denied', 'proctored': False, 'unproctoredReason': 'camera_denied',
    }}, headers=headers)
    # Resume, this time with the camera granted.
    client.post(f'/student/exams/{exam_id}/start', json={'preflight': {
        'camera': 'granted', 'proctored': True,
    }}, headers=headers)

    with app.app_context():
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam_id).first()
        state = json.loads(attempt.proctoring_state)
        assert state['proctored'] is False
        assert state['unproctoredReason'] == 'camera_denied'
        assert state['camera'] == 'granted'      # the latest fact is still kept


def test_live_monitor_reports_unproctored_attempts(client):
    headers = student_headers(client)
    exam_id = only_exam_id()
    client.post(f'/student/exams/{exam_id}/start', json={'preflight': {
        'camera': 'denied', 'proctored': False, 'unproctoredReason': 'camera_denied',
    }}, headers=headers)

    body = client.get(f'/admin/exams/{exam_id}/live',
                      headers=admin_headers(client)).get_json()
    assert body['summary']['unproctored'] == 1
    assert body['students'][0]['proctored'] is False
    assert body['students'][0]['unproctored_reason'] == 'camera_denied'
