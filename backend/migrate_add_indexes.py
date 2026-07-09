"""One-off migration: add the hot-path indexes to an EXISTING database.

db.create_all() only creates missing TABLES — it never alters existing ones,
so the indexes added to models.py must be applied here once per environment:

    python migrate_add_indexes.py          # uses DB from .env (local or Aurora)

Idempotent: safe to run twice. Dedupes student_answers before adding the
unique constraint (keeps the newest row per attempt/question).
"""
from sqlalchemy import text

from app import app
from models import db


def index_exists(conn, table, name):
    row = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.statistics "
        "WHERE table_schema = DATABASE() AND table_name = :t AND index_name = :n"
    ), {"t": table, "n": name}).scalar()
    return bool(row)


def main():
    with app.app_context():
        with db.engine.begin() as conn:
            # 1) Dedupe student_answers (keep highest id per attempt/question)
            deleted = conn.execute(text(
                "DELETE sa FROM student_answers sa "
                "JOIN student_answers newer "
                "  ON newer.attempt_id = sa.attempt_id "
                " AND newer.question_id = sa.question_id "
                " AND newer.id > sa.id"
            )).rowcount
            print(f"Removed {deleted} duplicate answer rows")

            # 2) Unique (attempt_id, question_id) on student_answers
            if not index_exists(conn, "student_answers", "uq_attempt_question"):
                conn.execute(text(
                    "ALTER TABLE student_answers "
                    "ADD CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)"
                ))
                print("Added uq_attempt_question")
            else:
                print("uq_attempt_question already exists")

            # 3) (exam_id, submitted_time) on student_exam_attempts
            if not index_exists(conn, "student_exam_attempts", "ix_attempt_exam_submitted"):
                conn.execute(text(
                    "CREATE INDEX ix_attempt_exam_submitted "
                    "ON student_exam_attempts (exam_id, submitted_time)"
                ))
                print("Added ix_attempt_exam_submitted")
            else:
                print("ix_attempt_exam_submitted already exists")

    print("Done.")


if __name__ == "__main__":
    main()
