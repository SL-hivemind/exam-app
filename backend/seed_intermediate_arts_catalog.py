"""Seed the AP-TS Intermediate arts/commerce subjects (MEC / CEC / HEC streams).

The three non-science Intermediate streams share a small set of subjects beyond
Mathematics (which is already catalogued):

    MEC = Mathematics + Economics + Commerce
    CEC = Civics (Political Science) + Economics + Commerce
    HEC = History + Economics + Civics

So the union of *new* subjects is just four — Economics, Commerce, Civics
(Political Science) and History. Per the project decision there is **no stream
entity**: these are ordinary subjects on the existing (board, class, subject,
chapter) axis, exactly like Physics or Mathematics. Only the AP-TS board is
seeded; year 1 = class 11, year 2 = class 12. These subjects have a single paper
per year (unlike Maths' 1A/1B split), so paper_code stays NULL and the year is
carried by class_number.

Idempotent — chapters upsert on (board, subject, class_number, chapter); sample
questions upsert on (board, subject, class_number, chapter, text). Safe to re-run.

    python seed_intermediate_arts_catalog.py
"""
from app import app
from models import db, ChapterCatalog, QuestionRepository, User

BOARD = 'AP-TS'

# subject -> {class_number: [chapter, ...]} in syllabus order. paper_code = NULL.
CATALOG = {
    'Economics': {
        '11': [
            'Introduction to Economics',
            'Consumption & Demand Analysis',
            'Production & Cost Analysis',
            'Market Structures & Price Determination',
            'National Income',
            'Money, Banking & Inflation',
        ],
        '12': [
            'Economic Growth & Development',
            'Agriculture in the Indian Economy',
            'Industrial Sector',
            'Service (Tertiary) Sector',
            'Economic Planning & Reforms',
            'Public Finance & Budget',
        ],
    },
    'Commerce': {
        '11': [
            'Concept & Functions of Business',
            'Forms of Business Organisation',
            'Sources of Business Finance',
            'Formation of a Company',
            'Micro, Small & Medium Enterprises',
            'Internal Trade',
        ],
        '12': [
            'Principles of Management',
            'Business Environment',
            'Marketing Management',
            'Banking',
            'Insurance',
            'Foreign Trade',
        ],
    },
    'Civics': {
        '11': [
            'Introduction to Political Science',
            'State, Nation & Sovereignty',
            'Democracy',
            'Rights & Duties',
            'Organs of Government',
            'Local Self-Government',
        ],
        '12': [
            'Salient Features of the Indian Constitution',
            'Fundamental Rights & Duties',
            'Union Government',
            'State Government',
            'Election System & Party System',
            'India & International Relations',
        ],
    },
    'History': {
        '11': [
            'Sources & Concept of History',
            'Ancient Indian Civilisations',
            'The Vedic Age',
            'Rise of Magadha & the Mauryan Empire',
            'The Gupta Age',
            'South Indian Kingdoms',
        ],
        '12': [
            'The Delhi Sultanate',
            'The Mughal Empire',
            'Advent of the Europeans',
            'British Rule & Administration',
            'The Indian National Movement',
            'Post-Independence India',
        ],
    },
}

# A couple of sample questions so each new subject has real, gradable content to
# preview. (subject, class_number, chapter, text, a, b, c, d, correct)
SAMPLE_QUESTIONS = [
    ('Economics', '11', 'Introduction to Economics',
     'Who wrote "An Enquiry into the Nature and Causes of the Wealth of Nations"?',
     'Alfred Marshall', 'Adam Smith', 'J. M. Keynes', 'David Ricardo', 'B'),
    ('Commerce', '11', 'Forms of Business Organisation',
     'The liability of a shareholder in a public limited company is:',
     'Unlimited', 'Limited to the face value of shares held', 'Nil', 'Limited to personal assets', 'B'),
    ('Civics', '12', 'Fundamental Rights & Duties',
     'How many Fundamental Rights are currently guaranteed by the Constitution of India?',
     'Five', 'Six', 'Seven', 'Eight', 'B'),
    ('History', '11', 'Rise of Magadha & the Mauryan Empire',
     'Who was the founder of the Mauryan Empire?',
     'Bindusara', 'Ashoka', 'Chandragupta Maurya', 'Bimbisara', 'C'),
]


def seed_catalog():
    created = updated = 0
    for subject, by_class in CATALOG.items():
        for class_number, chapters in by_class.items():
            for seq, chapter in enumerate(chapters, start=1):
                existing = ChapterCatalog.query.filter_by(
                    board=BOARD, subject=subject,
                    class_number=class_number, chapter=chapter,
                ).first()
                if existing:
                    existing.paper_code = None
                    existing.concept_group = None
                    existing.sequence = seq
                    existing.is_active = True
                    updated += 1
                else:
                    db.session.add(ChapterCatalog(
                        board=BOARD, subject=subject, class_number=class_number,
                        paper_code=None, chapter=chapter,
                        concept_group=None, sequence=seq, is_active=True,
                    ))
                    created += 1
    db.session.commit()
    print(f"Chapter catalog: created {created}, updated {updated}")


def seed_sample_questions(admin_id):
    created = skipped = 0
    for subject, class_number, chapter, text, a, b, c, d, correct in SAMPLE_QUESTIONS:
        existing = QuestionRepository.query.filter_by(
            board=BOARD, subject=subject, class_number=class_number,
            chapter=chapter, text=text,
        ).first()
        if existing:
            skipped += 1
            continue
        db.session.add(QuestionRepository(
            school_id=None,                 # global — visible to every school
            created_by=admin_id,
            subject=subject, class_number=class_number, chapter=chapter,
            board=BOARD, paper_code=None, difficulty='Medium',
            text=text, option_a=a, option_b=b, option_c=c, option_d=d,
            correct_answer=correct, marks=1,
        ))
        created += 1
    db.session.commit()
    print(f"Sample questions: created {created}, skipped {skipped}")


def main():
    with app.app_context():
        print(f"Target database host: {db.engine.url.host}")
        db.create_all()

        seed_catalog()

        admin = User.query.filter_by(role='admin').first()
        if admin:
            seed_sample_questions(admin.id)
        else:
            print("No admin user found — skipped sample questions "
                  "(catalog seeded; run create_first_admin.py to add samples).")

        for subject in CATALOG:
            for cls in ('11', '12'):
                n = ChapterCatalog.query.filter_by(
                    board=BOARD, subject=subject, class_number=cls).count()
                print(f"  {subject:<10} class {cls}: {n} chapters")

    print("\nDone.")


if __name__ == "__main__":
    main()
