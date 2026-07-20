"""One-off migration: multi-subject scoping for subject specialists.

Creates `specialist_scope` and backfills one row per existing specialist from
their single `User.specialist_subject` string, so current access is preserved
exactly.

Why this exists: `specialist_subject` could only ever hold one subject, and it
was exact-matched against `question_repository.subject`. That is too narrow —
a science specialist needs Physics *and* Chemistry — and it breaks outright the
moment subject labels are normalised (see migrate_add_board_taxonomy.py, which
rewrites 'Mathematics 1A' -> 'Mathematics').

`User.specialist_subject` is left in place but is no longer read. Drop it in a
later change once nothing references it.

Idempotent — safe to run twice. Must be run once per .env target
(local AND production):

    python migrate_specialist_scope.py
"""
from app import app
from models import db, User, SpecialistScope, QuestionRepository


# A specialist whose subject string does not match any repository subject can
# see nothing at all. Rather than guess at intent, we backfill 1:1 and report
# the broken ones so an admin can widen them through the UI.
#
# The one exception is maths: this migration's sibling normalises
# 'Mathematics 1A'/'Maths 2A'/... down to 'Mathematics', so a 'Math' specialist
# who can currently see the class 6-9 rows would silently lose nothing but also
# gain nothing. Granting 'Mathematics' alongside keeps them whole across the
# taxonomy change.
EXTRA_SUBJECTS = {
    'math': ['Mathematics'],
    'maths': ['Mathematics'],
    'mathematics': ['Math'],
}


def main():
    with app.app_context():
        print(f"Target database host: {db.engine.url.host}")

        db.create_all()  # creates specialist_scope only; never alters existing tables
        print("Ensured specialist_scope exists")

        specialists = User.query.filter_by(role='subject_specialist').all()
        print(f"{len(specialists)} subject specialists found")

        created = 0
        warnings = []

        for user in specialists:
            raw = (user.specialist_subject or '').strip()
            if not raw:
                warnings.append(f"  {user.username!r}: no specialist_subject set — no scope created")
                continue

            subjects = [raw] + EXTRA_SUBJECTS.get(raw.lower(), [])

            for subject in subjects:
                exists = SpecialistScope.query.filter_by(
                    user_id=user.id, subject=subject,
                    class_number=None, board=None, paper_code=None,
                ).first()
                if exists:
                    continue

                db.session.add(SpecialistScope(user_id=user.id, subject=subject))
                created += 1

            # Report scopes that match nothing, including pre-existing breakage.
            reachable = QuestionRepository.query.filter(
                QuestionRepository.subject.in_(subjects)
            ).count()
            if reachable == 0:
                warnings.append(
                    f"  {user.username!r}: subject {raw!r} matches 0 questions "
                    f"— this specialist sees an empty repository. Widen their scope."
                )

        db.session.commit()
        print(f"Created {created} scope rows")

        if warnings:
            print("\nATTENTION — specialists needing an admin to widen their scope:")
            for w in warnings:
                print(w)

    print("\nDone.")


if __name__ == "__main__":
    main()
