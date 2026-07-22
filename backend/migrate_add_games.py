"""One-off migration: daily puzzle games (school side).

Creates `game_puzzles`, `game_plays` and `game_profiles`, and adds
`schools.games_enabled` (default 1, so existing schools have games on).

Nothing here touches exams, questions or students beyond the new foreign keys.

Idempotent — safe to run twice. Must be run once per .env target
(local AND production):

    python migrate_add_games.py

The script prints the target host before doing anything. Check it. `.env`
flips between localhost and the live AWS RDS instance, and this is a schema
change either way.
"""
from sqlalchemy import text

from app import app
from models import db


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


CREATE_PUZZLES = """
CREATE TABLE game_puzzles (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    game_key      VARCHAR(30) NOT NULL,
    band          VARCHAR(10) NOT NULL,
    puzzle_date   DATE NOT NULL,
    seed          BIGINT NOT NULL,
    payload_json  TEXT NOT NULL,
    solution_json TEXT NOT NULL,
    created_at    DATETIME NULL,
    CONSTRAINT uq_game_puzzle_day UNIQUE (game_key, band, puzzle_date)
)
"""

CREATE_PLAYS = """
CREATE TABLE game_plays (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    puzzle_id       INT NOT NULL,
    student_user_id INT NOT NULL,
    school_id       INT NULL,
    class_number    VARCHAR(50) NULL,
    -- DATETIME(3), not DATETIME: plain DATETIME stores whole seconds and
    -- ROUNDS, so a play started at .650 is stored as the next second and a
    -- fast solve computes a NEGATIVE elapsed time — which would rank as the
    -- fastest run of the day. Millisecond precision is the actual fix; the
    -- clamp in game_routes.py is the belt to this braces.
    started_at      DATETIME(3) NOT NULL,
    completed_at    DATETIME(3) NULL,
    elapsed_ms      INT NULL,
    hints_used      INT NOT NULL DEFAULT 0,
    revealed        TINYINT(1) NOT NULL DEFAULT 0,
    solved          TINYINT(1) NOT NULL DEFAULT 0,
    state_json      TEXT NULL,
    CONSTRAINT uq_game_play UNIQUE (puzzle_id, student_user_id),
    CONSTRAINT fk_gameplay_puzzle FOREIGN KEY (puzzle_id)
        REFERENCES game_puzzles (id) ON DELETE CASCADE,
    CONSTRAINT fk_gameplay_student FOREIGN KEY (student_user_id)
        REFERENCES students (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_gameplay_school FOREIGN KEY (school_id)
        REFERENCES schools (id),
    INDEX ix_gameplay_puzzle_solved (puzzle_id, solved, elapsed_ms),
    INDEX ix_gameplay_cohort (puzzle_id, school_id, class_number)
)
"""

CREATE_PROFILES = """
CREATE TABLE game_profiles (
    student_user_id  INT PRIMARY KEY,
    current_streak   INT NOT NULL DEFAULT 0,
    longest_streak   INT NOT NULL DEFAULT 0,
    last_played_date DATE NULL,
    total_solved     INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_gameprofile_student FOREIGN KEY (student_user_id)
        REFERENCES students (user_id) ON DELETE CASCADE
)
"""


def main():
    with app.app_context():
        with db.engine.begin() as conn:
            print(f"Target database host: {db.engine.url.host}")
            print(f"Target database name: {db.engine.url.database}")

            for name, ddl in (
                ("game_puzzles", CREATE_PUZZLES),
                ("game_plays", CREATE_PLAYS),
                ("game_profiles", CREATE_PROFILES),
            ):
                if table_exists(conn, name):
                    print(f"{name} already exists")
                else:
                    conn.execute(text(ddl))
                    print(f"Created {name}")

            # Upgrade timing columns on installs created before the precision
            # fix. Idempotent: only fires when precision is still 0.
            for column in ("started_at", "completed_at"):
                precision = conn.execute(text(
                    "SELECT datetime_precision FROM information_schema.columns "
                    "WHERE table_schema = DATABASE() AND table_name = 'game_plays' "
                    "AND column_name = :c"
                ), {"c": column}).scalar()
                if precision == 0:
                    nullability = "NOT NULL" if column == "started_at" else "NULL"
                    conn.execute(text(
                        f"ALTER TABLE game_plays MODIFY {column} DATETIME(3) {nullability}"
                    ))
                    print(f"Upgraded game_plays.{column} to DATETIME(3)")
                else:
                    print(f"game_plays.{column} already has sub-second precision")

            if column_exists(conn, "schools", "games_enabled"):
                print("games_enabled already exists on schools")
            else:
                conn.execute(text(
                    "ALTER TABLE schools "
                    "ADD COLUMN games_enabled TINYINT(1) NOT NULL DEFAULT 1"
                ))
                print("Added games_enabled to schools")

    print("Done.")


if __name__ == "__main__":
    main()
