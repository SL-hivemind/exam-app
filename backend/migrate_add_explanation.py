"""One-off migration: an `explanation` column on the school question repository.

Students see the worked solution once an exam is over. The B2C table
(`public_question_repository`) already carries `explanation`; the school-side
`question_repository` does not, so the same extracted solutions had nowhere to
land on the B2B side.

Two steps, both idempotent:

  1. ADD COLUMN explanation TEXT NULL   — skipped if the column already exists.
  2. Backfill from the extracted CSVs, matching on the same identity the CSV
     importer de-duplicates by (text + options + answer + subject + class +
     chapter + board). Only rows whose explanation IS NULL are written, so a
     second run is a no-op and hand edits are never clobbered.

Must be run once per .env target (local AND production):

    python migrate_add_explanation.py            # step 1 only, reports plan
    python migrate_add_explanation.py --backfill # step 1 + step 2
"""
import argparse
import csv
import glob
import os
import re
import sys

from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app                    # noqa: E402
from models import db, QuestionRepository   # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATTERNS = ['Physics 1?/*.csv', 'NEET Physics 1?/*.csv',
            'Chemistry 1?/*.csv', 'NEET Chemistry 1?/*.csv',
            'Botany 1?/*.csv', 'Zoology 1?/*.csv']


def norm(s):
    return re.sub(r'\s+', ' ', (s or '')).strip().lower()


def identity(subject, class_number, chapter, text_, a, b, c, d, ans):
    return (norm(subject), norm(class_number), norm(chapter) or 'gen',
            norm(text_), norm(a), norm(b), norm(c), norm(d), norm(ans))


def column_exists():
    row = db.session.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE table_schema = DATABASE() "
        "  AND table_name = 'question_repository' "
        "  AND column_name = 'explanation'")).scalar()
    return bool(row)


def add_column():
    if column_exists():
        print('explanation column already present - nothing to add')
        return False
    db.session.execute(text(
        "ALTER TABLE question_repository ADD COLUMN explanation TEXT NULL"))
    db.session.commit()
    print('added question_repository.explanation')
    return True


def backfill():
    wanted = {}
    files = sorted(f for p in PATTERNS for f in glob.glob(os.path.join(ROOT, p)))
    for path in files:
        with open(path, newline='', encoding='utf-8-sig') as fh:
            for r in csv.DictReader(fh):
                exp = (r.get('explanation') or '').strip()
                if not exp:
                    continue
                key = identity(
                    r.get('subject'), r.get('class'), r.get('chapter'),
                    r.get('text'), r.get('option_a'), r.get('option_b'),
                    r.get('option_c'), r.get('option_d'),
                    r.get('correct_answer'))
                wanted.setdefault(key, exp)
    print('CSV rows carrying an explanation:', len(wanted))

    # Read the candidates fully before writing anything. Streaming with
    # yield_per while issuing UPDATEs on the same connection leaves the result
    # set unbuffered and silently truncates the scan partway through.
    candidates = db.session.query(
        QuestionRepository.id, QuestionRepository.subject,
        QuestionRepository.class_number, QuestionRepository.chapter,
        QuestionRepository.text, QuestionRepository.option_a,
        QuestionRepository.option_b, QuestionRepository.option_c,
        QuestionRepository.option_d, QuestionRepository.correct_answer,
    ).filter(QuestionRepository.explanation.is_(None)).all()
    print('rows without an explanation:', len(candidates))

    updates = []
    for (qid, subject, cls, chapter, text_, a, b, c, d, ans) in candidates:
        exp = wanted.get(identity(subject, cls, chapter, text_, a, b, c, d, ans))
        if exp:
            updates.append({'e': exp, 'i': qid})

    # Raw UPDATE: the ORM's before_update listener regenerates custom_id on a
    # scope change, and an explanation must never alter a question's ID.
    stmt = text("UPDATE question_repository SET explanation = :e WHERE id = :i")
    for i in range(0, len(updates), 500):
        db.session.execute(stmt, updates[i:i + 500])
        db.session.commit()
    print('matched and updated %d rows' % len(updates))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--backfill', action='store_true',
                    help='also populate explanations from the extracted CSVs')
    args = ap.parse_args()
    with app.app_context():
        print('target:', db.engine.url.host, '/', db.engine.url.database)
        add_column()
        if args.backfill:
            backfill()
        else:
            print('\ncolumn step done; re-run with --backfill to populate')


if __name__ == '__main__':
    main()
