"""One-off migration: proctoring policy profiles and the integrity event log.

Adds:
  * proctor_profiles          — reusable monitoring policies (+ 5 system rows)
  * exams.proctor_profile_id  — FK, NULL = platform defaults
  * exams.proctor_overrides   — JSON patch over the profile
  * proctor_events            — one row per integrity TRANSITION per attempt

db.create_all() never alters existing tables, so the exam columns are added
here explicitly. Existing exams keep proctor_profile_id NULL and therefore
behave exactly as they did before this migration.

Idempotent — safe to run twice:

    python migrate_add_proctoring.py

Run it against BOTH targets (localhost and the live RDS instance). Check
which one backend/.env currently points at before running.
"""
import json

from sqlalchemy import text

from app import app
from models import db, SYSTEM_PROCTOR_PROFILES


def column_exists(conn, table, column):
    return bool(conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).scalar())


def table_exists(conn, table):
    return bool(conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.tables "
        "WHERE table_schema = DATABASE() AND table_name = :t"
    ), {"t": table}).scalar())


def main():
    with app.app_context():
        target = db.engine.url
        print(f"Target: {target.host}/{target.database}")

        with db.engine.begin() as conn:
            # ── proctor_profiles ──
            if not table_exists(conn, "proctor_profiles"):
                conn.execute(text("""
                    CREATE TABLE proctor_profiles (
                        id            INT AUTO_INCREMENT PRIMARY KEY,
                        `key`         VARCHAR(50)  NULL,
                        label         VARCHAR(120) NOT NULL,
                        description   TEXT         NULL,
                        school_id     INT          NULL,
                        is_system     TINYINT(1)   NOT NULL DEFAULT 0,
                        settings_json TEXT         NULL,
                        created_at    DATETIME     NULL,
                        CONSTRAINT uq_proctor_profile_key_school UNIQUE (`key`, school_id),
                        CONSTRAINT fk_proctor_profile_school
                            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
                    )
                """))
                print("Created table proctor_profiles")
            else:
                print("proctor_profiles already exists")

            # ── proctor_events ──
            if not table_exists(conn, "proctor_events"):
                conn.execute(text("""
                    CREATE TABLE proctor_events (
                        id          INT AUTO_INCREMENT PRIMARY KEY,
                        attempt_id  INT         NOT NULL,
                        seq         INT         NOT NULL,
                        event_type  VARCHAR(50) NOT NULL,
                        severity    SMALLINT    NOT NULL DEFAULT 0,
                        client_ts   BIGINT      NULL,
                        received_at DATETIME    NOT NULL,
                        duration_ms INT         NULL,
                        meta        TEXT        NULL,
                        CONSTRAINT uq_proctor_event_seq UNIQUE (attempt_id, seq),
                        CONSTRAINT fk_proctor_event_attempt
                            FOREIGN KEY (attempt_id)
                            REFERENCES student_exam_attempts(id) ON DELETE CASCADE,
                        INDEX ix_proctor_event_attempt_sev (attempt_id, severity)
                    )
                """))
                print("Created table proctor_events")
            else:
                print("proctor_events already exists")

            # ── exams columns ──
            if not column_exists(conn, "exams", "proctor_profile_id"):
                conn.execute(text(
                    "ALTER TABLE exams ADD COLUMN proctor_profile_id INT NULL"
                ))
                conn.execute(text(
                    "ALTER TABLE exams ADD CONSTRAINT fk_exam_proctor_profile "
                    "FOREIGN KEY (proctor_profile_id) REFERENCES proctor_profiles(id) "
                    "ON DELETE SET NULL"
                ))
                print("Added proctor_profile_id to exams")
            else:
                print("proctor_profile_id already exists on exams")

            if not column_exists(conn, "exams", "proctor_overrides"):
                conn.execute(text(
                    "ALTER TABLE exams ADD COLUMN proctor_overrides TEXT NULL"
                ))
                print("Added proctor_overrides to exams")
            else:
                print("proctor_overrides already exists on exams")

            # ── seed the system profiles ──
            for key, spec in SYSTEM_PROCTOR_PROFILES.items():
                exists = conn.execute(text(
                    "SELECT id FROM proctor_profiles "
                    "WHERE `key` = :k AND school_id IS NULL"
                ), {"k": key}).first()
                if exists:
                    # Refresh label/description/settings so a shipped tweak to
                    # a system profile reaches installs that already ran this.
                    conn.execute(text(
                        "UPDATE proctor_profiles "
                        "SET label = :l, description = :d, settings_json = :s "
                        "WHERE `key` = :k AND school_id IS NULL"
                    ), {
                        "k": key, "l": spec["label"], "d": spec["description"],
                        "s": json.dumps(spec["settings"]),
                    })
                    print(f"Updated system profile: {key}")
                else:
                    conn.execute(text(
                        "INSERT INTO proctor_profiles "
                        "(`key`, label, description, school_id, is_system, settings_json, created_at) "
                        "VALUES (:k, :l, :d, NULL, 1, :s, NOW())"
                    ), {
                        "k": key, "l": spec["label"], "d": spec["description"],
                        "s": json.dumps(spec["settings"]),
                    })
                    print(f"Seeded system profile: {key}")

    print("Done.")


if __name__ == "__main__":
    main()
