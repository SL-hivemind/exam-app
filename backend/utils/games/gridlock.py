"""Gridlock — fill the blanks so every row and column hits its target.

An N x N grid of digits 1-9. Every row carries a sum target and every column
carries a sum target (the harder band turns exactly one column into a product,
which constrains far more sharply than a sum and is what separates the bands).
Some cells are blanked; the student fills them back in.

The whole puzzle rests on one property: **the blanked grid must have exactly
one solution.** A grid with two solutions is not a puzzle, it is a guess, and
on a shared daily leaderboard it would hand a faster time to whoever guessed
luckier. So blanks are removed one at a time and a cell is only kept blank if
the puzzle is *still* uniquely solvable — starting from the full grid (trivially
unique) and never leaving that state. That is why generation cannot simply
blank N random cells.

Counting solutions by brute force over every blank would be 9^blanks. Instead
`_count_solutions` enumerates one row at a time (capped at 3 blanks per row, so
at most 9^3 = 729 combinations) and prunes against the column targets after
every row, which keeps a 4x4 generation in the low milliseconds.
"""
import itertools

DIGITS = tuple(range(1, 10))

# Per-row cap on blanks. Also the exponent bound on row enumeration: 9**3.
_MAX_BLANKS_PER_ROW = 3

# `blanks` is the goal, `min_blanks` the floor below which we throw the whole
# grid away and start over — a grid that refuses to give up enough cells while
# staying unique makes for a puzzle that is solved on sight.
BANDS = {
    '6-7': {'size': 3, 'blanks': 4, 'min_blanks': 3, 'product_cols': 0},
    '8-10': {'size': 4, 'blanks': 7, 'min_blanks': 5, 'product_cols': 1},
}

_MAX_GRID_ATTEMPTS = 40


def _product(values):
    total = 1
    for v in values:
        total *= v
    return total


def _count_solutions(size, grid, row_targets, col_targets, col_ops, limit=2):
    """Return up to `limit` solved grids. Caller only ever needs to know
    whether the count is 1, so `limit=2` is enough to prove non-uniqueness."""
    solutions = []
    work = [row[:] for row in grid]

    def columns_feasible(rows_filled):
        """Can the rows still to come possibly complete every column?"""
        for c in range(size):
            values = [work[r][c] for r in range(rows_filled)]
            remaining = size - rows_filled
            target = col_targets[c]

            if col_ops[c] == 'product':
                partial = _product(values)
                if remaining == 0:
                    if partial != target:
                        return False
                else:
                    # Remaining digits multiply the partial up to the target,
                    # so the partial must divide it and the quotient must be
                    # reachable with `remaining` digits of at most 9.
                    if partial == 0 or target % partial:
                        return False
                    quotient = target // partial
                    if quotient < 1 or quotient > 9 ** remaining:
                        return False
            else:
                partial = sum(values)
                if remaining == 0:
                    if partial != target:
                        return False
                elif not (partial + remaining <= target <= partial + 9 * remaining):
                    return False
        return True

    def fill_row(r):
        if len(solutions) >= limit:
            return
        if r == size:
            solutions.append([row[:] for row in work])
            return

        blanks = [c for c in range(size) if grid[r][c] is None]
        known = sum(grid[r][c] for c in range(size) if grid[r][c] is not None)
        needed = row_targets[r] - known

        if not blanks:
            if needed == 0 and columns_feasible(r + 1):
                fill_row(r + 1)
            return

        for combo in itertools.product(DIGITS, repeat=len(blanks)):
            if sum(combo) != needed:
                continue
            for c, value in zip(blanks, combo):
                work[r][c] = value
            if columns_feasible(r + 1):
                fill_row(r + 1)
            if len(solutions) >= limit:
                break
        for c in blanks:
            work[r][c] = None

    fill_row(0)
    return solutions


def generate(rng, band):
    cfg = BANDS[band]
    size = cfg['size']

    for _ in range(_MAX_GRID_ATTEMPTS):
        solved = [[rng.randint(1, 9) for _ in range(size)] for _ in range(size)]

        col_ops = ['sum'] * size
        if cfg['product_cols']:
            for c in rng.sample(range(size), cfg['product_cols']):
                col_ops[c] = 'product'

        row_targets = [sum(row) for row in solved]
        col_targets = []
        for c in range(size):
            column = [solved[r][c] for r in range(size)]
            col_targets.append(_product(column) if col_ops[c] == 'product' else sum(column))

        grid = [row[:] for row in solved]
        per_row = [0] * size
        cells = [(r, c) for r in range(size) for c in range(size)]
        rng.shuffle(cells)

        blanked = 0
        for r, c in cells:
            if blanked >= cfg['blanks']:
                break
            if per_row[r] >= _MAX_BLANKS_PER_ROW:
                continue
            grid[r][c] = None
            if len(_count_solutions(size, grid, row_targets, col_targets, col_ops)) == 1:
                per_row[r] += 1
                blanked += 1
            else:
                grid[r][c] = solved[r][c]

        if blanked < cfg['min_blanks']:
            continue

        payload = {
            'size': size,
            'grid': grid,
            'row_targets': row_targets,
            'col_targets': col_targets,
            'col_ops': col_ops,
            'blanks': [[r, c] for r in range(size) for c in range(size) if grid[r][c] is None],
        }
        return payload, {'grid': solved}

    raise RuntimeError(f'gridlock: no uniquely-solvable grid for band {band}')


def _submitted_grid(payload, submission):
    """Normalise a submitted grid, keeping the given cells authoritative."""
    size = payload['size']
    raw = (submission or {}).get('grid') or []
    grid = []
    for r in range(size):
        row = []
        source = raw[r] if r < len(raw) and isinstance(raw[r], list) else []
        for c in range(size):
            given = payload['grid'][r][c]
            if given is not None:
                row.append(given)
                continue
            value = source[c] if c < len(source) else None
            try:
                row.append(int(value))
            except (TypeError, ValueError):
                row.append(None)
        grid.append(row)
    return grid


def grade(payload, solution, submission):
    grid = _submitted_grid(payload, submission)
    wrong = [
        [r, c] for r, c in (tuple(b) for b in payload['blanks'])
        if grid[r][c] != solution['grid'][r][c]
    ]
    filled = sum(1 for r, c in (tuple(b) for b in payload['blanks']) if grid[r][c] is not None)
    return not wrong, {
        'filled': filled,
        'total': len(payload['blanks']),
        'wrong_cells': wrong,
    }


def hint(payload, solution, state):
    """Reveal one blank the student has not yet filled correctly."""
    grid = _submitted_grid(payload, state)
    for r, c in (tuple(b) for b in payload['blanks']):
        if grid[r][c] != solution['grid'][r][c]:
            return {'kind': 'cell', 'row': r, 'col': c, 'value': solution['grid'][r][c]}
    return None
