"""One-off migration: primary (class 1-5) interactive question formats.

Adds `question_format` ('mcq' | 'tap_select' | 'count_tap' | 'match_line' |
'drag_drop_bucket') and `content_json` (format-specific structure + answer
key) to both `questions` and `question_repository`. All existing rows stay
'mcq' so nothing changes for current exams.

Idempotent — safe to run twice. Must be run once per .env target
(local AND production):

    python migrate_add_primary_formats.py
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
            host = db.engine.url.host
            print(f"Target database host: {host}")
            for table in ("questions", "question_repository"):
                if not column_exists(conn, table, "question_format"):
                    conn.execute(text(
                        f"ALTER TABLE {table} "
                        "ADD COLUMN question_format VARCHAR(30) NOT NULL DEFAULT 'mcq'"
                    ))
                    print(f"Added question_format to {table}")
                else:
                    print(f"question_format already exists on {table}")

                if not column_exists(conn, table, "content_json"):
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN content_json TEXT NULL"
                    ))
                    print(f"Added content_json to {table}")
                else:
                    print(f"content_json already exists on {table}")

    print("Done.")


if __name__ == "__main__":
    main()
