import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app import app
from models import db
from sqlalchemy import text

with app.app_context():
    print("Running migration to add subject and is_previous_paper to course_contents...")
    try:
        # Check if column 'subject' already exists to avoid errors on duplicate runs
        # We can try to alter the table
        db.session.execute(text("ALTER TABLE course_contents ADD COLUMN subject VARCHAR(100) DEFAULT NULL;"))
        print("Added 'subject' column successfully.")
    except Exception as e:
        print(f"Subject column not added (may already exist): {e}")

    try:
        db.session.execute(text("ALTER TABLE course_contents ADD COLUMN is_previous_paper BOOLEAN DEFAULT FALSE;"))
        print("Added 'is_previous_paper' column successfully.")
    except Exception as e:
        print(f"is_previous_paper column not added (may already exist): {e}")

    db.session.commit()
    print("Migration complete!")
