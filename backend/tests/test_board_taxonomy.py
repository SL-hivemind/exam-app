"""Tests for the board/paper_code taxonomy migration and chapter catalog.

Rebuilds the production maths distribution in sqlite — the same six subject
labels, chapters and row counts observed in the live repository — then runs the
migration's real routing rules against it. The counts asserted here are the
ones the live run must reproduce.
"""
import pytest

from app import app, db
from models import ChapterCatalog, QuestionRepository, User, generate_short_id
from migrate_add_board_taxonomy import apply_backfill
import seed_chapter_catalog


# (subject label, chapter, count) exactly as found in the live repository.
LIVE_DISTRIBUTION = [
    # Mathematics 1A: 10 genuine AP chapters at 25 each ...
    ('Mathematics 1A', 'Functions', 25),
    ('Mathematics 1A', 'Mathematical Induction', 25),
    ('Mathematics 1A', 'Matrices', 25),
    ('Mathematics 1A', 'Addition of Vectors', 25),
    ('Mathematics 1A', 'Product of Vectors', 25),
    ('Mathematics 1A', 'Trigonometric Ratios upto Transformations', 25),
    ('Mathematics 1A', 'Trigonometric Equations', 25),
    ('Mathematics 1A', 'Inverse Trigonometric Functions', 25),
    ('Mathematics 1A', 'Hyperbolic Functions', 25),
    ('Mathematics 1A', 'Properties of Triangles', 25),
    # ... plus three NCERT chapters that do not belong to AP 1A at all.
    ('Mathematics 1A', 'Sets', 139),
    ('Mathematics 1A', 'Complex Numbers & Quadratic Equations', 143),
    ('Mathematics 1A', 'Statistics', 97),

    # CSV typo, NCERT content.
    ('Mathematics 1A 1A', 'Binomial Theorem', 93),
    # CSV typo, duplicate of the mis-filed CBSE chapter above.
    ('Mathematics', 'Complex Numbers & Quadratic Equations', 25),

    ('Mathematics 1B', 'Locus', 23),
    ('Mathematics 1B', 'Transformation of Axes', 24),
    ('Mathematics 1B', 'The Straight Line', 25),
    ('Mathematics 1B', 'Pair of Straight Lines', 22),
    ('Mathematics 1B', 'Three Dimensional Coordinates', 23),
    ('Mathematics 1B', 'Direction Cosines and Direction Ratios', 21),
    ('Mathematics 1B', 'The Plane', 22),
    ('Mathematics 1B', 'Limits and Continuity', 25),
    ('Mathematics 1B', 'Differentiation', 25),
    ('Mathematics 1B', 'Applications of Derivatives', 19),
]
LIVE_DISTRIBUTION += [('Maths 2A', ch, 30) for ch in (
    'Complex Numbers', 'De Moivres Theorem', 'Quadratic Expressions',
    'Theory of Equations', 'Permutations and Combinations', 'Binomial Theorem',
    'Partial Fractions', 'Measures of Dispersion', 'Probability',
    'Random Variables',
)]
LIVE_DISTRIBUTION += [('Maths 2B', ch, 30) for ch in (
    'Circle', 'System of Circles', 'Parabola', 'Ellipse', 'Hyperbola',
    'Integration', 'Definite Integrals', 'Differential Equations',
)]

CLASS_OF = {
    'Mathematics 1A': '11', 'Mathematics 1A 1A': '11', 'Mathematics': '11',
    'Mathematics 1B': '11', 'Maths 2A': '12', 'Maths 2B': '12',
}


@pytest.fixture
def seeded():
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

    with app.app_context():
        db.create_all()

        admin = User(username='bt_admin', role='admin', email='bt@example.com')
        admin.set_password('adminpass123')
        db.session.add(admin)
        db.session.commit()

        serial = 0
        for label, chapter, count in LIVE_DISTRIBUTION:
            cls = CLASS_OF[label]
            for _ in range(count):
                serial += 1
                db.session.add(QuestionRepository(
                    custom_id=f'ID-{serial:05d}',
                    subject=label, class_number=cls, chapter=chapter,
                    text=f'{label}/{chapter} #{serial}',
                    correct_answer='a', created_by=admin.id,
                ))
        # Untagged non-maths content, which must survive the migration
        # completely untouched.
        for cls in ('11', '12'):
            db.session.add(QuestionRepository(
                custom_id=f'PHY-{cls}', subject='Physics', class_number=cls,
                chapter='Laws of Motion', text=f'physics {cls}',
                correct_answer='a', created_by=admin.id,
            ))
        db.session.commit()
        yield
        db.session.remove()
        db.drop_all()


def counts_by(*cols):
    rows = db.session.query(
        *[getattr(QuestionRepository, c) for c in cols],
        db.func.count(QuestionRepository.id),
    ).group_by(*[getattr(QuestionRepository, c) for c in cols]).all()
    return {tuple(r[:-1]): r[-1] for r in rows}


def run_migration():
    conn = db.session.connection()
    apply_backfill(conn, verbose=False)
    db.session.commit()


def test_live_distribution_matches_observed_totals(seeded):
    """Guards the fixture itself against drift from the numbers we measured."""
    with app.app_context():
        assert QuestionRepository.query.filter(
            QuestionRepository.subject.ilike('%math%')).count() == 1516


def test_ap_buckets_get_expected_counts(seeded):
    with app.app_context():
        run_migration()
        got = counts_by('board', 'paper_code')
        assert got[('AP-TS', '1A')] == 250
        assert got[('AP-TS', '1B')] == 229
        assert got[('AP-TS', '2A')] == 300
        assert got[('AP-TS', '2B')] == 240


def test_misfiled_ncert_questions_move_to_cbse_class_11(seeded):
    with app.app_context():
        run_migration()
        cbse = QuestionRepository.query.filter_by(board='CBSE').all()
        assert len(cbse) == 497
        assert {q.class_number for q in cbse} == {'11'}
        # CBSE has no paper split.
        assert {q.paper_code for q in cbse} == {None}
        assert {q.chapter for q in cbse} == {
            'Sets', 'Complex Numbers & Quadratic Equations',
            'Statistics', 'Binomial Theorem',
        }


def test_ap_1a_no_longer_contains_ncert_chapters(seeded):
    with app.app_context():
        run_migration()
        chapters = {q.chapter for q in QuestionRepository.query.filter_by(
            board='AP-TS', paper_code='1A')}
        assert len(chapters) == 10
        assert not chapters & {'Sets', 'Statistics', 'Binomial Theorem'}


def test_ambiguous_binomial_theorem_splits_correctly(seeded):
    """'Binomial Theorem' exists in both the mis-filed batch and genuine AP 2A."""
    with app.app_context():
        run_migration()
        rows = QuestionRepository.query.filter_by(chapter='Binomial Theorem').all()
        by_board = {}
        for r in rows:
            by_board.setdefault(r.board, 0)
            by_board[r.board] += 1
        assert by_board == {'CBSE': 93, 'AP-TS': 30}


def test_subject_is_normalised_and_custom_ids_are_unchanged(seeded):
    with app.app_context():
        before = {(q.id, q.custom_id) for q in QuestionRepository.query}
        run_migration()

        maths = QuestionRepository.query.filter(
            QuestionRepository.class_number.in_(('11', '12')),
            QuestionRepository.subject.ilike('%math%'))
        assert {q.subject for q in maths} == {'Mathematics'}

        after = {(q.id, q.custom_id) for q in QuestionRepository.query}
        assert after == before


def test_subject_abbreviation_is_stable_across_the_rename(seeded):
    """Why custom_ids survive: every maths label abbreviates to the same code."""
    with app.app_context():
        codes = {
            generate_short_id('11', label, 'Sets').split('-')[1]
            for label in ('Mathematics 1A', 'Mathematics 1A 1A',
                          'Maths 2A', 'Mathematics')
        }
        assert codes == {'MAT'}


def test_non_maths_content_is_left_untagged(seeded):
    with app.app_context():
        run_migration()
        physics = QuestionRepository.query.filter_by(subject='Physics').all()
        assert len(physics) == 2
        assert {q.board for q in physics} == {None}


def test_migration_is_idempotent(seeded):
    with app.app_context():
        run_migration()
        first = counts_by('board', 'paper_code')
        run_migration()
        assert counts_by('board', 'paper_code') == first


def test_total_row_count_is_preserved(seeded):
    with app.app_context():
        before = QuestionRepository.query.count()
        run_migration()
        assert QuestionRepository.query.count() == before


# ── catalog ──────────────────────────────────────────────────────────────────

def test_catalog_seeds_both_boards(seeded):
    with app.app_context():
        seed_chapter_catalog.main()

        assert ChapterCatalog.query.filter_by(board='AP-TS').count() == 38
        assert ChapterCatalog.query.filter_by(
            board='CBSE', class_number='11').count() == 16
        assert ChapterCatalog.query.filter_by(
            board='CBSE', class_number='12').count() == 13

        # CBSE carries no paper codes; AP-TS carries one on every row.
        assert {c.paper_code for c in ChapterCatalog.query.filter_by(
            board='CBSE')} == {None}
        assert None not in {c.paper_code for c in ChapterCatalog.query.filter_by(
            board='AP-TS')}


def test_catalog_seed_is_idempotent(seeded):
    with app.app_context():
        seed_chapter_catalog.main()
        seed_chapter_catalog.main()
        assert ChapterCatalog.query.count() == 67


def test_concept_group_links_conics_across_boards(seeded):
    """NCERT's one 'Conic Sections' maps to five AP chapters, not one."""
    with app.app_context():
        seed_chapter_catalog.main()
        group = ChapterCatalog.query.filter_by(concept_group='conics').all()
        assert {c.chapter for c in group if c.board == 'CBSE'} == {'Conic Sections'}
        assert {c.chapter for c in group if c.board == 'AP-TS'} == {
            'Circle', 'System of Circles', 'Parabola', 'Ellipse', 'Hyperbola',
        }


def test_every_ap_chapter_in_the_repo_exists_in_the_catalog(seeded):
    """The catalog must not drift from the chapter names actually in use."""
    with app.app_context():
        run_migration()
        seed_chapter_catalog.main()

        in_repo = {c for (c,) in db.session.query(
            QuestionRepository.chapter).filter_by(board='AP-TS').distinct()}
        in_catalog = {c for (c,) in db.session.query(
            ChapterCatalog.chapter).filter_by(board='AP-TS').distinct()}
        assert in_repo - in_catalog == set()


def test_every_cbse_chapter_in_the_repo_exists_in_the_catalog(seeded):
    with app.app_context():
        run_migration()
        seed_chapter_catalog.main()

        in_repo = {c for (c,) in db.session.query(
            QuestionRepository.chapter).filter_by(board='CBSE').distinct()}
        in_catalog = {c for (c,) in db.session.query(
            ChapterCatalog.chapter).filter_by(board='CBSE').distinct()}
        assert in_repo - in_catalog == set()


# ── endpoints ────────────────────────────────────────────────────────────────

@pytest.fixture
def client(seeded):
    with app.app_context():
        run_migration()
        seed_chapter_catalog.main()
    with app.test_client() as c:
        yield c


def headers(client):
    resp = client.post('/login', json={'username': 'bt_admin',
                                       'password': 'adminpass123'})
    assert resp.status_code == 200, resp.get_json()
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}


def meta(client, **params):
    resp = client.get('/api/metadata/repository', query_string=params,
                      headers=headers(client))
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()


def test_metadata_cbse_class_11_lists_full_syllabus(client):
    """All 16 chapters, including the ones with no questions loaded yet."""
    body = meta(client, board='CBSE', class_number='11', subject='Mathematics')
    assert len(body['chapters']) == 16
    assert 'Linear Programming' not in body['chapters']   # that is class 12
    # Chapters with zero questions are still offered.
    assert 'Sequences & Series' in body['chapters']
    assert 'Mathematical Reasoning' in body['chapters']


def test_metadata_chapters_come_back_in_syllabus_order(client):
    body = meta(client, board='CBSE', class_number='11', subject='Mathematics')
    assert body['chapters'][:3] == [
        'Sets', 'Relations & Functions', 'Trigonometric Functions']


def test_metadata_ap_1a_excludes_misfiled_ncert_chapters(client):
    body = meta(client, board='AP-TS', class_number='11', paper_code='1A',
                subject='Mathematics')
    assert len(body['chapters']) == 10
    for ncert_only in ('Sets', 'Statistics', 'Binomial Theorem'):
        assert ncert_only not in body['chapters']


def test_untagged_subject_chapters_are_not_hidden_by_a_board_filter(client):
    """Physics is untagged, so its chapters show under any board."""
    body = meta(client, board='CBSE', class_number='11', subject='Physics')
    assert body['chapters'] == ['Laws of Motion']


def test_metadata_exposes_boards_and_papers(client):
    body = meta(client)
    assert body['boards'] == ['AP-TS', 'CBSE']
    assert body['papers'] == ['1A', '1B', '2A', '2B']


def test_untagged_content_survives_a_board_filter(client):
    """Physics has no board yet; picking a board must not hide it."""
    resp = client.get('/admin/repository/questions',
                      query_string={'board': 'CBSE', 'subject': 'Physics'},
                      headers=headers(client))
    body = resp.get_json()
    rows = body.get('questions', body) if isinstance(body, dict) else body
    assert len(rows) == 2


def test_related_chapters_maps_conic_sections_to_five_ap_chapters(client):
    resp = client.get('/api/metadata/related-chapters',
                      query_string={'board': 'CBSE', 'chapter': 'Conic Sections'},
                      headers=headers(client))
    assert resp.status_code == 200
    body = resp.get_json()

    assert body['concept_group'] == 'conics'
    assert {r['chapter'] for r in body['related']} == {
        'Circle', 'System of Circles', 'Parabola', 'Ellipse', 'Hyperbola'}
    assert {r['board'] for r in body['related']} == {'AP-TS'}
    # 5 AP chapters x 30 questions
    assert body['total_questions'] == 150


def test_related_chapters_is_symmetric(client):
    resp = client.get('/api/metadata/related-chapters',
                      query_string={'board': 'AP-TS', 'chapter': 'Ellipse'},
                      headers=headers(client))
    body = resp.get_json()
    assert {r['chapter'] for r in body['related']} == {'Conic Sections'}


def test_related_chapters_empty_for_board_specific_chapter(client):
    """Hyperbolic Functions is AP-only; there is no CBSE equivalent."""
    resp = client.get('/api/metadata/related-chapters',
                      query_string={'board': 'AP-TS',
                                    'chapter': 'Hyperbolic Functions'},
                      headers=headers(client))
    body = resp.get_json()
    assert body['related'] == []


# ── CSV import ───────────────────────────────────────────────────────────────

CSV_HEADER = ('text,class,subject,board,paper_code,chapter,'
              'option_a,option_b,option_c,option_d,correct_answer\n')
CSV_ROW = ('Variance of the first n natural numbers?,11,Mathematics,'
           '{board},{paper},Statistics,a,b,c,d,A\n')


def write_csv(tmp_path, board, paper=''):
    p = tmp_path / f'{board or "none"}.csv'
    p.write_text(CSV_HEADER + CSV_ROW.format(board=board, paper=paper),
                 encoding='utf-8')
    return str(p)


def test_same_question_imports_under_a_second_board(seeded, tmp_path):
    """The regression the board key exists to prevent.

    'Statistics' is a chapter in both boards at class 11. Before board joined
    the duplicate key, an AP row made an otherwise-identical CBSE upload look
    like a duplicate, and every row was skipped with no explanation.
    """
    from utils.files import import_repository_csv

    with app.app_context():
        run_migration()
        admin = User.query.filter_by(username='bt_admin').first()

        first = import_repository_csv(write_csv(tmp_path, 'AP-TS', '1A'), admin.id)
        db.session.commit()
        assert first['inserted'] == 1, first

        second = import_repository_csv(write_csv(tmp_path, 'CBSE'), admin.id)
        db.session.commit()
        assert second['inserted'] == 1, second   # would be 0 before the fix
        assert second['skipped'] == 0

        rows = QuestionRepository.query.filter_by(
            chapter='Statistics',
            text='Variance of the first n natural numbers?').all()
        assert {r.board for r in rows} == {'AP-TS', 'CBSE'}


def test_reimporting_the_same_board_still_skips(seeded, tmp_path):
    """Adding board to the key must not weaken same-board deduplication."""
    from utils.files import import_repository_csv

    with app.app_context():
        run_migration()
        admin = User.query.filter_by(username='bt_admin').first()

        import_repository_csv(write_csv(tmp_path, 'CBSE'), admin.id)
        db.session.commit()
        again = import_repository_csv(write_csv(tmp_path, 'CBSE'), admin.id)
        db.session.commit()

        assert again['inserted'] == 0
        assert again['skipped'] == 1


def test_default_board_applies_to_rows_without_a_board_column(seeded, tmp_path):
    from utils.files import import_repository_csv

    p = tmp_path / 'noboard.csv'
    p.write_text(
        'text,class,subject,chapter,option_a,option_b,option_c,option_d,correct_answer\n'
        'Untagged question?,11,Mathematics,Sets,a,b,c,d,A\n',
        encoding='utf-8')

    with app.app_context():
        run_migration()
        admin = User.query.filter_by(username='bt_admin').first()
        import_repository_csv(str(p), admin.id, default_board='CBSE')
        db.session.commit()

        q = QuestionRepository.query.filter_by(text='Untagged question?').first()
        assert q.board == 'CBSE'
