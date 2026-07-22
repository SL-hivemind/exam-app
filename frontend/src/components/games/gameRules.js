/**
 * Client-side puzzle rules, shared by the signed-in and guest boards.
 *
 * Two jobs, and the difference between them matters:
 *
 * `isComplete` answers "has the student finished putting things on the board?"
 * It is what drives auto-submit — the student never presses a button, the
 * board decides it is done and asks the server. It is deliberately *not* a
 * correctness check: on Gridlock a full grid with wrong digits still counts as
 * complete, and the server says no.
 *
 * `gradeLocally` mirrors `backend/utils/games/*.py:grade`. It is used only by
 * the public guest boards, where the server hands over the solution because
 * nothing is stored and there is no rank to protect. Signed-in play never
 * calls it — that grading stays on the server, where the answer key lives.
 *
 * `stateSignature` exists so auto-submit fires once per distinct board rather
 * than on every keystroke that leaves the board complete.
 */

const UP = 1;
const RIGHT = 2;
const DOWN = 4;
const LEFT = 8;

const DELTAS = [
  [UP, -1, 0],
  [RIGHT, 0, 1],
  [DOWN, 1, 0],
  [LEFT, 0, -1],
];

const OPPOSITE = { [UP]: DOWN, [RIGHT]: LEFT, [DOWN]: UP, [LEFT]: RIGHT };

/** Turn a tile's opening mask by `turns` quarter-turns clockwise. */
export function rotateMask(mask, turns) {
  let m = mask;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i += 1) {
    m = ((m << 1) | (m >> 3)) & 0b1111;
  }
  return m;
}

/** Which cells currently have every opening matched by a neighbour. */
export function matchedCells(size, masks) {
  return masks.map((mask, i) => {
    const r = Math.floor(i / size);
    const c = i % size;
    return DELTAS.every(([dir, dr, dc]) => {
      if (!(mask & dir)) return true;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) return false;
      return Boolean(masks[nr * size + nc] & OPPOSITE[dir]);
    });
  });
}

/** Mirrors weave.py:_is_connected_network — one component, no loose ends. */
function isConnectedNetwork(size, masks) {
  if (masks.some((mask) => mask === 0)) return false;
  if (!matchedCells(size, masks).every(Boolean)) return false;

  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const index = queue.shift();
    const r = Math.floor(index / size);
    const c = index % size;
    DELTAS.forEach(([dir, dr, dc]) => {
      if (!(masks[index] & dir)) return;
      const next = (r + dr) * size + (c + dc);
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    });
  }
  return seen.size === size * size;
}

/** The grid as the student currently has it: givens plus their entries. */
export function gridlockValues(payload, state) {
  const base = payload.grid.map((row) => row.slice());
  const saved = state?.grid;
  for (let r = 0; r < payload.size; r += 1) {
    for (let c = 0; c < payload.size; c += 1) {
      if (payload.grid[r][c] === null && saved?.[r]?.[c] != null) base[r][c] = saved[r][c];
    }
  }
  return base;
}

export function weaveRotations(payload, state) {
  return state?.rotations?.length === payload.tiles.length
    ? state.rotations
    : payload.tiles.map(() => 0);
}

/**
 * Is the board finished being filled in? Drives auto-submit.
 *
 * Weave is the odd one out: "every tile turned" is not a state a player can
 * reach, so its completion test is the solve condition itself. That is safe —
 * the server still re-derives the network on submit.
 */
export function isComplete(gameKey, payload, state) {
  if (!payload) return false;

  if (gameKey === 'gridlock') {
    const values = gridlockValues(payload, state);
    return values.every((row) => row.every((v) => v != null));
  }

  if (gameKey === 'weave') {
    const rotations = weaveRotations(payload, state);
    const masks = payload.tiles.map((mask, i) => rotateMask(mask, rotations[i]));
    return isConnectedNetwork(payload.size, masks);
  }

  if (gameKey === 'splice') {
    const slots = state?.slots;
    if (!Array.isArray(slots) || slots.length !== payload.slots.length) return false;
    return payload.slots.every((slot, i) => {
      const parts = slots[i] || [];
      return parts.length === slot.parts && parts.join('').length === slot.length;
    });
  }

  return false;
}

/** Guest-mode grading. Mirrors the `grade()` of each backend game module. */
export function gradeLocally(gameKey, payload, solution, state) {
  if (!solution) return false;

  if (gameKey === 'gridlock') {
    const values = gridlockValues(payload, state);
    return payload.blanks.every(([r, c]) => values[r][c] === solution.grid[r][c]);
  }

  if (gameKey === 'weave') {
    const rotations = weaveRotations(payload, state);
    const masks = payload.tiles.map((mask, i) => rotateMask(mask, rotations[i]));
    return isConnectedNetwork(payload.size, masks);
  }

  if (gameKey === 'splice') {
    const want = [...solution.words].map((w) => String(w).toUpperCase()).sort();
    const got = [...new Set(
      (state?.words || []).map((w) => String(w).trim().toUpperCase()).filter(Boolean)
    )].sort();
    return want.length === got.length && want.every((w, i) => w === got[i]);
  }

  return false;
}

/**
 * Split a word back into the pool fragments that spell it.
 *
 * The generator guarantees every fragment in a pool is distinct
 * (splice.py refuses a draw otherwise), so this short backtracking search has
 * exactly one answer per word. Returns null if the word cannot be spelled from
 * what is left, which only happens if payload and solution disagree.
 */
function splitIntoFragments(word, pool) {
  const search = (rest, available) => {
    if (!rest) return [];
    for (let i = 0; i < available.length; i += 1) {
      const fragment = available[i];
      if (!rest.startsWith(fragment)) continue;
      const tail = search(
        rest.slice(fragment.length),
        available.filter((_, j) => j !== i)
      );
      if (tail) return [fragment, ...tail];
    }
    return null;
  };
  return search(word, pool);
}

/**
 * Lay the solved words out across the slots, so a reveal actually populates
 * the board instead of leaving it empty. Slots are matched on length and part
 * count; where two slots are interchangeable either assignment is correct,
 * because splice grades the four words as a set.
 */
export function spliceSolutionSlots(payload, solution) {
  const remaining = solution.words
    .map((word) => ({ word, parts: splitIntoFragments(word, payload.fragments) }))
    .filter((entry) => entry.parts);

  return payload.slots.map((slot) => {
    const i = remaining.findIndex(
      (entry) => entry.word.length === slot.length && entry.parts.length === slot.parts
    );
    return i === -1 ? [] : remaining.splice(i, 1)[0].parts;
  });
}

/** The board state that shows the answer, for a reveal. */
export function solutionState(gameKey, payload, solution) {
  if (gameKey === 'gridlock') return { grid: solution.grid };
  if (gameKey === 'weave') return { rotations: solution.rotations };
  if (gameKey === 'splice') {
    const slots = spliceSolutionSlots(payload, solution);
    return { slots, words: slots.map((parts) => parts.join('')) };
  }
  return null;
}

/**
 * A stable string for one board arrangement, so auto-submit can fire once per
 * distinct board instead of once per render.
 */
export function stateSignature(gameKey, payload, state) {
  if (gameKey === 'gridlock') return JSON.stringify(gridlockValues(payload, state));
  if (gameKey === 'weave') return JSON.stringify(weaveRotations(payload, state));
  if (gameKey === 'splice') return JSON.stringify(state?.slots || []);
  return JSON.stringify(state || {});
}
