"""Splice — recombine eight fragments into four syllabus words.

Four words are drawn from the band's vocabulary, broken into their authored
fragments, and shuffled into one pool. The student rebuilds all four.

The interesting work is not the draw, it is refusing bad draws. A pool of
fragments can betray the puzzle in two ways, and both are checked before a draw
is accepted:

* **A shared fragment.** If two chosen words both contain "TION", the student
  cannot tell which slot a given "TION" tile belongs to, and two visually
  identical tiles in a pool of eight is a UI trap rather than a challenge.

* **A stowaway word.** If the pooled fragments happen to also spell some *other*
  word on the list, that arrangement is an equally defensible answer that the
  grader would mark wrong. This is the failure mode that would quietly cost
  someone their streak, so `_forms_other_word` scans the entire band list for
  any word whose fragments are all available in the pool.

Grading compares the four words as a *set*. Slots differ in length and
category, so a correct set necessarily fills the slots correctly, and set
comparison means a student who builds the right words in a different order is
not punished for it.
"""
from collections import Counter

BANDS = {
    '6-7': {'words': 4},
    '8-10': {'words': 4},
}

_MAX_DRAW_ATTEMPTS = 60


def _forms_other_word(pool, chosen, entries):
    """True if the pooled fragments can also spell a word we did not choose."""
    available = Counter(pool)
    for word, fragments, _ in entries:
        if word in chosen:
            continue
        needed = Counter(fragments)
        if all(available[frag] >= count for frag, count in needed.items()):
            return True
    return False


def generate(rng, band):
    from .wordlists import WORDLISTS

    entries = WORDLISTS[band]
    count = BANDS[band]['words']

    for _ in range(_MAX_DRAW_ATTEMPTS):
        picked = rng.sample(entries, count)

        pool = []
        for _word, fragments, _cat in picked:
            pool.extend(fragments)

        # Every fragment must be distinguishable from every other in the pool.
        if len(set(pool)) != len(pool):
            continue

        chosen = {w for w, _f, _c in picked}
        if _forms_other_word(pool, chosen, entries):
            continue

        shuffled = pool[:]
        rng.shuffle(shuffled)

        slots = [
            {'length': len(word), 'parts': len(fragments), 'category': category}
            for word, fragments, category in picked
        ]
        # Slot order must not leak which fragments belong together.
        rng.shuffle(slots)

        payload = {'fragments': shuffled, 'slots': slots}
        solution = {'words': sorted(chosen)}
        return payload, solution

    raise RuntimeError(f'splice: no unambiguous draw for band {band}')


def _submitted_words(submission):
    raw = (submission or {}).get('words') or []
    return {str(w).strip().upper() for w in raw if str(w).strip()}


def grade(payload, solution, submission):
    got = _submitted_words(submission)
    want = set(solution['words'])
    correct = got & want
    return got == want, {
        'correct': len(correct),
        'total': len(want),
        'solved_words': sorted(correct),
    }


def hint(payload, solution, state):
    """Name the opening fragment of a word the student has not found yet."""
    found = _submitted_words(state)
    from .wordlists import WORDLISTS

    for word in solution['words']:
        if word in found:
            continue
        for band_entries in WORDLISTS.values():
            for entry_word, fragments, category in band_entries:
                if entry_word == word:
                    return {
                        'kind': 'fragment',
                        'category': category,
                        'length': len(word),
                        'starts_with': fragments[0],
                    }
    return None
