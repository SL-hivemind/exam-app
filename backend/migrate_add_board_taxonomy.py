"""One-off migration: board + paper_code taxonomy for the question repository.

`subject` was doing the work of three fields at once — subject, board and paper
code — as free text behind freeSolo dropdowns with no validation. That is how
'Mathematics 1A 1A' happened, and how 472 NCERT questions ended up filed inside
the AP/TS Intermediate 1A bucket.

This splits those apart:

    subject      'Mathematics'                 (normalised, one value)
    board        'AP-TS' | 'CBSE'              (new)
    paper_code   '1A'|'1B'|'2A'|'2B' or NULL   (new; AP-TS only, CBSE has no
                                                paper split and leaves it NULL)

`custom_id` is deliberately untouched. generate_short_id() abbreviates subject
to its first three alphanumerics, and 'Mathematics 1A', 'Maths 2A' and
'Mathematics' all yield 'MAT' — so moving the paper code out of `subject`
leaves every existing ID byte-identical. The updates below run as raw SQL
partly for that reason: it bypasses the before_update listener that would
otherwise regenerate IDs on a scope change.

Idempotent — every backfill is guarded on `board IS NULL`, so a second run is a
no-op and manual corrections are never clobbered. Must be run once per .env
target (local AND production):

    python migrate_add_board_taxonomy.py
"""
from sqlalchemy import text

from app import app
from models import db


# ── configuration ────────────────────────────────────────────────────────────

# Subject labels that carry an AP/TS Intermediate paper code.
AP_LABELS = {
    'Mathematics 1A': '1A',
    'Mathematics 1B': '1B',
    'Mathematics 1A 1A': '1A',   # CSV typo, confirmed as 1A
    'Maths 2A': '2A',
    'Maths 2B': '2B',
    'Mathematics': '1A',         # CSV typo, confirmed as 1A
}

# Questions filed under an AP label whose chapter belongs to a different
# syllabus. Keyed on (subject label, chapter) rather than chapter alone,
# because 'Binomial Theorem' exists in BOTH the mis-filed NCERT batch and
# genuine AP 2A — the chapter name on its own is ambiguous.
#
# All five are NCERT class 11 chapters. Add to this dict as more mis-filed
# chapters surface; the logic below needs no changes.
REHOME = {
    ('Mathematics 1A',    'Sets'):                                  ('CBSE', '11', None),
    ('Mathematics 1A',    'Complex Numbers & Quadratic Equations'): ('CBSE', '11', None),
    ('Mathematics 1A',    'Statistics'):                            ('CBSE', '11', None),
    ('Mathematics 1A 1A', 'Binomial Theorem'):                      ('CBSE', '11', None),
    ('Mathematics',       'Complex Numbers & Quadratic Equations'): ('CBSE', '11', None),
}

# Only maths class 11/12 is in scope. Classes 6-9 ('Math'/'math') keep their
# labels and stay untagged.
SCOPE = "class_number IN ('11','12') AND LOWER(subject) LIKE '%math%'"


# ── helpers ──────────────────────────────────────────────────────────────────

def column_exists(conn, table, column):
    return bool(conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).scalar())


def report(conn, label):
    print(f"\n{label}")
    rows = conn.execute(text(
        "SELECT subject, class_number, board, paper_code, COUNT(*) n "
        f"FROM question_repository WHERE {SCOPE} "
        "GROUP BY 1,2,3,4 ORDER BY 3,4,1"
    )).fetchall()
    for r in rows:
        print(f"  subj={r[0]!r:<22} cls={r[1]!r:<5} board={r[2]!r:<9} "
              f"paper={r[3]!r:<6} n={r[4]}")
    total = sum(r[4] for r in rows)
    print(f"  TOTAL: {total}")
    return total


def custom_id_fingerprint(conn):
    """Every (id, custom_id) pair, to prove none changed.

    Compared as a set rather than a checksum so a failure says which rows
    moved. Kept dialect-neutral so the backfill can be exercised on sqlite.
    """
    return set(conn.execute(text(
        "SELECT id, custom_id FROM question_repository WHERE custom_id IS NOT NULL"
    )).fetchall())


def apply_backfill(conn, verbose=True):
    """Tag boards/papers and normalise subject. Pure ANSI SQL, no DDL.

    Split out from main() so the routing rules can be tested against sqlite;
    main() adds the MySQL-specific DDL around it.
    """
    def log(msg):
        if verbose:
            print(msg)

    # 1. Re-home mis-filed chapters first, while their original subject label
    #    is still intact and can disambiguate them.
    rehomed = 0
    for (label, chapter), (board, cls, paper) in REHOME.items():
        res = conn.execute(text(
            "UPDATE question_repository "
            "SET board = :board, paper_code = :paper, class_number = :cls "
            "WHERE subject = :label AND chapter = :chapter AND board IS NULL"
        ), {"board": board, "paper": paper, "cls": cls,
            "label": label, "chapter": chapter})
        if res.rowcount:
            log(f"  re-homed {res.rowcount:>4} × {chapter!r} "
                f"({label!r} -> {board} class {cls})")
        rehomed += res.rowcount

    # 2. Everything still untagged under an AP label is genuine AP-TS.
    tagged = 0
    for label, paper in AP_LABELS.items():
        res = conn.execute(text(
            "UPDATE question_repository "
            "SET board = 'AP-TS', paper_code = :paper "
            "WHERE subject = :label AND board IS NULL"
        ), {"paper": paper, "label": label})
        if res.rowcount:
            log(f"  tagged   {res.rowcount:>4} × {label!r} -> AP-TS {paper}")
        tagged += res.rowcount

    # 3. Collapse the six maths subject labels into one.
    res = conn.execute(text(
        f"UPDATE question_repository SET subject = 'Mathematics' "
        f"WHERE {SCOPE} AND subject <> 'Mathematics'"
    ))
    log(f"  normalised {res.rowcount} rows to subject='Mathematics'")

    return rehomed, tagged


# ── migration ────────────────────────────────────────────────────────────────

def main():
    with app.app_context():
        print(f"Target database host: {db.engine.url.host}")

        db.create_all()  # creates chapter_catalog; never alters existing tables
        print("Ensured chapter_catalog exists")

        with db.engine.begin() as conn:
            for col, ddl in (("board", "VARCHAR(20) NULL"),
                             ("paper_code", "VARCHAR(4) NULL")):
                if column_exists(conn, "question_repository", col):
                    print(f"{col} already exists on question_repository")
                else:
                    conn.execute(text(
                        f"ALTER TABLE question_repository ADD COLUMN {col} {ddl}"
                    ))
                    print(f"Added {col} to question_repository")

            before_total = report(conn, "BEFORE:")
            before_ids = custom_id_fingerprint(conn)

            print()
            rehomed, tagged = apply_backfill(conn)

            after_total = report(conn, "AFTER:")
            after_ids = custom_id_fingerprint(conn)

            print(f"\nRe-homed to CBSE: {rehomed}   Tagged AP-TS: {tagged}")

            assert after_total == before_total, (
                f"row count changed: {before_total} -> {after_total}"
            )
            assert after_ids == before_ids, (
                f"custom_id changed for {len(before_ids ^ after_ids)} rows: "
                f"{sorted(before_ids ^ after_ids)[:10]}"
            )
            print(f"Row count unchanged ({after_total}) and all "
                  f"{len(after_ids)} custom_ids identical.")

    print("\nDone.")


if __name__ == "__main__":
    main()
