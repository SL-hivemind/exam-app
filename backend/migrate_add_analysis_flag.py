"""One-off migration: add `include_in_analysis` to the exams table.

Practice/mock exams can opt out of aggregate analytics — db.create_all()
never alters existing tables, so the column is added here. Existing exams
default to 1 (included) so current analysis numbers don't change.

Idempotent — safe to run twice:

    python migrate_add_analysis_flag.py
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
            if not column_exists(conn, "exams", "include_in_analysis"):
                conn.execute(text(
                    "ALTER TABLE exams "
                    "ADD COLUMN include_in_analysis TINYINT(1) NOT NULL DEFAULT 1"
                ))
                print("Added include_in_analysis to exams")
            else:
                print("include_in_analysis already exists on exams")

    print("Done.")


if __name__ == "__main__":
    main()
