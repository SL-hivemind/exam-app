"""
Create a test public user directly in the database for testing.
Bypasses OTP verification.
"""
import pymysql
import pymysql.cursors
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Kart@2001',
    'database': 'online_exam',
}

# Test user credentials
USERNAME = 'testuser'
EMAIL = 'test@portal.com'
PASSWORD = 'Test@123'
PHONE = '9876543210'    

def run():
    conn = pymysql.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        cursorclass=pymysql.cursors.DictCursor
    )
    cursor = conn.cursor()

    # Check if user already exists
    cursor.execute("SELECT id FROM user WHERE username = %s", (USERNAME,))
    existing = cursor.fetchone()

    if existing:
        user_id = existing['id']
        pw_hash = bcrypt.generate_password_hash(PASSWORD).decode('utf-8')
        cursor.execute("UPDATE user SET password_hash = %s WHERE id = %s", (pw_hash, user_id))
        conn.commit()
        print(f"[OK] User '{USERNAME}' already exists (id={user_id}), password updated.")
    else:
        # Create user with role 'public_user'
        pw_hash = bcrypt.generate_password_hash(PASSWORD).decode('utf-8')
        cursor.execute(
            "INSERT INTO user (username, email, password_hash, role, is_verified) VALUES (%s, %s, %s, %s, %s)",
            (USERNAME, EMAIL, pw_hash, 'public_user', 1)
        )
        conn.commit()
        user_id = cursor.lastrowid
        print(f"[CREATED] User '{USERNAME}' (id={user_id})")

    # Check if public profile exists
    cursor.execute("SELECT id FROM public_profiles WHERE user_id = %s", (user_id,))
    profile = cursor.fetchone()

    if profile:
        print(f"[OK] Public profile already exists")
    else:
        cursor.execute(
            "INSERT INTO public_profiles (user_id, phone_number) VALUES (%s, %s)",
            (user_id, PHONE)
        )
        conn.commit()
        print(f"[CREATED] Public profile for user_id={user_id}")

    # Verify the course exists
    cursor.execute("SELECT id, title, status, price FROM public_courses")
    courses = cursor.fetchall()
    if courses:
        print(f"\n[INFO] Existing public courses:")
        for c in courses:
            print(f"  - {c['title']} (id={c['id']}, status={c['status']}, price={c['price']})")
    else:
        print("\n[WARN] No public courses found. Create one from admin first.")

    cursor.close()
    conn.close()

    print(f"\n{'='*50}")
    print(f"TEST USER CREDENTIALS:")
    print(f"  Email:    {EMAIL}")
    print(f"  Password: {PASSWORD}")
    print(f"  Login at: http://localhost:3000/portal/login")
    print(f"{'='*50}")

if __name__ == '__main__':
    run()
