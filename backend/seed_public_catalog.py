"""Seed the B2C competitive-exam catalog: courses + a small sample question bank.

Creates/updates the wave-1 government exams (SSC CGL, Railways / RRB, Police),
Banking, and a GATE shell. Each course is tagged so the shared subject pools
(Aptitude, Reasoning, GK, English) light up across every exam that includes them
— e.g. one APTITUDE question surfaces in SSC CGL, RRB, Police and Banking at once
(see taxonomy.py / scope_repo_query). Also seeds a handful of sample questions
covering every format (mcq, 5-option mcq, msq, nat) with negative marking, so the
engine is end-to-end testable before real content is bulk-loaded.

Idempotent: courses upsert by title, questions upsert by custom_id.

    python seed_public_catalog.py            # preflight: print target + plan
    python seed_public_catalog.py --execute  # write to the .env target

Safety: importing app connects to whatever backend/.env points at. The target
host/db is printed first — confirm it before using --execute.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app                                        # noqa: E402
from models import db, User, PublicCourse, PublicQuestionRepo  # noqa: E402
import taxonomy as T                                       # noqa: E402


# (title, description, price, status, target_tags)
COURSES = [
    ('SSC CGL',
     'Staff Selection Commission — Combined Graduate Level. Tier-1 practice & full mocks.',
     0.0, 'published', T.target_tags(T.SSCCGL, T.APTITUDE, T.REASONING, T.GK, T.ENGLISH)),
    ('Railways RRB NTPC',
     'RRB NTPC & Group-D practice across Aptitude, Reasoning and General Awareness.',
     0.0, 'published', T.target_tags(T.RRB, T.APTITUDE, T.REASONING, T.GK)),
    ('Police Recruitment',
     'Constable / SI group practice — Aptitude, Reasoning and GK.',
     0.0, 'published', T.target_tags(T.POLICE, T.APTITUDE, T.REASONING, T.GK)),
    ('Banking (IBPS / SBI)',
     'Bank PO & Clerk prelims — Quantitative Aptitude, Reasoning, English, GK & Current Affairs.',
     0.0, 'published', T.target_tags(T.BANKING, T.APTITUDE, T.REASONING, T.ENGLISH, T.GK, T.CURRENTAFFAIRS)),
    ('GATE',
     'Graduate Aptitude Test in Engineering — General Aptitude + technical (content coming soon).',
     0.0, 'draft', T.target_tags(T.GATE, T.APTITUDE, T.ENGLISH)),
]


def _q(custom_id, tags, subject, chapter, fmt, text, a, b, c, d, e, correct,
       explanation, marks=1, neg=0.0, is_pyq=False, pyq_year=None):
    return dict(custom_id=custom_id, course_tags=tags, subject=subject, chapter=chapter,
                question_format=fmt, text=text, option_a=a, option_b=b, option_c=c,
                option_d=d, option_e=e, correct_answer=correct, explanation=explanation,
                marks=marks, negative_marks=neg, is_pyq=is_pyq, pyq_year=pyq_year)


# Shared-pool questions carry ONLY the pool tag — they appear in every course
# whose target_tags include that pool. Exam-specific ones carry the exam tag.
QUESTIONS = [
    # ---- Quantitative Aptitude (shared: SSC/RRB/Police/Banking/GATE) ----
    _q('SEED-APT-001', T.APTITUDE, 'Quantitative Aptitude', 'Speed & Distance', 'mcq',
       'A train 120 m long runs at 54 km/h. How long does it take to pass a pole?',
       '6 s', '8 s', '10 s', '12 s', None, 'B',
       '54 km/h = 15 m/s; time = 120 / 15 = 8 s.', marks=1, neg=0.25),
    _q('SEED-APT-002', T.APTITUDE, 'Quantitative Aptitude', 'Averages', 'nat',
       'Find the average of the first five multiples of 5 (i.e. 5, 10, 15, 20, 25).',
       None, None, None, None, None, '15',
       'Sum = 75; average = 75 / 5 = 15.', marks=1, neg=0),
    _q('SEED-APT-003', T.APTITUDE, 'Quantitative Aptitude', 'Percentages', 'nat',
       'What is 12.5% of 320?', None, None, None, None, None, '39.5|40.5',
       '12.5% of 320 = 40.', marks=1, neg=0),

    # ---- Reasoning (shared) ----
    _q('SEED-REA-001', T.REASONING, 'Logical Reasoning', 'Number Series', 'mcq',
       'Find the next term: 2, 6, 12, 20, 30, ?',
       '36', '40', '42', '44', None, 'C',
       'Differences 4,6,8,10,12 → 30 + 12 = 42.', marks=1, neg=0.25),

    # ---- General Knowledge (shared) — includes a 5-option Banking-style item ----
    _q('SEED-GK-001', T.GK, 'General Knowledge', 'World Capitals', 'mcq',
       'What is the capital of Australia?',
       'Sydney', 'Melbourne', 'Canberra', 'Perth', None, 'C',
       'Canberra is the capital of Australia.', marks=1, neg=0.25),
    _q('SEED-GK-002', T.GK, 'General Knowledge', 'Currencies', 'mcq',
       'The currency of Japan is the:',
       'Yuan', 'Won', 'Ringgit', 'Baht', 'Yen', 'E',
       'Japan uses the Yen (5-option Banking-style item).', marks=1, neg=0.25),

    # ---- English (shared: SSC/Banking/GATE) ----
    _q('SEED-ENG-001', T.ENGLISH, 'English Language', 'Synonyms', 'mcq',
       'Choose the word most similar in meaning to "ABUNDANT".',
       'Scarce', 'Plentiful', 'Tiny', 'Rare', None, 'B',
       'Abundant means existing in large quantities → plentiful.', marks=1, neg=0.25),

    # ---- Exam-specific ----
    _q('SEED-SSC-001', T.SSCCGL, 'General Studies', 'Indian Polity', 'mcq',
       'How many fundamental rights are guaranteed by the Constitution of India (present)?',
       'Five', 'Six', 'Seven', 'Eight', None, 'B',
       'Six fundamental rights (Right to Property was removed in 1978).', marks=1, neg=0.5, is_pyq=True, pyq_year=2022),

    # ---- GATE-style complex formats (msq + nat, no negative marking on MSQ) ----
    _q('SEED-GATE-001', T.GATE, 'General Aptitude', 'Data Interpretation', 'msq',
       'Which of the following numbers are prime? (Select all that apply.)',
       '2', '9', '17', '21', None, 'A,C',
       '2 and 17 are prime; 9 = 3×3 and 21 = 3×7 are not.', marks=2, neg=0),
    _q('SEED-GATE-002', T.GATE, 'General Aptitude', 'Numerical Ability', 'nat',
       'If x + 1/x = 3, find x^2 + 1/x^2.',
       None, None, None, None, None, '7',
       '(x + 1/x)^2 = x^2 + 1/x^2 + 2 → 9 - 2 = 7.', marks=2, neg=0),
]


def upsert_courses(admin_id, execute):
    for title, desc, price, status, tags in COURSES:
        c = PublicCourse.query.filter_by(title=title).first()
        if c:
            action = 'update'
            c.description, c.price, c.status, c.target_tags = desc, price, status, tags
        else:
            action = 'create'
            c = PublicCourse(title=title, description=desc, price=price, status=status,
                             target_tags=tags, created_by=admin_id)
            if execute:
                db.session.add(c)
        print(f'  [{action}] course: {title:22s} tags={tags}')
    if execute:
        db.session.commit()


def upsert_questions(execute):
    for row in QUESTIONS:
        q = PublicQuestionRepo.query.filter_by(custom_id=row['custom_id']).first()
        if q:
            action = 'update'
            for k, v in row.items():
                setattr(q, k, v)
        else:
            action = 'create'
            q = PublicQuestionRepo(**row)
            if execute:
                db.session.add(q)
        print(f"  [{action}] q {row['custom_id']:14s} fmt={row['question_format']:4s} "
              f"tags={row['course_tags']:8s} subj={row['subject']}")
    if execute:
        db.session.commit()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true', help='write to the DB (default: dry-run)')
    args = ap.parse_args()

    with app.app_context():
        print('target:', db.engine.url.host, '/', db.engine.url.database)
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            print('ERROR: no admin user found — run create_first_admin.py first.')
            sys.exit(1)
        print('using admin id:', admin.id, '\n')

        print('COURSES:')
        upsert_courses(admin.id, args.execute)
        print('\nSAMPLE QUESTIONS:')
        upsert_questions(args.execute)

        if args.execute:
            print('\ndone — committed.')
        else:
            print('\ndry-run only — re-run with --execute to write.')


if __name__ == '__main__':
    main()
