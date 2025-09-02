from app import app
from models import db, User, bcrypt

with app.app_context():
    existing_admin = User.query.filter_by(username="admin1").first()
    if existing_admin:
        print("⚠️ Admin already exists!")
    else:
        password = "Admin@123"
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        admin = User(
            username="admin1",
            password_hash=hashed_password,
            role="admin",
            email="admin1@example.com",
            
        )

        db.session.add(admin)
        db.session.commit()
        print("✅ Admin user created successfully!")
