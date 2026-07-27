"""One-off migration: richer competitive-exam question formats (B2C).

Adds the columns that let the public question bank carry Banking's 5th option,
per-question negative marking, and the NAT / MSQ answer formats GATE needs:

  public_question_repository
    + option_e        VARCHAR(500) NULL                 -- Banking / some SSC
    + negative_marks  FLOAT        DEFAULT 0            -- wrong-answer penalty
    ~ correct_answer  VARCHAR(10) -> VARCHAR(30)        -- holds 'A,C' or '12.4|12.6'

  public_pending_image_questions  (staging table, promoted into the repo)
    + question_format VARCHAR(30)  DEFAULT 'mcq'
    + option_e        VARCHAR(500) NULL
    + negative_marks  FLOAT        DEFAULT 0
    ~ correct_answer  VARCHAR(10) -> VARCHAR(30)

Every step is idempotent (guarded by an inspector column check); the widen is
issued only on MySQL (SQLite does not enforce VARCHAR length, so create_all is
enough there). Run once per .env target -- local AND production:

    python migrate_public_question_formats.py

Safety: importing `app` connects to whatever backend/.env points at. Confirm the
target printed on the first line before trusting the result.
"""
import os
import sys

from sqlalchemy import inspect, text

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app          # noqa: E402
from models import db        # noqa: E402


def _cols(table):
    return {c['name']: c for c in inspect(db.engine).get_columns(table)}


def _add(table, col, ddl):
    if col in _cols(table):
        print(f'  {table}.{col} already present')
        return
    db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
    db.session.commit()
    print(f'  + {table}.{col}')


def _widen_correct_answer(table):
    """MySQL-only: widen correct_answer so MSQ lists / NAT ranges fit."""
    if db.engine.dialect.name != 'mysql':
        print(f'  {table}.correct_answer widen skipped ({db.engine.dialect.name})')
        return
    col = _cols(table).get('correct_answer')
    length = getattr(col['type'], 'length', None) if col else None
    if length and length >= 30:
        print(f'  {table}.correct_answer already >= 30')
        return
    db.session.execute(text(
        f'ALTER TABLE {table} MODIFY COLUMN correct_answer VARCHAR(30) NOT NULL'))
    db.session.commit()
    print(f'  ~ {table}.correct_answer -> VARCHAR(30)')


def _float_score(table):
    """MySQL-only: widen an INT score column to FLOAT for fractional scoring."""
    if db.engine.dialect.name != 'mysql':
        print(f'  {table}.score widen skipped ({db.engine.dialect.name})')
        return
    col = _cols(table).get('score')
    if col is not None and 'float' in str(col['type']).lower():
        print(f'  {table}.score already FLOAT')
        return
    db.session.execute(text(f'ALTER TABLE {table} MODIFY COLUMN score FLOAT NULL'))
    db.session.commit()
    print(f'  ~ {table}.score -> FLOAT')


def main():
    with app.app_context():
        print('target:', db.engine.url.host, '/', db.engine.url.database)

        print('public_question_repository:')
        _add('public_question_repository', 'option_e', 'option_e VARCHAR(500) NULL')
        _add('public_question_repository', 'negative_marks', 'negative_marks FLOAT DEFAULT 0')
        _widen_correct_answer('public_question_repository')

        print('public_pending_image_questions:')
        _add('public_pending_image_questions', 'question_format', "question_format VARCHAR(30) DEFAULT 'mcq'")
        _add('public_pending_image_questions', 'option_e', 'option_e VARCHAR(500) NULL')
        _add('public_pending_image_questions', 'negative_marks', 'negative_marks FLOAT DEFAULT 0')
        _widen_correct_answer('public_pending_image_questions')

        # Practice/mock score becomes fractional once negative marking applies.
        print('public_practice_attempts:')
        _float_score('public_practice_attempts')

        print('done')


if __name__ == '__main__':
    main()
