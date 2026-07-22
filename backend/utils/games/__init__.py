"""Daily puzzle generators for the school games section.

Everything in this package is pure Python — no Flask, no database, no clock.
A puzzle is a deterministic function of `(game_key, band, date)`, which is the
property the whole feature rests on: every student in a band opens the *same*
puzzle on a given day, so ranking them by solve time is fair. It also means
nothing has to be authored or uploaded daily, and a server restart regenerates
the identical puzzle rather than handing someone a fresh one.

Each game module implements the same three functions, so adding a fourth game
is one new file plus one line in `GAMES`:

    generate(rng, band)                  -> (payload, solution)
    grade(payload, solution, submission) -> (solved, detail)
    hint(payload, solution, state)       -> dict | None

`payload` is the only half that may ever reach the browser. `solution` stays
server-side and drives grading and hints — see `routes/game_routes.py`.
"""
import hashlib
import random
import re

from . import gridlock, splice, weave

BANDS = ('6-7', '8-10')

GAMES = {
    'gridlock': {
        'module': gridlock,
        'title': 'Gridlock',
        'tagline': 'Fill the grid so every row and column hits its target.',
        'kind': 'numbers',
    },
    'weave': {
        'module': weave,
        'title': 'Weave',
        'tagline': 'Rotate the tiles until everything connects as one network.',
        'kind': 'shapes',
    },
    'splice': {
        'module': splice,
        'title': 'Splice',
        'tagline': 'Recombine the fragments into four words.',
        'kind': 'words',
    },
}

# Hints stay useful but must not be a way to grind out a top time for free.
MAX_HINTS = 3
HINT_PENALTY_SECONDS = 30

_CLASS_DIGITS = re.compile(r'\d+')


def band_for_class(class_number):
    """Map a student's class to a difficulty band, or None if out of range.

    `Student.class_number` is a single-valued `String(50)` ('8', 'Class 8',
    'VIII' would not parse and is treated as out of range). This is *not* the
    comma-separated `QuestionRepository.class_number` that
    `utils.scope.csv_contains` exists to handle — no CSV parsing belongs here.
    """
    if class_number is None:
        return None
    match = _CLASS_DIGITS.search(str(class_number))
    if not match:
        return None
    number = int(match.group())
    if 6 <= number <= 7:
        return '6-7'
    if 8 <= number <= 10:
        return '8-10'
    return None


def seed_for(game_key, band, puzzle_date, salt=''):
    """Stable seed. Same inputs -> same puzzle, on any machine.

    Masked to 63 bits so it fits a *signed* BIGINT: both MySQL and SQLite cap
    at 2**63-1, and the full 64-bit digest overflows the `game_puzzles.seed`
    column on insert.
    """
    material = f'{salt}|{game_key}|{band}|{puzzle_date.isoformat()}'
    digest = hashlib.sha256(material.encode('utf-8')).digest()
    return int.from_bytes(digest[:8], 'big') & ((1 << 63) - 1)


def generate(game_key, band, seed):
    if game_key not in GAMES:
        raise KeyError(f'unknown game: {game_key}')
    if band not in BANDS:
        raise KeyError(f'unknown band: {band}')
    return GAMES[game_key]['module'].generate(random.Random(seed), band)


def grade(game_key, payload, solution, submission):
    return GAMES[game_key]['module'].grade(payload, solution, submission)


def hint(game_key, payload, solution, state):
    return GAMES[game_key]['module'].hint(payload, solution, state)


def catalog():
    """Game metadata safe to serialise to students (no module references)."""
    return [
        {'key': key, 'title': meta['title'], 'tagline': meta['tagline'], 'kind': meta['kind']}
        for key, meta in GAMES.items()
    ]
