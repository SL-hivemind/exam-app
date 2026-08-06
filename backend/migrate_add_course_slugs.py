"""One-off migration: keyword-bearing URLs for public courses.

Adds:
  * public_courses.slug  — unique, indexed, nullable

Course pages were reachable only as /public/course/3. An opaque integer gives
a search engine nothing to work with, which capped how well the whole catalog
could ever rank. This backfills a slug from each course title.

Nullable and backfilled rather than NOT NULL: the column has to exist before
anything can populate it, and a course row that somehow ends up without one
should still load rather than 500.

Existing /public/course/<id> links keep working forever — the detail route
resolves either form. Nothing is redirected away.

Idempotent — safe to run twice:

    python migrate_add_course_slugs.py

Run it against BOTH targets (localhost and the live RDS instance). Check which
one backend/.env currently points at before running.
"""
from sqlalchemy import text

from app import app
from models import db
from utils.slugs import slugify, unique_slug


def column_exists(conn, table, column):
    return bool(conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).scalar())


def index_exists(conn, table, index):
    return bool(conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.statistics "
        "WHERE table_schema = DATABASE() AND table_name = :t AND index_name = :i"
    ), {"t": table, "i": index}).scalar())


def main():
    with app.app_context():
        target = db.engine.url
        print(f"Target: {target.host}/{target.database}")

        with db.engine.begin() as conn:
            # ── read-only preflight ──
            total = conn.execute(text("SELECT COUNT(*) FROM public_courses")).scalar()
            print(f"public_courses rows: {total}")

            if not column_exists(conn, "public_courses", "slug"):
                conn.execute(text(
                    "ALTER TABLE public_courses ADD COLUMN slug VARCHAR(280) NULL"
                ))
                print("Added slug to public_courses")
            else:
                print("slug already exists on public_courses")

            if not index_exists(conn, "public_courses", "uq_public_course_slug"):
                conn.execute(text(
                    "ALTER TABLE public_courses "
                    "ADD CONSTRAINT uq_public_course_slug UNIQUE (slug)"
                ))
                print("Added unique index on public_courses.slug")
            else:
                print("unique index on slug already exists")

            # ── backfill ──
            rows = conn.execute(text(
                "SELECT id, title FROM public_courses "
                "WHERE slug IS NULL OR slug = '' ORDER BY id"
            )).fetchall()

            if not rows:
                print("Nothing to backfill.")
            else:
                print(f"Backfilling {len(rows)} slug(s)...")

            # Seed the taken-set from what is already stored, so a re-run does
            # not collide with slugs assigned by an earlier partial run.
            taken = {
                s for (s,) in conn.execute(text(
                    "SELECT slug FROM public_courses WHERE slug IS NOT NULL"
                )).fetchall()
            }

            for course_id, title in rows:
                base = slugify(title, fallback=f'course-{course_id}')
                slug = unique_slug(base, lambda c: c in taken)
                taken.add(slug)
                conn.execute(
                    text("UPDATE public_courses SET slug = :s WHERE id = :i"),
                    {"s": slug, "i": course_id},
                )
                print(f"  {course_id}: {slug}")

            # ── verify by reading back ──
            missing = conn.execute(text(
                "SELECT COUNT(*) FROM public_courses WHERE slug IS NULL OR slug = ''"
            )).scalar()
            print(f"Rows still without a slug: {missing}")

    print("Done.")


if __name__ == "__main__":
    main()
