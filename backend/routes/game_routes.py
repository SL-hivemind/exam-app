"""Daily puzzle games for school students: play, hints, standings, admin.

Three rules shape everything in this file:

1. **The solution never leaves the server.** `/start` serialises only
   `payload_json`; grading, hints and reveals are all computed here. This
   mirrors how `utils/grading.py:sanitize_content` keeps answer keys away from
   exam questions.

2. **Time is measured server-side.** `elapsed_ms` comes from the stored
   `started_at`, never from the client. A student can freely edit their own
   timer display and it will not move their rank.

3. **Standings are percentile bands, never names.** No endpoint here has a
   response shape that could carry a student identifier, and cohorts below
   `PRIVACY_FLOOR` report no percentile at all — in a class where three
   students played, "top 33%" identifies a specific child.
"""
import json
import os
from datetime import date, datetime, timedelta

from flask import jsonify, request
from sqlalchemy.exc import IntegrityError

from models import GamePlay, GameProfile, GamePuzzle, School, Student, db
from utils import games as game_engine
from utils.games import HINT_PENALTY_SECONDS, MAX_HINTS
from utils.math_utils import calculate_percentile

# Below this many ranked solvers a cohort reports no percentile and the client
# falls back to a wider scope. See the module docstring.
PRIVACY_FLOOR = 5

# Puzzles roll over at local midnight, not UTC midnight — a UTC day boundary
# would swap the puzzle at 5:30am in the middle of an Indian school morning.
_TZ_OFFSET_MINUTES = int(os.getenv('GAMES_TZ_OFFSET_MINUTES', '330'))  # IST

# Deliberately NOT app.config['SECRET_KEY']: that defaults to a fresh random
# value on every boot (app.py:99), which would regenerate every puzzle on
# restart. The salt only decorrelates the three games from each other — the
# payload is identical for every student by design, so it needs stability,
# not secrecy.
_SALT = os.getenv('GAMES_SALT', 'sl-games-v1')

# The guest set on the marketing site is generated from a *different* salt, and
# that difference is load-bearing: `/public/games` ships the solution to the
# browser so a visitor can play with nothing stored server-side. Sharing a salt
# with the student set would turn the public page into an answer key for the
# puzzle a class is ranked on that same day.
_PUBLIC_SALT = os.getenv('GAMES_PUBLIC_SALT', 'sl-games-public-v1')
_PUBLIC_BAND = '6-7'


def _today():
    return (datetime.utcnow() + timedelta(minutes=_TZ_OFFSET_MINUTES)).date()


def _parse_date(raw, fallback=None):
    if not raw:
        return fallback or _today()
    try:
        return date.fromisoformat(str(raw))
    except (TypeError, ValueError):
        return fallback or _today()


def _games_globally_enabled():
    return os.getenv('GAMES_ENABLED', '1') != '0'


def register_game_routes(app, role_required):

    # ═══════════════════════════════════════════════════════════
    # HELPERS
    # ═══════════════════════════════════════════════════════════

    def _student_context(current_user):
        """Return (student, band, error_response). Games are offered only to
        classes 6-10, at schools that have not switched them off."""
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return None, None, (jsonify({'message': 'student profile not found'}), 400)

        if not _games_globally_enabled():
            return student, None, (jsonify({'message': 'Games are currently unavailable.',
                                            'code': 'GAMES_DISABLED'}), 403)

        school = School.query.get(student.school_id) if student.school_id else None
        if school is not None and school.games_enabled is False:
            return student, None, (jsonify({'message': 'Games are switched off for your school.',
                                            'code': 'GAMES_DISABLED'}), 403)

        band = game_engine.band_for_class(student.class_number)
        if not band:
            return student, None, (jsonify({'message': 'Games are available for classes 6 to 10.',
                                            'code': 'OUT_OF_BAND'}), 403)
        return student, band, None

    def _get_or_create_puzzle(game_key, band, puzzle_date):
        """Lazily generate the day's puzzle. No scheduler involved — the first
        student to open a game creates it, and everyone after shares the row."""
        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=puzzle_date
        ).first()
        if puzzle:
            return puzzle

        seed = game_engine.seed_for(game_key, band, puzzle_date, _SALT)
        payload, solution = game_engine.generate(game_key, band, seed)
        puzzle = GamePuzzle(
            game_key=game_key, band=band, puzzle_date=puzzle_date, seed=seed,
            payload_json=json.dumps(payload), solution_json=json.dumps(solution),
        )
        db.session.add(puzzle)
        try:
            db.session.commit()
        except IntegrityError:
            # Two students opened the same game in the same instant; the
            # unique constraint decided which row wins and both get that one.
            db.session.rollback()
            puzzle = GamePuzzle.query.filter_by(
                game_key=game_key, band=band, puzzle_date=puzzle_date
            ).first()
        return puzzle

    def _get_or_create_play(puzzle, student):
        play = GamePlay.query.filter_by(
            puzzle_id=puzzle.id, student_user_id=student.user_id
        ).first()
        if play:
            return play

        play = GamePlay(
            puzzle_id=puzzle.id, student_user_id=student.user_id,
            school_id=student.school_id, class_number=student.class_number,
            started_at=datetime.utcnow(),
        )
        db.session.add(play)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            play = GamePlay.query.filter_by(
                puzzle_id=puzzle.id, student_user_id=student.user_id
            ).first()
        return play

    def _elapsed_ms(play, now):
        """Server-side elapsed, never negative.

        `started_at` round-trips through the database, so its stored precision
        bounds this: on a MySQL column without sub-second precision it rounds
        to the nearest second and a quick solve lands *before* its own start.
        The migration widens those columns to DATETIME(3), and this floor keeps
        a negative — which would rank as the fastest run of the day — from ever
        reaching the leaderboard if a clock shifts or an older row survives.
        """
        return max(0, int((now - play.started_at).total_seconds() * 1000))

    def _profile_for(student):
        profile = GameProfile.query.get(student.user_id)
        if not profile:
            profile = GameProfile(student_user_id=student.user_id)
            db.session.add(profile)
        return profile

    def _advance_streak(profile, today, solved):
        """A day counts once, whether the student finished one game or three."""
        if profile.last_played_date != today:
            if profile.last_played_date == today - timedelta(days=1):
                profile.current_streak = (profile.current_streak or 0) + 1
            else:
                profile.current_streak = 1
            profile.last_played_date = today
        profile.longest_streak = max(profile.longest_streak or 0, profile.current_streak or 0)
        if solved:
            profile.total_solved = (profile.total_solved or 0) + 1

    def _band_label(top_percent):
        for threshold, label in ((1, 'Top 1%'), (5, 'Top 5%'), (10, 'Top 10%'),
                                 (25, 'Top 25%'), (50, 'Top 50%')):
            if top_percent <= threshold:
                return label
        return 'Finisher'

    def _scope_summary(cohort, play):
        """Percentile band for one cohort, or nothing if the cohort is too small."""
        ranked = [p for p in cohort if p.ranking_ms is not None]
        players = len(cohort)
        solvers = len(ranked)
        solve_rate = round(solvers / players * 100) if players else 0

        summary = {
            'players': players,
            'solvers': solvers,
            'solve_rate': solve_rate,
            'percentile': None,
            'band_label': None,
            'available': False,
        }

        mine = play.ranking_ms if play else None
        if mine is None or solvers < PRIVACY_FLOOR:
            return summary

        # calculate_percentile ranks "higher is better", so times are negated:
        # a faster solve becomes a larger score. Its midrank handling keeps
        # students who tie on time from leapfrogging each other.
        times = [-p.ranking_ms for p in ranked]
        percentile = calculate_percentile(-mine, times)
        top_percent = max(1, round(100 - (percentile or 0)))

        summary.update({
            'percentile': percentile,
            'top_percent': top_percent,
            'band_label': _band_label(top_percent),
            'available': True,
        })
        return summary

    # ═══════════════════════════════════════════════════════════
    # PUBLIC (no account, nothing stored)
    # ═══════════════════════════════════════════════════════════

    @app.get('/public/games')
    def public_games_list():
        """Today's guest puzzles for the marketing site — try-before-you-signup.

        Three things separate this from the student endpoints and all three are
        intentional:

        * **No auth, no rows.** Nothing is written: no GamePuzzle, no GamePlay,
          no streak. The puzzles are regenerated from their seed on each
          request, which is free because generation is deterministic.
        * **The solution ships to the browser.** With no play row there is
          nothing to grade against server-side, so the client grades locally.
          That is only safe because of the point below.
        * **A separate salt** (`_PUBLIC_SALT`) means these are never the same
          puzzles the student cohort is being ranked on today.
        """
        if not _games_globally_enabled():
            return jsonify({'enabled': False, 'games': []}), 200

        today = _today()
        games = []
        for meta in game_engine.catalog():
            seed = game_engine.seed_for(meta['key'], _PUBLIC_BAND, today, _PUBLIC_SALT)
            payload, solution = game_engine.generate(meta['key'], _PUBLIC_BAND, seed)
            games.append({**meta, 'puzzle': payload, 'solution': solution})

        return jsonify({
            'enabled': True,
            'date': today.isoformat(),
            'band': _PUBLIC_BAND,
            'games': games,
        }), 200

    # ═══════════════════════════════════════════════════════════
    # STUDENT
    # ═══════════════════════════════════════════════════════════

    @app.get('/student/games')
    @role_required('student')
    def student_games_list(current_user):
        student, band, error = _student_context(current_user)
        if error:
            body, status = error
            payload = body.get_json()
            payload['games'] = []
            payload['enabled'] = False
            return jsonify(payload), (200 if payload.get('code') else status)

        today = _today()
        profile = GameProfile.query.get(student.user_id)

        puzzles = {
            p.game_key: p for p in GamePuzzle.query.filter_by(band=band, puzzle_date=today).all()
        }
        plays = {}
        if puzzles:
            rows = GamePlay.query.filter(
                GamePlay.student_user_id == student.user_id,
                GamePlay.puzzle_id.in_([p.id for p in puzzles.values()]),
            ).all()
            by_puzzle = {p.id: p for p in puzzles.values()}
            plays = {by_puzzle[r.puzzle_id].game_key: r for r in rows}

        entries = []
        for meta in game_engine.catalog():
            play = plays.get(meta['key'])
            entries.append({
                **meta,
                'status': ('solved' if play and play.solved
                           else 'revealed' if play and play.revealed
                           else 'in_progress' if play else 'not_started'),
                'elapsed_ms': play.elapsed_ms if play else None,
                'hints_used': play.hints_used if play else 0,
            })

        return jsonify({
            'enabled': True,
            'band': band,
            'date': today.isoformat(),
            'games': entries,
            'streak': (profile.to_dict() if profile else
                       {'current_streak': 0, 'longest_streak': 0, 'total_solved': 0}),
            'max_hints': MAX_HINTS,
            'hint_penalty_seconds': HINT_PENALTY_SECONDS,
        }), 200

    @app.post('/student/games/<game_key>/start')
    @role_required('student')
    def student_game_start(current_user, game_key):
        if game_key not in game_engine.GAMES:
            return jsonify({'message': 'Unknown game'}), 404

        student, band, error = _student_context(current_user)
        if error:
            return error

        today = _today()
        puzzle = _get_or_create_puzzle(game_key, band, today)
        play = _get_or_create_play(puzzle, student)

        # payload_json only — solution_json is never serialised here.
        return jsonify({
            'game': {k: v for k, v in game_engine.GAMES[game_key].items() if k != 'module'},
            'game_key': game_key,
            'date': today.isoformat(),
            'band': band,
            'puzzle': json.loads(puzzle.payload_json),
            'play': play.to_dict(),
            'state': json.loads(play.state_json) if play.state_json else None,
            'max_hints': MAX_HINTS,
            'hint_penalty_seconds': HINT_PENALTY_SECONDS,
            # Elapsed is sent as a duration, not a timestamp: started_at is
            # naive UTC, and a browser would parse that ISO string as local
            # time and skew a resumed timer by the whole UTC offset.
            'elapsed_ms_so_far': (
                play.elapsed_ms if play.completed_at
                else _elapsed_ms(play, datetime.utcnow())
            ),
        }), 200

    @app.post('/student/games/<game_key>/state')
    @role_required('student')
    def student_game_state(current_user, game_key):
        student, band, error = _student_context(current_user)
        if error:
            return error

        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=_today()
        ).first()
        if not puzzle:
            return jsonify({'message': 'No puzzle in progress'}), 404

        play = GamePlay.query.filter_by(
            puzzle_id=puzzle.id, student_user_id=student.user_id
        ).first()
        if not play:
            return jsonify({'message': 'No play in progress'}), 404
        if play.completed_at:
            return jsonify({'message': 'Already finished'}), 200

        play.state_json = json.dumps((request.get_json(silent=True) or {}).get('state') or {})
        db.session.commit()
        return jsonify({'saved': True}), 200

    @app.post('/student/games/<game_key>/hint')
    @role_required('student')
    def student_game_hint(current_user, game_key):
        student, band, error = _student_context(current_user)
        if error:
            return error

        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=_today()
        ).first()
        play = GamePlay.query.filter_by(
            puzzle_id=puzzle.id, student_user_id=student.user_id
        ).first() if puzzle else None
        if not play:
            return jsonify({'message': 'Start the game first'}), 404
        if play.completed_at:
            return jsonify({'message': 'Already finished'}), 400
        if (play.hints_used or 0) >= MAX_HINTS:
            return jsonify({'message': f'All {MAX_HINTS} hints used', 'code': 'NO_HINTS_LEFT'}), 400

        state = (request.get_json(silent=True) or {}).get('state') or {}
        result = game_engine.hint(
            game_key,
            json.loads(puzzle.payload_json),
            json.loads(puzzle.solution_json),
            state,
        )
        if result is None:
            return jsonify({'message': 'Nothing left to hint — submit your answer.'}), 400

        play.hints_used = (play.hints_used or 0) + 1
        play.state_json = json.dumps(state)
        db.session.commit()

        return jsonify({
            'hint': result,
            'hints_used': play.hints_used,
            'hints_left': MAX_HINTS - play.hints_used,
            'penalty_seconds': HINT_PENALTY_SECONDS,
        }), 200

    @app.post('/student/games/<game_key>/reveal')
    @role_required('student')
    def student_game_reveal(current_user, game_key):
        student, band, error = _student_context(current_user)
        if error:
            return error

        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=_today()
        ).first()
        play = GamePlay.query.filter_by(
            puzzle_id=puzzle.id, student_user_id=student.user_id
        ).first() if puzzle else None
        if not play:
            return jsonify({'message': 'Start the game first'}), 404
        if play.completed_at:
            return jsonify({'message': 'Already finished'}), 400

        now = datetime.utcnow()
        play.revealed = True
        play.solved = False
        play.completed_at = now
        play.elapsed_ms = _elapsed_ms(play, now)

        # A reveal keeps the streak alive but never enters the standings — the
        # point of a streak is that a bad day does not cost you weeks of it.
        profile = _profile_for(student)
        _advance_streak(profile, _today(), solved=False)
        db.session.commit()

        return jsonify({
            'solution': json.loads(puzzle.solution_json),
            'play': play.to_dict(),
            'streak': profile.to_dict(),
            'ranked': False,
        }), 200

    @app.post('/student/games/<game_key>/submit')
    @role_required('student')
    def student_game_submit(current_user, game_key):
        student, band, error = _student_context(current_user)
        if error:
            return error

        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=_today()
        ).first()
        play = GamePlay.query.filter_by(
            puzzle_id=puzzle.id, student_user_id=student.user_id
        ).first() if puzzle else None
        if not play:
            return jsonify({'message': 'Start the game first'}), 404
        if play.completed_at:
            return jsonify({'message': 'Already finished', 'play': play.to_dict()}), 400

        submission = (request.get_json(silent=True) or {}).get('submission') or {}
        solved, detail = game_engine.grade(
            game_key,
            json.loads(puzzle.payload_json),
            json.loads(puzzle.solution_json),
            submission,
        )

        play.state_json = json.dumps(submission)
        if not solved:
            # Wrong answers cost only the clock — the student keeps working.
            db.session.commit()
            return jsonify({'solved': False, 'detail': detail, 'play': play.to_dict()}), 200

        now = datetime.utcnow()
        play.solved = True
        play.completed_at = now
        # Server-side elapsed. Anything the client claims is ignored.
        play.elapsed_ms = _elapsed_ms(play, now)

        profile = _profile_for(student)
        _advance_streak(profile, _today(), solved=True)
        db.session.commit()

        return jsonify({
            'solved': True,
            'detail': detail,
            'play': play.to_dict(),
            'ranking_ms': play.ranking_ms,
            'streak': profile.to_dict(),
        }), 200

    @app.get('/student/games/<game_key>/standings')
    @role_required('student')
    def student_game_standings(current_user, game_key):
        student, band, error = _student_context(current_user)
        if error:
            return error

        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=_today()
        ).first()
        if not puzzle:
            return jsonify({'message': 'No puzzle today yet'}), 404

        plays = GamePlay.query.filter_by(puzzle_id=puzzle.id).all()
        mine = next((p for p in plays if p.student_user_id == student.user_id), None)

        # Every play on this puzzle is already the student's own band, so the
        # school and overall scopes need no further band filtering.
        cohorts = {
            'class': [p for p in plays
                      if p.school_id == student.school_id and p.class_number == student.class_number],
            'school': [p for p in plays if p.school_id == student.school_id],
            'overall': plays,
        }
        scopes = {name: _scope_summary(cohort, mine) for name, cohort in cohorts.items()}

        headline = None
        for name in ('class', 'school', 'overall'):
            if scopes[name]['available']:
                headline = {'scope': name, **scopes[name]}
                break

        return jsonify({
            'game_key': game_key,
            'date': puzzle.puzzle_date.isoformat(),
            'scopes': scopes,
            'headline': headline,
            'privacy_floor': PRIVACY_FLOOR,
            'my_play': mine.to_dict() if mine else None,
        }), 200

    # ═══════════════════════════════════════════════════════════
    # ADMIN
    # ═══════════════════════════════════════════════════════════

    @app.get('/admin/games/overview')
    @role_required('admin', 'school_admin')
    def admin_games_overview(current_user):
        target_date = _parse_date(request.args.get('date'))
        scoped_school = current_user.school_id if current_user.role == 'school_admin' else None

        puzzles = GamePuzzle.query.filter_by(puzzle_date=target_date).all()
        puzzle_ids = [p.id for p in puzzles]

        plays = []
        if puzzle_ids:
            query = GamePlay.query.filter(GamePlay.puzzle_id.in_(puzzle_ids))
            if scoped_school:
                query = query.filter(GamePlay.school_id == scoped_school)
            plays = query.all()

        by_puzzle = {}
        for play in plays:
            by_puzzle.setdefault(play.puzzle_id, []).append(play)

        rows = []
        for puzzle in puzzles:
            cohort = by_puzzle.get(puzzle.id, [])
            solved = [p for p in cohort if p.solved and p.elapsed_ms is not None]
            rows.append({
                'game_key': puzzle.game_key,
                'band': puzzle.band,
                'puzzle_id': puzzle.id,
                'players': len(cohort),
                'solved': len(solved),
                'revealed': sum(1 for p in cohort if p.revealed),
                'solve_rate': round(len(solved) / len(cohort) * 100) if cohort else 0,
                'avg_seconds': round(sum(p.elapsed_ms for p in solved) / len(solved) / 1000)
                               if solved else None,
                'avg_hints': round(sum(p.hints_used or 0 for p in cohort) / len(cohort), 1)
                             if cohort else 0,
            })

        # Per-class participation, so a school can see which classes engage.
        by_class = {}
        for play in plays:
            key = play.class_number or 'unknown'
            entry = by_class.setdefault(key, {'class_number': key, 'players': 0, 'solved': 0})
            entry['players'] += 1
            if play.solved:
                entry['solved'] += 1

        schools_query = School.query
        if scoped_school:
            schools_query = schools_query.filter(School.id == scoped_school)

        return jsonify({
            'date': target_date.isoformat(),
            'games': rows,
            'by_class': sorted(by_class.values(), key=lambda x: str(x['class_number'])),
            'schools': [{'id': s.id, 'name': s.name, 'games_enabled': s.games_enabled is not False}
                        for s in schools_query.all()],
            'globally_enabled': _games_globally_enabled(),
            'catalog': game_engine.catalog(),
        }), 200

    @app.get('/admin/games/<game_key>/preview')
    @role_required('admin', 'school_admin')
    def admin_game_preview(current_user, game_key):
        if game_key not in game_engine.GAMES:
            return jsonify({'message': 'Unknown game'}), 404

        band = request.args.get('band', '6-7')
        if band not in game_engine.BANDS:
            return jsonify({'message': 'Unknown band'}), 400
        target_date = _parse_date(request.args.get('date'))

        # Preview must not create the row for a future date, or students would
        # later be served a puzzle an admin had already seen the answer to.
        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=target_date
        ).first()
        if puzzle:
            payload = json.loads(puzzle.payload_json)
            solution = json.loads(puzzle.solution_json)
        else:
            seed = game_engine.seed_for(game_key, band, target_date, _SALT)
            payload, solution = game_engine.generate(game_key, band, seed)

        return jsonify({
            'game_key': game_key,
            'band': band,
            'date': target_date.isoformat(),
            'puzzle': payload,
            'solution': solution,
            'persisted': puzzle is not None,
        }), 200

    @app.post('/admin/games/<game_key>/reroll')
    @role_required('admin')
    def admin_game_reroll(current_user, game_key):
        """Replace today's puzzle if one generated badly.

        Refused once anyone has played it: rerolling under a live cohort would
        hand different students different puzzles on the same leaderboard.
        """
        if game_key not in game_engine.GAMES:
            return jsonify({'message': 'Unknown game'}), 404

        data = request.get_json(silent=True) or {}
        band = data.get('band')
        if band not in game_engine.BANDS:
            return jsonify({'message': 'Unknown band'}), 400
        target_date = _parse_date(data.get('date'))

        puzzle = GamePuzzle.query.filter_by(
            game_key=game_key, band=band, puzzle_date=target_date
        ).first()
        if not puzzle:
            return jsonify({'message': 'No puzzle generated for that day yet'}), 404

        play_count = GamePlay.query.filter_by(puzzle_id=puzzle.id).count()
        if play_count and not data.get('force'):
            return jsonify({
                'message': f'{play_count} student(s) have already played this puzzle. '
                           'Rerolling now would put different puzzles on one leaderboard.',
                'code': 'ALREADY_PLAYED',
                'play_count': play_count,
            }), 409

        # Vary the salt so the same (game, band, date) yields a different grid.
        attempt = int(data.get('attempt') or 1)
        seed = game_engine.seed_for(game_key, band, target_date, f'{_SALT}|reroll{attempt}')
        payload, solution = game_engine.generate(game_key, band, seed)

        GamePlay.query.filter_by(puzzle_id=puzzle.id).delete()
        puzzle.seed = seed
        puzzle.payload_json = json.dumps(payload)
        puzzle.solution_json = json.dumps(solution)
        db.session.commit()

        return jsonify({'rerolled': True, 'puzzle': payload, 'cleared_plays': play_count}), 200

    @app.patch('/admin/schools/<int:school_id>/games')
    @role_required('admin', 'school_admin')
    def admin_toggle_school_games(current_user, school_id):
        if current_user.role == 'school_admin' and current_user.school_id != school_id:
            return jsonify({'message': 'You can only change your own school'}), 403

        school = School.query.get(school_id)
        if not school:
            return jsonify({'message': 'School not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'enabled' not in data:
            return jsonify({'message': 'enabled is required'}), 400

        school.games_enabled = bool(data['enabled'])
        db.session.commit()
        return jsonify({'id': school.id, 'games_enabled': school.games_enabled}), 200
