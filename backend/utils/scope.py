"""Access scoping for subject specialists.

A specialist's reach is the OR of their `specialist_scope` rows. Within a row,
each set field ANDs a restriction and NULL means "unrestricted on that axis".

Two rules worth knowing before changing anything here:

* **No scopes means no access.** This matches the old behaviour — a specialist
  with a NULL `specialist_subject` produced `subject LIKE NULL`, which matches
  nothing — and it is the safe default for a permission boundary.

* **Untagged content stays visible.** A scope naming a board or paper still
  matches rows where that column is NULL, so questions that predate the board
  taxonomy do not vanish from a specialist's view while subjects are being
  tagged one at a time.
"""
from sqlalchemy import or_, and_

from models import QuestionRepository


def csv_contains(column, value):
    """Exact match against one entry of a comma-separated column.

    `question_repository.class_number` holds multi-value strings like '9,10'.
    A plain `.contains('1')` would match '11' and '12' as substrings, so match
    the delimited parts instead.
    """
    return or_(
        column == value,
        column.like(f'{value},%'),
        column.like(f'%,{value}'),
        column.like(f'%,{value},%'),
    )


def _scope_clause(scope, model=QuestionRepository):
    """One scope row -> a single AND-clause."""
    parts = [model.subject.ilike(scope.subject)]

    if scope.class_number:
        parts.append(csv_contains(model.class_number, scope.class_number))
    if scope.board:
        parts.append(or_(model.board == scope.board, model.board.is_(None)))
    if scope.paper_code:
        parts.append(or_(model.paper_code == scope.paper_code, model.paper_code.is_(None)))

    return and_(*parts)


def scope_clause(user, model=QuestionRepository):
    """OR of the user's scopes, or None if they are unrestricted.

    Returns a false-y clause (matches nothing) for a specialist with no scopes.
    """
    if user.role != 'subject_specialist':
        return None

    scopes = list(user.scopes)
    if not scopes:
        return db_false()

    return or_(*[_scope_clause(s, model) for s in scopes])


def db_false():
    """A clause that matches nothing, without needing a dialect literal."""
    return QuestionRepository.id.is_(None)


def scope_filter(query, user, model=QuestionRepository):
    """Restrict a query to what `user` may see. No-op for non-specialists."""
    clause = scope_clause(user, model)
    return query if clause is None else query.filter(clause)


def in_scope(user, subject, class_number=None, board=None, paper_code=None):
    """May `user` write a question with these attributes?

    Used on the create/edit paths, where the old code silently *overwrote* the
    submitted subject with the specialist's single one. With several subjects in
    play there is no single value to overwrite with, so callers validate instead
    and reject what falls outside the grant.
    """
    if user.role != 'subject_specialist':
        return True

    for scope in user.scopes:
        if (subject or '').strip().lower() != scope.subject.strip().lower():
            continue
        if scope.class_number and class_number:
            parts = [p.strip() for p in str(class_number).split(',') if p.strip()]
            if scope.class_number not in parts:
                continue
        if scope.board and board and board != scope.board:
            continue
        if scope.paper_code and paper_code and paper_code != scope.paper_code:
            continue
        return True

    return False


def scoped_subjects(user):
    """Distinct subjects a user may touch — for building dropdowns and errors."""
    if user.role != 'subject_specialist':
        return None
    return sorted({s.subject for s in user.scopes})


# ── taxonomy cascade ─────────────────────────────────────────────────────────
# Not a permission check. Chapter and topic names are only unique *within* a
# subject — 'Thermodynamics' is a chapter in both Physics and Chemistry, and
# topics like 'Density' and 'Types' each occur under three subjects. Filtering
# on one without a subject therefore returns a silent mix from every subject
# that happens to share the name.

def require_subject_for_children(subject, chapter=None, topic=None):
    """Return an error payload if chapter/topic is used without a subject.

    Returns None when the combination is fine, so callers read as:

        err = require_subject_for_children(subject, chapter, topic)
        if err:
            return jsonify(err), 400
    """
    def _set(v):
        return bool(v) and v not in ('null', '')

    if _set(subject):
        return None

    offenders = [n for n, v in (('chapter', chapter), ('topic', topic)) if _set(v)]
    if not offenders:
        return None

    return {
        'message': (
            f"Select a subject before filtering by {' or '.join(offenders)} — "
            f"the same name is used by different subjects."
        ),
        'code': 'SUBJECT_REQUIRED',
        'missing': 'subject',
    }
