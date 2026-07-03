import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db
from sqlalchemy import text

def run_safe(sql, label):
    try:
        db.session.execute(text(sql))
        db.session.commit()
        print(f"  OK: {label}")
    except Exception as e:
        db.session.rollback()
        msg = str(e)
        if 'duplicate column' in msg.lower() or 'already exists' in msg.lower():
            print(f"  SKIP: {label} (already exists, skipped)")
        else:
            print(f"  FAIL: {label}: {e}")

with app.app_context():
    print("=" * 60)
    print("  Public Exam Portal -- Adding target_tags")
    print("=" * 60)
    
    run_safe("ALTER TABLE public_courses ADD COLUMN target_tags VARCHAR(255)", "target_tags column")
    
    print("\n" + "=" * 60)
    print("  Migration Complete!")
    print("=" * 60)
