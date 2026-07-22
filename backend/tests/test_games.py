"""Daily puzzle games: generator quality, then the guarantees the routes make.

The generator tests are the ones that matter most. A puzzle with two solutions
or an ambiguous fragment pool is not merely a bad puzzle — because every
student in a band shares one puzzle and is ranked by solve time, it silently
rewards whoever guessed luckier.
"""
import datetime
import json

import pytest

from app import app, db
from models import GamePlay, GamePuzzle, School, Student, User
from utils import games as game_engine
from utils.games import gridlock, splice
from utils.games.wordlists import WORDLISTS

# Enough days to cover the generator's retry paths without a slow suite.
SAMPLE_DAYS = 60
DAY_ZERO = datetime.date(2026, 1, 1)


def _dates(n=SAMPLE_DAYS):
    return [DAY_ZERO + datetime.timedelta(days=i) for i in range(n)]


# ═══════════════════════════════════════════════════════════
# GENERATORS (no database, no Flask)
# ═══════════════════════════════════════════════════════════

def test_seed_is_deterministic_and_distinct():
    d = datetime.date(2026, 3, 15)
    assert game_engine.seed_for('weave', '6-7', d) == game_engine.seed_for('weave', '6-7', d)
    # Different game, band or day must not collide.
    seeds = {
        game_engine.seed_for(k, b, day)
        for k in game_engine.GAMES for b in game_engine.BANDS
        for day in _dates(10)
    }
    assert len(seeds) == len(game_engine.GAMES) * len(game_engine.BANDS) * 10


@pytest.mark.parametrize('game_key', sorted(game_engine.GAMES))
@pytest.mark.parametrize('band', game_engine.BANDS)
def test_same_day_generates_identical_puzzle(game_key, band):
    """The whole leaderboard rests on this: one puzzle per band per day."""
    d = datetime.date(2026, 3, 15)
    seed = game_engine.seed_for(game_key, band, d)
    first, _ = game_engine.generate(game_key, band, seed)
    second, _ = game_engine.generate(game_key, band, seed)
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)


@pytest.mark.parametrize('band', game_engine.BANDS)
def test_gridlock_has_exactly_one_solution(band):
    for d in _dates():
        payload, solution = game_engine.generate(
            'gridlock', band, game_engine.seed_for('gridlock', band, d))
        found = gridlock._count_solutions(
            payload['size'], payload['grid'], payload['row_targets'],
            payload['col_targets'], payload['col_ops'], limit=3)
        assert len(found) == 1, f'gridlock {band} {d} has {len(found)} solutions'
        assert found[0] == solution['grid']


@pytest.mark.parametrize('band', game_engine.BANDS)
def test_gridlock_blanks_are_meaningful(band):
    cfg = gridlock.BANDS[band]
    for d in _dates(20):
        payload, _ = game_engine.generate(
            'gridlock', band, game_engine.seed_for('gridlock', band, d))
        assert len(payload['blanks']) >= cfg['min_blanks']
        # A row must never exceed the enumeration cap the solver relies on.
        for r in range(payload['size']):
            blanks_in_row = sum(1 for br, _ in payload['blanks'] if br == r)
            assert blanks_in_row <= gridlock._MAX_BLANKS_PER_ROW


@pytest.mark.parametrize('band', game_engine.BANDS)
def test_weave_is_solvable_and_starts_unsolved(band):
    for d in _dates():
        payload, solution = game_engine.generate(
            'weave', band, game_engine.seed_for('weave', band, d))
        solved, _ = game_engine.grade('weave', payload, solution,
                                      {'rotations': solution['rotations']})
        assert solved, f'weave {band} {d}: stored solution rejected'
        # An unscrambled puzzle would be a zero-second win for whoever opened it.
        untouched, _ = game_engine.grade('weave', payload, solution,
                                         {'rotations': [0] * len(payload['tiles'])})
        assert not untouched, f'weave {band} {d}: starts already solved'
        assert all(t != 0 for t in payload['tiles']), 'isolated tile'


def test_weave_accepts_a_valid_alternative_arrangement():
    """Grading is by property, not equality — a different-but-correct network
    must pass, or students get marked wrong for a real solution."""
    payload, solution = game_engine.generate('weave', '6-7', 12345)
    # Rotating every tile a full turn is the same network, expressed differently.
    alt = [(r + 4) % 4 for r in solution['rotations']]
    solved, _ = game_engine.grade('weave', payload, solution, {'rotations': alt})
    assert solved


def test_splice_wordlists_reassemble():
    for band, entries in WORDLISTS.items():
        assert len(entries) >= 50, f'{band} list too small for daily variety'
        for word, fragments, category in entries:
            assert ''.join(fragments) == word, f'{band}: {fragments} != {word}'
            assert all(len(f) >= 2 for f in fragments), f'{band}: {word} has a 1-letter fragment'
            assert word.isalpha() and word.isupper()
            assert category


@pytest.mark.parametrize('band', game_engine.BANDS)
def test_splice_draws_are_unambiguous(band):
    entries = WORDLISTS[band]
    for d in _dates():
        payload, solution = game_engine.generate(
            'splice', band, game_engine.seed_for('splice', band, d))
        fragments = payload['fragments']
        # Two identical tiles in a pool of eight is a trap, not a challenge.
        assert len(set(fragments)) == len(fragments), f'splice {band} {d}: duplicate fragment'
        # A stowaway word would be an equally valid answer graded as wrong.
        assert not splice._forms_other_word(fragments, set(solution['words']), entries), \
            f'splice {band} {d}: pool also spells an unchosen word'
        assert len(solution['words']) == 4
        assert len(payload['slots']) == 4


@pytest.mark.parametrize('game_key', sorted(game_engine.GAMES))
@pytest.mark.parametrize('band', game_engine.BANDS)
def test_solution_grades_as_solved(game_key, band):
    payload, solution = game_engine.generate(
        game_key, band, game_engine.seed_for(game_key, band, DAY_ZERO))
    submissions = {
        'gridlock': {'grid': solution.get('grid')},
        'weave': {'rotations': solution.get('rotations')},
        'splice': {'words': solution.get('words')},
    }
    solved, _ = game_engine.grade(game_key, payload, solution, submissions[game_key])
    assert solved


@pytest.mark.parametrize('game_key', sorted(game_engine.GAMES))
def test_grade_survives_junk_submissions(game_key):
    """Students disconnect mid-move and clients send half-built boards."""
    payload, solution = game_engine.generate(
        game_key, '8-10', game_engine.seed_for(game_key, '8-10', DAY_ZERO))
    for junk in ({}, {'grid': None}, {'rotations': 'nonsense'}, {'words': [None]},
                 {'grid': [[]]}, {'rotations': [99] * 40}):
        solved, detail = game_engine.grade(game_key, payload, solution, junk)
        assert solved is False
        assert isinstance(detail, dict)


@pytest.mark.parametrize('game_key', sorted(game_engine.GAMES))
def test_hints_eventually_complete_the_puzzle(game_key):
    """Every hint must make real progress, or a hint could be bought for nothing."""
    payload, solution = game_engine.generate(
        game_key, '6-7', game_engine.seed_for(game_key, '6-7', DAY_ZERO))
    state = {}
    for _ in range(200):
        result = game_engine.hint(game_key, payload, solution, state)
        if result is None:
            break
        if game_key == 'gridlock':
            grid = state.setdefault('grid', [[None] * payload['size'] for _ in range(payload['size'])])
            grid[result['row']][result['col']] = result['value']
        elif game_key == 'weave':
            rotations = state.setdefault('rotations', [0] * len(payload['tiles']))
            rotations[result['index']] = result['rotation']
        else:
            words = state.setdefault('words', [])
            nxt = next(w for w in solution['words'] if w not in words)
            words.append(nxt)
    else:
        pytest.fail(f'{game_key}: hints never exhausted')
    assert game_engine.grade(game_key, payload, solution, state)[0]


def test_band_for_class_covers_only_six_to_ten():
    assert game_engine.band_for_class('6') == '6-7'
    assert game_engine.band_for_class('7') == '6-7'
    assert game_engine.band_for_class('8') == '8-10'
    assert game_engine.band_for_class('10') == '8-10'
    for out_of_range in ('1', '5', '11', '12', None, '', 'VIII', 'nursery'):
        assert game_engine.band_for_class(out_of_range) is None


def test_catalog_never_leaks_module_objects():
    """catalog() feeds a JSON response; a module object would 500 the endpoint."""
    for entry in game_engine.catalog():
        assert 'module' not in entry
        json.dumps(entry)


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

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
        other = School(name='Other School', code='OTH', created_by=admin.id)
        db.session.add_all([school, other])
        db.session.commit()

        # Eight class-8 students at one school (enough to clear the privacy
        # floor), one class-6, one class-12, one at a second school.
        specs = [(f'kid{i}', '8', school.id) for i in range(1, 9)]
        specs += [('junior', '6', school.id), ('senior', '12', school.id),
                  ('kidother', '8', other.id)]
        for idx, (name, class_number, school_id) in enumerate(specs, start=1):
            user = User(username=name, role='student', school_id=school_id)
            user.set_password('kidpass123')
            db.session.add(user)
            db.session.commit()
            db.session.add(Student(
                user_id=user.id, student_id=f'STU{idx:05d}', number=str(idx),
                class_number=class_number, school_id=school_id,
            ))
        db.session.commit()

    with app.test_client() as test_client:
        yield test_client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def login_headers(client, username, password='kidpass123'):
    resp = client.post('/login', json={'username': username, 'password': password})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def solve_payload(game_key, solution):
    return {
        'gridlock': {'grid': solution.get('grid')},
        'weave': {'rotations': solution.get('rotations')},
        'splice': {'words': solution.get('words')},
    }[game_key]


def stored_solution(game_key, band='8-10'):
    with app.app_context():
        puzzle = GamePuzzle.query.filter_by(game_key=game_key, band=band).first()
        return json.loads(puzzle.solution_json)


@pytest.mark.parametrize('game_key', sorted(game_engine.GAMES))
def test_start_never_leaks_the_solution(client, game_key):
    """The single most important route guarantee in the feature."""
    headers = login_headers(client, 'kid1')
    resp = client.post(f'/student/games/{game_key}/start', headers=headers)
    assert resp.status_code == 200

    body = resp.get_json()
    raw = json.dumps(body)
    assert 'solution' not in body
    assert 'solution_json' not in raw

    truth = stored_solution(game_key)
    if game_key == 'gridlock':
        # The filled grid must not appear anywhere in the response.
        assert json.dumps(truth['grid']) not in raw
        # Blanks really are blank.
        assert any(cell is None for row in body['puzzle']['grid'] for cell in row)
    elif game_key == 'weave':
        assert json.dumps(truth['rotations']) not in raw
    else:
        for word in truth['words']:
            assert word not in raw


def test_everyone_in_a_band_gets_the_same_puzzle(client):
    """If this fails the leaderboard is meaningless."""
    first = client.post('/student/games/weave/start', headers=login_headers(client, 'kid1'))
    second = client.post('/student/games/weave/start', headers=login_headers(client, 'kid2'))
    assert first.get_json()['puzzle'] == second.get_json()['puzzle']

    # A different band must NOT get that same puzzle.
    junior = client.post('/student/games/weave/start', headers=login_headers(client, 'junior'))
    assert junior.get_json()['band'] == '6-7'
    assert junior.get_json()['puzzle'] != first.get_json()['puzzle']


def test_restarting_resumes_rather_than_rerolling(client):
    headers = login_headers(client, 'kid1')
    first = client.post('/student/games/gridlock/start', headers=headers).get_json()
    client.post('/student/games/gridlock/state', json={'state': {'grid': [[1]]}}, headers=headers)
    second = client.post('/student/games/gridlock/start', headers=headers).get_json()

    assert first['play']['id'] == second['play']['id']
    assert second['state'] == {'grid': [[1]]}
    with app.app_context():
        assert GamePlay.query.count() == 1


@pytest.mark.parametrize('game_key', sorted(game_engine.GAMES))
def test_solve_flow_sets_streak_and_server_timing(client, game_key):
    headers = login_headers(client, 'kid1')
    client.post(f'/student/games/{game_key}/start', headers=headers)

    resp = client.post(
        f'/student/games/{game_key}/submit',
        json={'submission': solve_payload(game_key, stored_solution(game_key)),
              # A forged client time must be ignored entirely. The sentinel is
              # 11-plus days so it cannot collide with a real elapsed time the
              # way a small number would.
              'elapsed_ms': 999_999_999},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['solved'] is True
    assert body['streak']['current_streak'] == 1

    with app.app_context():
        play = GamePlay.query.first()
        assert play.solved is True
        assert play.elapsed_ms != 999_999_999
        assert 0 <= play.elapsed_ms < 60_000
        # Server-derived, so it must match started_at, not the request body.
        expected = (play.completed_at - play.started_at).total_seconds() * 1000
        assert abs(play.elapsed_ms - expected) < 1000


def test_elapsed_is_never_negative(client):
    """Regression: MySQL DATETIME without precision rounds to whole seconds, so
    a play started at .650 is stored as the next second and a fast solve
    computed a negative elapsed — which sorts as the fastest run of the day.
    Sqlite keeps microseconds and cannot reproduce it, so the clock is pushed
    backwards here to stand in for that rounding."""
    headers = login_headers(client, 'kid1')
    client.post('/student/games/weave/start', headers=headers)

    with app.app_context():
        play = GamePlay.query.first()
        play.started_at = play.started_at + datetime.timedelta(seconds=5)
        db.session.commit()

    resp = client.post('/student/games/weave/submit',
                       json={'submission': solve_payload('weave', stored_solution('weave'))},
                       headers=headers)
    assert resp.get_json()['solved'] is True

    with app.app_context():
        play = GamePlay.query.first()
        assert play.elapsed_ms == 0, f'negative elapsed leaked through: {play.elapsed_ms}'
        assert play.ranking_ms >= 0


def test_wrong_answer_keeps_the_game_open(client):
    headers = login_headers(client, 'kid1')
    client.post('/student/games/splice/start', headers=headers)

    resp = client.post('/student/games/splice/submit',
                       json={'submission': {'words': ['NOPE']}}, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['solved'] is False

    # Still open, so the correct answer is still accepted.
    good = client.post('/student/games/splice/submit',
                       json={'submission': solve_payload('splice', stored_solution('splice'))},
                       headers=headers)
    assert good.get_json()['solved'] is True

    # But a second submission after finishing is refused.
    again = client.post('/student/games/splice/submit',
                        json={'submission': {'words': []}}, headers=headers)
    assert again.status_code == 400


def test_hints_are_capped_and_recorded(client):
    headers = login_headers(client, 'kid1')
    client.post('/student/games/gridlock/start', headers=headers)

    for i in range(game_engine.MAX_HINTS):
        resp = client.post('/student/games/gridlock/hint', json={'state': {}}, headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()['hints_used'] == i + 1

    exhausted = client.post('/student/games/gridlock/hint', json={'state': {}}, headers=headers)
    assert exhausted.status_code == 400
    assert exhausted.get_json()['code'] == 'NO_HINTS_LEFT'


def test_reveal_keeps_streak_but_leaves_the_rankings(client):
    headers = login_headers(client, 'kid1')
    client.post('/student/games/weave/start', headers=headers)

    resp = client.post('/student/games/weave/reveal', headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['ranked'] is False
    assert body['solution']
    assert body['streak']['current_streak'] == 1

    with app.app_context():
        play = GamePlay.query.first()
        assert play.revealed is True
        assert play.solved is False
        # Excluded from standings, which is what ranking_ms encodes.
        assert play.ranking_ms is None


def test_standings_withhold_percentile_below_the_privacy_floor(client):
    """Three solvers in a class must not produce 'top 33%'."""
    for name in ('kid1', 'kid2', 'kid3'):
        headers = login_headers(client, name)
        client.post('/student/games/splice/start', headers=headers)
        client.post('/student/games/splice/submit',
                    json={'submission': solve_payload('splice', stored_solution('splice'))},
                    headers=headers)

    resp = client.get('/student/games/splice/standings', headers=login_headers(client, 'kid1'))
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['scopes']['class']['available'] is False
    assert body['scopes']['class']['percentile'] is None
    assert body['headline'] is None
    assert body['scopes']['class']['solvers'] == 3


def test_standings_report_a_band_once_the_cohort_is_big_enough(client):
    solution = None
    for name in (f'kid{i}' for i in range(1, 9)):
        headers = login_headers(client, name)
        client.post('/student/games/splice/start', headers=headers)
        solution = solution or stored_solution('splice')
        client.post('/student/games/splice/submit',
                    json={'submission': solve_payload('splice', solution)}, headers=headers)

    resp = client.get('/student/games/splice/standings', headers=login_headers(client, 'kid1'))
    body = resp.get_json()

    assert body['scopes']['class']['available'] is True
    assert body['scopes']['class']['solvers'] == 8
    assert body['scopes']['class']['band_label']
    assert 1 <= body['scopes']['class']['top_percent'] <= 100
    assert body['headline']['scope'] == 'class'

    # No student identifier may appear anywhere in a standings response.
    raw = json.dumps(body)
    for name in (f'kid{i}' for i in range(1, 9)):
        assert name not in raw
    assert 'username' not in raw and 'student_id' not in raw


def test_other_schools_do_not_enter_the_class_cohort(client):
    for name in ('kid1', 'kidother'):
        headers = login_headers(client, name)
        client.post('/student/games/weave/start', headers=headers)
        client.post('/student/games/weave/submit',
                    json={'submission': solve_payload('weave', stored_solution('weave'))},
                    headers=headers)

    body = client.get('/student/games/weave/standings',
                      headers=login_headers(client, 'kid1')).get_json()
    assert body['scopes']['class']['players'] == 1
    assert body['scopes']['school']['players'] == 1
    assert body['scopes']['overall']['players'] == 2


def test_classes_outside_six_to_ten_get_no_games(client):
    for name in ('senior',):
        headers = login_headers(client, name)
        listing = client.get('/student/games', headers=headers).get_json()
        assert listing['enabled'] is False
        assert listing['code'] == 'OUT_OF_BAND'
        assert listing['games'] == []
        assert client.post('/student/games/weave/start', headers=headers).status_code == 403


def test_school_toggle_hides_games(client):
    admin = login_headers(client, 'admin', 'adminpass123')
    with app.app_context():
        school_id = School.query.filter_by(code='TST').first().id

    resp = client.patch(f'/admin/schools/{school_id}/games',
                        json={'enabled': False}, headers=admin)
    assert resp.status_code == 200
    assert resp.get_json()['games_enabled'] is False

    headers = login_headers(client, 'kid1')
    assert client.get('/student/games', headers=headers).get_json()['enabled'] is False
    assert client.post('/student/games/weave/start', headers=headers).status_code == 403


def test_games_listing_reports_status_per_game(client):
    headers = login_headers(client, 'kid1')
    listing = client.get('/student/games', headers=headers).get_json()
    assert listing['enabled'] is True
    assert listing['band'] == '8-10'
    assert {g['key'] for g in listing['games']} == set(game_engine.GAMES)
    assert all(g['status'] == 'not_started' for g in listing['games'])

    client.post('/student/games/weave/start', headers=headers)
    client.post('/student/games/weave/submit',
                json={'submission': solve_payload('weave', stored_solution('weave'))},
                headers=headers)

    listing = client.get('/student/games', headers=headers).get_json()
    statuses = {g['key']: g['status'] for g in listing['games']}
    assert statuses['weave'] == 'solved'
    assert statuses['gridlock'] == 'not_started'
    assert listing['streak']['current_streak'] == 1
    assert listing['streak']['total_solved'] == 1


def test_admin_overview_and_preview(client):
    headers = login_headers(client, 'kid1')
    client.post('/student/games/gridlock/start', headers=headers)
    client.post('/student/games/gridlock/submit',
                json={'submission': solve_payload('gridlock', stored_solution('gridlock'))},
                headers=headers)

    admin = login_headers(client, 'admin', 'adminpass123')
    overview = client.get('/admin/games/overview', headers=admin).get_json()
    row = next(r for r in overview['games'] if r['game_key'] == 'gridlock')
    assert row['players'] == 1 and row['solved'] == 1 and row['solve_rate'] == 100
    assert any(c['class_number'] == '8' for c in overview['by_class'])

    preview = client.get('/admin/games/gridlock/preview?band=8-10', headers=admin).get_json()
    assert preview['solution']            # admins DO see solutions
    assert preview['persisted'] is True


def test_reroll_is_refused_once_students_have_played(client):
    headers = login_headers(client, 'kid1')
    client.post('/student/games/weave/start', headers=headers)

    admin = login_headers(client, 'admin', 'adminpass123')
    resp = client.post('/admin/games/weave/reroll', json={'band': '8-10'}, headers=admin)
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'ALREADY_PLAYED'

    forced = client.post('/admin/games/weave/reroll',
                         json={'band': '8-10', 'force': True, 'attempt': 2}, headers=admin)
    assert forced.status_code == 200
    assert forced.get_json()['cleared_plays'] == 1


def test_school_admin_cannot_toggle_another_school(client):
    with app.app_context():
        other_id = School.query.filter_by(code='OTH').first().id
        head = User(username='head', role='school_admin',
                    school_id=School.query.filter_by(code='TST').first().id)
        head.set_password('headpass123')
        db.session.add(head)
        db.session.commit()

    headers = login_headers(client, 'head', 'headpass123')
    assert client.patch(f'/admin/schools/{other_id}/games',
                        json={'enabled': False}, headers=headers).status_code == 403


# ═══════════════════════════════════════════════════════════
# PUBLIC (guest) SET
# ═══════════════════════════════════════════════════════════

def test_public_games_need_no_account(client):
    """The marketing page must work with no token at all."""
    resp = client.get('/public/games')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['enabled'] is True
    assert {g['key'] for g in body['games']} == set(game_engine.GAMES)
    # Guest play is graded in the browser, so the solution has to travel.
    assert all(g.get('puzzle') and g.get('solution') for g in body['games'])


def test_public_games_are_not_the_student_puzzle(client):
    """Otherwise the public page is an answer key for today's ranked puzzle."""
    public = {g['key']: g for g in client.get('/public/games').get_json()['games']}

    headers = login_headers(client, 'kid1')      # class 8 -> band 8-10
    junior = login_headers(client, 'junior')     # class 6 -> band 6-7, the guest band itself
    for game_key in game_engine.GAMES:
        for who in (headers, junior):
            started = client.post(f'/student/games/{game_key}/start', headers=who).get_json()
            assert started['puzzle'] != public[game_key]['puzzle'], game_key


def test_public_games_write_nothing(client):
    with app.app_context():
        before = (GamePuzzle.query.count(), GamePlay.query.count())

    client.get('/public/games')
    client.get('/public/games')

    with app.app_context():
        assert (GamePuzzle.query.count(), GamePlay.query.count()) == before


def test_public_games_are_stable_within_a_day(client):
    first = client.get('/public/games').get_json()['games']
    second = client.get('/public/games').get_json()['games']
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)
