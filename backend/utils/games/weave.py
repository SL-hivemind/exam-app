"""Weave — rotate every pipe tile until the whole grid is one network.

Each cell holds a tile with openings on some of its four sides. Tapping a tile
turns it a quarter turn. The puzzle is solved when every opening meets an
opening on the neighbouring tile, no opening points off the edge of the grid,
and all cells hang together as a single connected network.

Two design choices worth knowing before changing anything here:

* **Solvable by construction.** The tile shapes are derived from a random
  spanning tree over the grid, so a valid arrangement provably exists and no
  solver is ever needed to check one. Scrambling only rotates tiles, which
  cannot destroy that.

* **Graded by property, not by equality.** A tile grid can have valid
  arrangements other than the one it was generated from (rotate a symmetric
  region, or re-pair identical tiles). Comparing against the stored rotations
  would fail a student who found a different-but-correct answer, so `grade`
  re-derives the three conditions above instead. The stored solution exists
  only to power hints.
"""
from collections import deque

UP, RIGHT, DOWN, LEFT = 1, 2, 4, 8

# Insertion order is relied on for determinism when picking a neighbour.
_DELTA = {UP: (-1, 0), RIGHT: (0, 1), DOWN: (1, 0), LEFT: (0, -1)}
_OPPOSITE = {UP: DOWN, RIGHT: LEFT, DOWN: UP, LEFT: RIGHT}

BANDS = {
    '6-7': {'size': 4},
    '8-10': {'size': 5},
}

_MAX_SCRAMBLE_ATTEMPTS = 20


def rotate(mask, turns):
    """Turn a tile `turns` quarter-turns clockwise (up -> right -> down -> left)."""
    turns %= 4
    for _ in range(turns):
        mask = ((mask << 1) | (mask >> 3)) & 0b1111
    return mask


def _spanning_tree(rng, size):
    """Randomised depth-first spanning tree; returns each cell's opening mask."""
    masks = [[0] * size for _ in range(size)]
    visited = [[False] * size for _ in range(size)]

    start = (rng.randrange(size), rng.randrange(size))
    visited[start[0]][start[1]] = True
    stack = [start]

    while stack:
        r, c = stack[-1]
        options = []
        for direction, (dr, dc) in _DELTA.items():
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size and not visited[nr][nc]:
                options.append((direction, nr, nc))

        if not options:
            stack.pop()
            continue

        direction, nr, nc = options[rng.randrange(len(options))]
        masks[r][c] |= direction
        masks[nr][nc] |= _OPPOSITE[direction]
        visited[nr][nc] = True
        stack.append((nr, nc))

    return masks


def _is_connected_network(size, masks):
    """Every opening matched, none off-grid, and all cells in one component."""
    for r in range(size):
        for c in range(size):
            mask = masks[r][c]
            if mask == 0:
                return False
            for direction, (dr, dc) in _DELTA.items():
                if not mask & direction:
                    continue
                nr, nc = r + dr, c + dc
                if not (0 <= nr < size and 0 <= nc < size):
                    return False
                if not masks[nr][nc] & _OPPOSITE[direction]:
                    return False

    seen = {(0, 0)}
    queue = deque([(0, 0)])
    while queue:
        r, c = queue.popleft()
        for direction, (dr, dc) in _DELTA.items():
            if not masks[r][c] & direction:
                continue
            nxt = (r + dr, c + dc)
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return len(seen) == size * size


def generate(rng, band):
    size = BANDS[band]['size']
    base = _spanning_tree(rng, size)

    for _ in range(_MAX_SCRAMBLE_ATTEMPTS):
        turns = [[rng.randrange(4) for _ in range(size)] for _ in range(size)]
        scrambled = [[rotate(base[r][c], turns[r][c]) for c in range(size)] for r in range(size)]
        # A scramble that happens to land back on a solved network would be a
        # zero-second puzzle for whoever opened it first.
        if not _is_connected_network(size, scrambled):
            break
    else:
        raise RuntimeError(f'weave: could not scramble band {band}')

    payload = {
        'size': size,
        'tiles': [scrambled[r][c] for r in range(size) for c in range(size)],
    }
    # Rotations that undo the scramble, indexed row-major to match `tiles`.
    solution = {
        'rotations': [(4 - turns[r][c]) % 4 for r in range(size) for c in range(size)],
    }
    return payload, solution


def _apply(payload, rotations):
    size = payload['size']
    tiles = payload['tiles']
    grid = []
    for r in range(size):
        row = []
        for c in range(size):
            i = r * size + c
            try:
                turn = int(rotations[i])
            except (TypeError, ValueError, IndexError):
                turn = 0
            row.append(rotate(tiles[i], turn))
        grid.append(row)
    return grid


def grade(payload, solution, submission):
    size = payload['size']
    rotations = (submission or {}).get('rotations') or []
    grid = _apply(payload, rotations)
    solved = _is_connected_network(size, grid)

    connected = 0
    for r in range(size):
        for c in range(size):
            for direction, (dr, dc) in _DELTA.items():
                if not grid[r][c] & direction:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < size and 0 <= nc < size and grid[nr][nc] & _OPPOSITE[direction]:
                    connected += 1
    return solved, {
        'connections': connected // 2,
        'total': size * size - 1,
    }


def hint(payload, solution, state):
    """Lock one tile to a rotation that matches the stored solution."""
    rotations = (state or {}).get('rotations') or []
    for i, want in enumerate(solution['rotations']):
        try:
            current = int(rotations[i]) % 4
        except (TypeError, ValueError, IndexError):
            current = 0
        if current != want:
            return {'kind': 'tile', 'index': i, 'rotation': want}
    return None
