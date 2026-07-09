"""One-off migration for the public question repository.

1. Adds the `question_format` column ('mcq' | 'assertion_reason' | 'match' |
   'statement') — db.create_all() never alters existing tables.
2. Normalises maths subjects: 'Maths 1A', 'Maths-2B', 'math' … → 'Mathematics'
   so practice never splits maths into paper-code fragments.

Idempotent — safe to run twice:

    python migrate_public_formats.py
"""
from sqlalchemy import text

from app import app
from models import db


def column_exists(conn, table, column):
    return bool(conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).scalar())


def main():
    with app.app_context():
        with db.engine.begin() as conn:
            for table in ("public_question_repository", "public_pending_image_questions"):
                if not column_exists(conn, table, "question_format"):
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN question_format VARCHAR(30) DEFAULT 'mcq'"
                    ))
                    print(f"Added question_format to {table}")
                else:
                    print(f"question_format already exists on {table}")

            updated = conn.execute(text(
                "UPDATE public_question_repository "
                "SET subject = 'Mathematics' "
                "WHERE LOWER(subject) LIKE '%math%' AND subject <> 'Mathematics'"
            )).rowcount
            print(f"Normalised {updated} maths subject rows → 'Mathematics'")

    print("Done.")


if __name__ == "__main__":
    main()
