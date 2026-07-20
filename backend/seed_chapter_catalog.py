"""Seed the canonical Mathematics chapter catalog for both boards.

Two syllabi, kept side by side rather than merged:

* **AP-TS** — the BIEAP/BIETS Intermediate syllabus, 38 chapters split across
  the four papers colleges actually sit (1A/1B for first year, 2A/2B for
  second). These names match the strings already in the repository exactly, so
  existing questions line up without being renamed.

* **CBSE** — the 29 NCERT chapters in book order, class 11 and class 12. CBSE
  has no paper division, so `paper_code` stays NULL; no artificial A/B split is
  invented for it.

`concept_group` links chapters teaching the same material across the two
boards. Note it is many-to-many, not a rename map: NCERT's single 'Conic
Sections' corresponds to five AP chapters, and two NCERT chapters
('Limits and Derivatives', 'Continuity & Differentiability') both map onto the
same pair of AP ones. A school browsing one board's chapter can pull questions
from the other board's equivalents; nothing is moved or copied.

Idempotent — upserts on (board, subject, class_number, chapter). Safe to re-run
after editing the tables below.

    python seed_chapter_catalog.py
"""
from app import app
from models import db, ChapterCatalog


SUBJECT = 'Mathematics'

# (paper_code, chapter, concept_group) in syllabus order.
AP_TS = {
    '11': [
        ('1A', 'Functions',                                 'relations-functions'),
        ('1A', 'Mathematical Induction',                    'induction'),
        ('1A', 'Matrices',                                  'matrices'),
        ('1A', 'Addition of Vectors',                       'vectors'),
        ('1A', 'Product of Vectors',                        'vectors'),
        ('1A', 'Trigonometric Ratios upto Transformations', 'trig-functions'),
        ('1A', 'Trigonometric Equations',                   'trig-functions'),
        ('1A', 'Inverse Trigonometric Functions',           'inverse-trig'),
        ('1A', 'Hyperbolic Functions',                      None),
        ('1A', 'Properties of Triangles',                   None),

        ('1B', 'Locus',                                     'straight-lines'),
        ('1B', 'Transformation of Axes',                    'straight-lines'),
        ('1B', 'The Straight Line',                         'straight-lines'),
        ('1B', 'Pair of Straight Lines',                    'straight-lines'),
        ('1B', 'Three Dimensional Coordinates',             'coord-3d'),
        ('1B', 'Direction Cosines and Direction Ratios',    'coord-3d'),
        ('1B', 'The Plane',                                 'coord-3d'),
        ('1B', 'Limits and Continuity',                     'limits-diff'),
        ('1B', 'Differentiation',                           'limits-diff'),
        ('1B', 'Applications of Derivatives',               'derivatives-app'),
    ],
    '12': [
        ('2A', 'Complex Numbers',                           'complex-quadratic'),
        ('2A', 'De Moivres Theorem',                        'complex-quadratic'),
        ('2A', 'Quadratic Expressions',                     'complex-quadratic'),
        ('2A', 'Theory of Equations',                       'complex-quadratic'),
        ('2A', 'Permutations and Combinations',             'permutations'),
        ('2A', 'Binomial Theorem',                          'binomial'),
        ('2A', 'Partial Fractions',                         None),
        ('2A', 'Measures of Dispersion',                    'statistics'),
        ('2A', 'Probability',                               'probability'),
        ('2A', 'Random Variables',                          'probability'),

        ('2B', 'Circle',                                    'conics'),
        ('2B', 'System of Circles',                         'conics'),
        ('2B', 'Parabola',                                  'conics'),
        ('2B', 'Ellipse',                                   'conics'),
        ('2B', 'Hyperbola',                                 'conics'),
        ('2B', 'Integration',                               'integrals'),
        ('2B', 'Definite Integrals',                        'integrals'),
        ('2B', 'Differential Equations',                    'differential-eq'),
    ],
}

# (chapter, concept_group) in NCERT book order. No paper codes.
CBSE = {
    '11': [
        ('Sets',                                  None),
        ('Relations & Functions',                 'relations-functions'),
        ('Trigonometric Functions',               'trig-functions'),
        ('Principles of Mathematical Induction',  'induction'),
        ('Complex Numbers & Quadratic Equations', 'complex-quadratic'),
        ('Linear Inequalities',                   None),
        ('Permutations & Combinations',           'permutations'),
        ('Binomial Theorem',                      'binomial'),
        ('Sequences & Series',                    None),
        ('Straight Lines',                        'straight-lines'),
        ('Conic Sections',                        'conics'),
        ('Introduction to 3D Geometry',           'coord-3d'),
        ('Limits and Derivatives',                'limits-diff'),
        ('Mathematical Reasoning',                None),
        ('Statistics',                            'statistics'),
        ('Probability',                           'probability'),
    ],
    '12': [
        ('Relations & Functions-II',              'relations-functions'),
        ('Inverse Trigonometric Functions',       'inverse-trig'),
        ('Matrices',                              'matrices'),
        ('Determinants',                          None),
        ('Continuity & Differentiability',        'limits-diff'),
        ('Applications of Derivatives',           'derivatives-app'),
        ('Integrals',                             'integrals'),
        ('Applications of Integrals',             'integrals'),
        ('Differential Equations',                'differential-eq'),
        ('Vector Algebra',                        'vectors'),
        ('3D Geometry',                           'coord-3d'),
        ('Linear Programming',                    None),
        ('Probability-II',                        'probability'),
    ],
}


def rows():
    for class_number, entries in AP_TS.items():
        for seq, (paper, chapter, group) in enumerate(entries, start=1):
            yield ('AP-TS', class_number, paper, chapter, group, seq)
    for class_number, entries in CBSE.items():
        for seq, (chapter, group) in enumerate(entries, start=1):
            yield ('CBSE', class_number, None, chapter, group, seq)


def main():
    with app.app_context():
        print(f"Target database host: {db.engine.url.host}")
        db.create_all()

        created = updated = 0
        for board, class_number, paper, chapter, group, seq in rows():
            existing = ChapterCatalog.query.filter_by(
                board=board, subject=SUBJECT,
                class_number=class_number, chapter=chapter,
            ).first()

            if existing:
                existing.paper_code = paper
                existing.concept_group = group
                existing.sequence = seq
                existing.is_active = True
                updated += 1
            else:
                db.session.add(ChapterCatalog(
                    board=board, subject=SUBJECT, class_number=class_number,
                    paper_code=paper, chapter=chapter,
                    concept_group=group, sequence=seq, is_active=True,
                ))
                created += 1

        db.session.commit()

        print(f"Created {created}, updated {updated}")
        for board in ('AP-TS', 'CBSE'):
            for cls in ('11', '12'):
                n = ChapterCatalog.query.filter_by(
                    board=board, class_number=cls).count()
                print(f"  {board:<6} class {cls}: {n} chapters")

    print("\nDone.")


if __name__ == "__main__":
    main()
