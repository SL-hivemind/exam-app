from app import db, app
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE student_exam_attempts ADD COLUMN submission_reason VARCHAR(50) DEFAULT 'manual'"))
        db.session.commit()
        print("Migrated successfully.")
    except Exception as e:
        print(e)
