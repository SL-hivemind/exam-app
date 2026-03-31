import sys, os
from sqlalchemy import text
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db

with app.app_context():
    # Check local admin accounts
    rows = db.session.execute(text(
        "SELECT id, username, role, school_id FROM user WHERE role != 'student' ORDER BY id"
    )).fetchall()
    print("LOCAL DB admin accounts:")
    for r in rows:
        print(f"  id={r[0]}  username={r[1]}  role={r[2]}  school_id={r[3]}")
