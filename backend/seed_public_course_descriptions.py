"""Write the public-facing description for every B2C course.

The catalog and course pages read PublicCourse.description directly. NEET and
JEE were created before the field was used and carry NULL, and the wave-1
government exams only had a one-line stub — both render as bare, empty-looking
pages. This fills every published course with a real blurb: what the exam is,
who conducts it, and what the course gives you here.

Matches courses by title (case-insensitive), so it is safe to re-run and will
skip any course it does not know about.

    python seed_public_course_descriptions.py            # preflight: print plan
    python seed_public_course_descriptions.py --execute  # write to the .env target

Safety: importing app connects to whatever backend/.env points at. The target
host/db is printed first — confirm it before using --execute.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app                          # noqa: E402
from models import db, PublicCourse          # noqa: E402


# title (matched case-insensitively) -> description
DESCRIPTIONS = {
    'NEET': (
        'NEET (UG) is the single national entrance test for MBBS, BDS, AYUSH and allied '
        'medical seats across India, conducted by the NTA. This course gives you the full '
        'Physics, Chemistry, Botany and Zoology question bank drawn from the NCERT Class 11 '
        'and 12 syllabus, chapter-wise practice you can scope to any topic, and timed CBT '
        'mocks that mirror the real 180-question, 720-mark paper — with the same +4 / −1 '
        'marking, so your score here means what it will on exam day.'
    ),
    'JEE': (
        'JEE is the gateway to the IITs, NITs, IIITs and every major engineering college in '
        'India — Main is conducted by the NTA, Advanced by the IITs. This course covers '
        'Physics, Chemistry and Mathematics across the full Class 11 and 12 syllabus, with '
        'chapter-wise practice, numerical-answer (NAT) questions alongside MCQs, and timed '
        'full-length mocks under real exam marking so you learn to manage the paper, not '
        'just the topics.'
    ),
    'SSC CGL': (
        'SSC CGL is the Staff Selection Commission\'s Combined Graduate Level examination — '
        'the main route into Group B and Group C posts across central government ministries '
        'and departments. This course covers all four Tier-1 sections: Quantitative Aptitude, '
        'General Intelligence & Reasoning, General Awareness and English Comprehension, with '
        'chapter-wise practice and timed mocks that follow the real 100-question, 200-mark '
        'pattern including its 0.50 negative marking.'
    ),
    'Railways RRB NTPC': (
        'RRB NTPC is the Railway Recruitment Board\'s exam for non-technical popular '
        'categories — Station Master, Goods Guard, Clerk, Junior Accounts Assistant and more '
        '— and shares its syllabus closely with RRB Group-D. This course covers Mathematics, '
        'General Intelligence & Reasoning and General Awareness, with chapter-wise practice '
        'and CBT mocks that follow the real CBT-1 / CBT-2 pattern and its 1/3-mark penalty '
        'for wrong answers.'
    ),
    'Police Recruitment': (
        'State police recruitment boards hire Constables and Sub-Inspectors through a written '
        'exam covering Arithmetic, Reasoning and General Knowledge, followed by physical and '
        'medical tests. This course targets that written stage: chapter-wise practice across '
        'all three sections, current-affairs-aware General Knowledge, and timed mocks so you '
        'walk into the hall already used to the clock. Patterns vary slightly by state — '
        'always confirm against your board\'s current notification.'
    ),
    'Banking (IBPS / SBI)': (
        'The IBPS and SBI exams recruit Probationary Officers and Clerks across public sector '
        'banks, and both run a speed-driven Prelims followed by a sectional Mains. This course '
        'covers Quantitative Aptitude, Reasoning Ability, English Language, and General '
        'Awareness with Banking & Current Affairs — including the five-option question style '
        'banking papers use — with chapter-wise practice and timed mocks under 0.25 negative '
        'marking.'
    ),
    'GATE': (
        'GATE is the Graduate Aptitude Test in Engineering, conducted by the IITs and IISc for '
        'M.Tech and MS admissions, PSU recruitment and research fellowships. This course '
        'currently covers the General Aptitude section common to every GATE paper — Verbal '
        'Ability and Numerical Ability — with the exact formats GATE uses: MCQ, multiple-select '
        '(MSQ, no negative marking) and numerical-answer (NAT) questions. Branch-specific '
        'technical sections are being added.'
    ),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true', help='write to the DB (default: dry-run)')
    args = ap.parse_args()

    with app.app_context():
        print('target:', db.engine.url.host, '/', db.engine.url.database, '\n')

        courses = PublicCourse.query.order_by(PublicCourse.id).all()
        by_title = {(c.title or '').strip().lower(): c for c in courses}

        touched = 0
        for title, desc in DESCRIPTIONS.items():
            c = by_title.get(title.strip().lower())
            if not c:
                print(f'  [skip  ] {title:22s} — no such course')
                continue
            before = len(c.description or '')
            if (c.description or '').strip() == desc:
                print(f'  [same  ] {title:22s} — already current ({before} chars)')
                continue
            action = 'fill' if before == 0 else 'update'
            print(f'  [{action:6s}] {title:22s} {before} -> {len(desc)} chars')
            c.description = desc
            touched += 1

        unknown = [c.title for c in courses
                   if (c.title or '').strip().lower() not in
                   {t.strip().lower() for t in DESCRIPTIONS}]
        if unknown:
            print('\n  untouched courses (no description defined here):')
            for t in unknown:
                print(f'    - {t}')

        if args.execute:
            db.session.commit()
            print(f'\ndone — committed {touched} change(s).')
        else:
            db.session.rollback()
            print(f'\ndry-run only — {touched} change(s) pending. Re-run with --execute to write.')


if __name__ == '__main__':
    main()
