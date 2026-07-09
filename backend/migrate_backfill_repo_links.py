"""One-off migration: link legacy exam questions to the question repository.

Older questions picked from the repo were copied WITHOUT repo_question_id,
so results/analysis fall back to matching on raw question text (slow, and
loses subject/chapter when the text was edited). This backfills the link by
exact text match. Idempotent — only touches rows where repo_question_id IS NULL.

    python migrate_backfill_repo_links.py
"""
from app import app
from models import db, Question, QuestionRepository


def main():
    with app.app_context():
        legacy = Question.query.filter(
            Question.repo_question_id.is_(None),
            Question.text.isnot(None),
        ).all()
        print(f"{len(legacy)} exam questions without a repo link")
        if not legacy:
            print("Nothing to do.")
            return

        texts = list({(q.text or '').strip() for q in legacy if (q.text or '').strip()})
        repo_map = {}
        CHUNK = 500
        for i in range(0, len(texts), CHUNK):
            for r in QuestionRepository.query.filter(
                QuestionRepository.text.in_(texts[i:i + CHUNK])
            ).order_by(QuestionRepository.id.asc()).all():
                repo_map[(r.text or '').strip()] = r  # highest id wins

        linked = 0
        for q in legacy:
            r = repo_map.get((q.text or '').strip())
            if r is not None:
                q.repo_question_id = r.id
                linked += 1

        db.session.commit()
        print(f"Linked {linked} questions to the repository. "
              f"{len(legacy) - linked} had no matching repo text (left as-is).")


if __name__ == "__main__":
    main()
