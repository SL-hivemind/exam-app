import sys, os
from sqlalchemy import text
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db

with app.app_context():
    db.session.execute(text("UPDATE user SET username = 'admin1' WHERE id = 2"))
    print("Fixed id=2 -> admin1")

    db.session.execute(text("UPDATE user SET username = 'Scladmin1' WHERE id = 450"))
    print("Fixed id=450 -> Scladmin1")

    db.session.execute(text("UPDATE user SET username = 'SSpecialist1' WHERE id = 451"))
    print("Fixed id=451 -> SSpecialist1")

    db.session.commit()
    print("Local DB admin usernames restored!")
