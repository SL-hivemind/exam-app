from __future__ import annotations

import argparse
import sys
from pathlib import Path


CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app  # noqa: E402
from models import User, Student, db  # noqa: E402


def normalize(value: str | None) -> str:
    return (value or "").strip()


def run(apply: bool, preview_limit: int) -> int:
    planned = []
    collisions = []

    rows = (
        db.session.query(User, Student)
        .join(Student, Student.user_id == User.id)
        .filter(User.role == "student")
        .all()
    )

    for user, student in rows:
        target_username = normalize(student.student_id)
        target_name = normalize(student.name)

        username_current = normalize(user.username)
        name_current = normalize(user.name)

        update_username_to = None
        update_name_to = None

        if target_username and username_current != target_username:
            conflict = (
                db.session.query(User)
                .filter(User.username == target_username, User.id != user.id)
                .first()
            )
            if conflict:
                collisions.append(
                    {
                        "user_id": user.id,
                        "from_username": user.username,
                        "target_username": target_username,
                        "conflict_user_id": conflict.id,
                        "conflict_role": conflict.role,
                    }
                )
            else:
                update_username_to = target_username

        if not name_current and target_name:
            update_name_to = target_name

        if update_username_to is not None or update_name_to is not None:
            planned.append(
                {
                    "user": user,
                    "user_id": user.id,
                    "student_id": target_username,
                    "old_username": user.username,
                    "new_username": update_username_to,
                    "old_name": user.name,
                    "new_name": update_name_to,
                }
            )

    username_updates = sum(1 for item in planned if item["new_username"] is not None)
    name_updates = sum(1 for item in planned if item["new_name"] is not None)

    print("=== Student User Sync ===")
    print(f"Mode: {'APPLY' if apply else 'DRY-RUN'}")
    print(f"Student rows scanned: {len(rows)}")
    print(f"Planned user.username updates: {username_updates}")
    print(f"Planned user.name updates: {name_updates}")
    print(f"Username collisions (skipped): {len(collisions)}")

    if collisions:
        print("\n-- Collisions --")
        for item in collisions[:preview_limit]:
            print(
                f"user_id={item['user_id']} from_username='{item['from_username']}' "
                f"target_username='{item['target_username']}' "
                f"conflict_user_id={item['conflict_user_id']} conflict_role={item['conflict_role']}"
            )
        if len(collisions) > preview_limit:
            print(f"... and {len(collisions) - preview_limit} more collisions")

    if planned:
        print("\n-- Planned Changes --")
        for item in planned[:preview_limit]:
            print(
                f"user_id={item['user_id']} student_id='{item['student_id']}' "
                f"username: '{item['old_username']}' -> '{item['new_username'] or item['old_username']}' "
                f"name: '{item['old_name']}' -> '{item['new_name'] or item['old_name']}'"
            )
        if len(planned) > preview_limit:
            print(f"... and {len(planned) - preview_limit} more planned changes")

    if not apply:
        print("\nDry-run complete. Re-run with --apply to persist changes.")
        return 0

    try:
        for item in planned:
            user = item["user"]
            if item["new_username"] is not None:
                user.username = item["new_username"]
            if item["new_name"] is not None:
                user.name = item["new_name"]

        db.session.commit()
        print("\nApply complete.")
        print(f"Committed username updates: {username_updates}")
        print(f"Committed name updates: {name_updates}")
        return 0
    except Exception as exc:
        db.session.rollback()
        print(f"\nApply failed. Rolled back transaction. Error: {exc}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="One-time sync: user.username/user.name from students table for student-role users."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist updates to the database. Without this flag, script runs in dry-run mode.",
    )
    parser.add_argument(
        "--preview-limit",
        type=int,
        default=30,
        help="How many rows to print in collision/planned sections.",
    )
    args = parser.parse_args()

    with app.app_context():
        return run(apply=args.apply, preview_limit=max(1, args.preview_limit))


if __name__ == "__main__":
    raise SystemExit(main())
