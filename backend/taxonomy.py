"""Single source of truth for the B2C competitive-exam taxonomy and grading.

Two ideas live here:

1. TAGS — how a course claims its questions. A ``PublicCourse.target_tags`` and a
   ``PublicQuestionRepo.course_tags`` are matched by a substring OR (see
   ``scope_repo_query`` in routes/public_routes.py). So a *shared* subject is just
   a pool tag that many courses list in their target_tags: tag an aptitude
   question ``APTITUDE`` once and it surfaces in every exam whose target_tags
   include ``APTITUDE`` — no per-exam re-tagging.

   IMPORTANT: because matching is ``ilike('%tag%')``, no tag may be a substring of
   another (use ``SSCCGL``/``RRB``, never overlapping fragments).

2. grade_answer — one grading function for every competitive format, so mock /
   practice / adaptive / challenge scoring can never drift apart.
"""

# ─────────────────────────── TAGS ───────────────────────────

# Exam-family tags — exam-specific content.
JEE = 'JEE'
NEET = 'NEET'
SSCCGL = 'SSCCGL'
RRB = 'RRB'
POLICE = 'POLICE'
BANKING = 'BANKING'
GATE = 'GATE'

# Shared pool tags — cross-exam subjects. A course opts in by listing these in
# its target_tags alongside its exam-family tag.
APTITUDE = 'APTITUDE'          # Quantitative Aptitude / Numerical Ability
REASONING = 'REASONING'        # Logical / Analytical Reasoning
GK = 'GK'                      # General Knowledge / General Awareness
ENGLISH = 'ENGLISH'            # English Language & Comprehension
CURRENTAFFAIRS = 'CURRENTAFFAIRS'

EXAM_FAMILY_TAGS = [JEE, NEET, SSCCGL, RRB, POLICE, BANKING, GATE]
POOL_TAGS = [APTITUDE, REASONING, GK, ENGLISH, CURRENTAFFAIRS]
ALL_TAGS = EXAM_FAMILY_TAGS + POOL_TAGS


# Per-exam full-mock blueprint: duration + display title. Keyed by exam-family
# tag so the frontend timer/title stop being hardcoded to JEE/NEET. New exams
# fall back to DEFAULT_MOCK until tuned.
MOCK_BLUEPRINTS = {
    JEE:     {'minutes': 180, 'title': 'JEE Full Mock Test'},
    NEET:    {'minutes': 180, 'title': 'NEET Full Mock Test'},
    SSCCGL:  {'minutes': 60,  'title': 'SSC CGL Tier-1 Mock'},
    RRB:     {'minutes': 90,  'title': 'RRB NTPC Mock'},
    POLICE:  {'minutes': 60,  'title': 'Police Recruitment Mock'},
    BANKING: {'minutes': 60,  'title': 'Banking Prelims Mock'},
    GATE:    {'minutes': 180, 'title': 'GATE Full Mock'},
}
DEFAULT_MOCK = {'minutes': 60, 'title': 'Full Mock Test'}


def mock_blueprint(tags):
    """Return the mock blueprint for the first matching exam-family tag.

    ``tags`` is any iterable of tag strings (a course's target_tags). Exam-family
    tags take precedence over shared pool tags.
    """
    up = {(t or '').strip().upper() for t in (tags or [])}
    for tag in EXAM_FAMILY_TAGS:
        if tag in up:
            return MOCK_BLUEPRINTS.get(tag, DEFAULT_MOCK)
    return DEFAULT_MOCK


def target_tags(*tags):
    """Build a canonical comma-joined target_tags/course_tags string."""
    seen, out = set(), []
    for t in tags:
        t = (t or '').strip().upper()
        if t and t not in seen:
            seen.add(t)
            out.append(t)
    return ','.join(out)


# ─────────────────────── QUESTION FORMATS ───────────────────────

FMT_MCQ = 'mcq'                # single correct option A..E
FMT_MSQ = 'msq'               # multiple correct options, answer e.g. 'A,C'
FMT_NAT = 'nat'               # numeric answer, answer '12.5' or range '12.4|12.6'
FMT_ASSERTION = 'assertion_reason'
FMT_MATCH = 'match'
FMT_STATEMENT = 'statement'
# Formats that behave like a single-letter MCQ for grading purposes.
SINGLE_LETTER_FORMATS = {FMT_MCQ, FMT_ASSERTION, FMT_MATCH, FMT_STATEMENT}
QUESTION_FORMATS = [FMT_MCQ, FMT_MSQ, FMT_NAT, FMT_ASSERTION, FMT_MATCH, FMT_STATEMENT]

_NAT_TOL = 1e-6               # tolerance for exact numeric answers


def _letter_set(s):
    """'A,C' or 'A C' or 'ac' -> {'A','C'}."""
    return {p.strip().upper()
            for p in (s or '').replace(' ', ',').split(',')
            if p.strip()}


def _nat_ok(user, correct):
    try:
        val = float(str(user).strip())
    except (TypeError, ValueError):
        return False
    correct = (correct or '').strip()
    if '|' in correct:                       # inclusive range 'low|high'
        lo, hi = correct.split('|', 1)
        try:
            return float(lo) <= val <= float(hi)
        except ValueError:
            return False
    try:
        return abs(val - float(correct)) <= _NAT_TOL
    except ValueError:
        return False


def is_correct(question_format, correct_answer, user_answer):
    """True if user_answer is correct for the given format. Blank -> False."""
    ua = (user_answer or '').strip()
    if not ua:
        return False
    fmt = (question_format or FMT_MCQ).lower()
    if fmt == FMT_NAT:
        return _nat_ok(ua, correct_answer)
    if fmt == FMT_MSQ:
        want = _letter_set(correct_answer)
        return bool(want) and _letter_set(ua) == want
    return ua.upper() == (correct_answer or '').strip().upper()


def grade_answer(question_format, correct_answer, user_answer,
                 marks=1, negative_marks=0):
    """Return ``(is_correct, awarded_marks)`` for one answer.

    * unattempted (blank) -> ``(False, 0)`` — never penalised
    * correct             -> ``(True,  +marks)``
    * wrong               -> ``(False, -abs(negative_marks))``

    ``awarded_marks`` may be fractional/negative, so callers that accumulate it
    should store the total in a float column.
    """
    ua = (user_answer or '').strip()
    if not ua:
        return False, 0
    ok = is_correct(question_format, correct_answer, user_answer)
    if ok:
        return True, (marks if marks is not None else 1)
    return False, -abs(negative_marks or 0)
