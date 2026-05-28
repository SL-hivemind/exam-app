"""
Quick migration script to add portal columns/tables to the local database.
Run this once to bring the existing DB schema up to date.
"""
import mysql.connector
import sys

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Kart@2001',
    'database': 'online_exam',
}

MIGRATIONS = [
    # 1. Add is_verified to user table
    """
    ALTER TABLE user ADD COLUMN is_verified TINYINT(1) DEFAULT 0
    """,
]

# New tables (created by db.create_all but let's verify)
NEW_TABLES = [
    'public_profiles',
    'public_courses',
    'course_contents',
    'course_subscriptions',
    'public_exam_attempts',
    'email_verification_otps',
]

def run():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Check and add is_verified column
    cursor.execute("SHOW COLUMNS FROM user LIKE 'is_verified'")
    if cursor.fetchone():
        print("[OK] is_verified column already exists")
    else:
        try:
            cursor.execute("ALTER TABLE user ADD COLUMN is_verified TINYINT(1) DEFAULT 0")
            conn.commit()
            print("[ADDED] is_verified column to user table")
        except Exception as e:
            print(f"[WARN] Could not add is_verified: {e}")

    # Set existing users as verified (so they can still login)
    cursor.execute("UPDATE user SET is_verified = 1 WHERE is_verified = 0 OR is_verified IS NULL")
    conn.commit()
    print(f"[OK] Set all existing users as verified")

    # Check new tables
    cursor.execute("SHOW TABLES")
    existing = [row[0] for row in cursor.fetchall()]
    print(f"\n[INFO] Existing tables: {len(existing)}")

    for table in NEW_TABLES:
        if table in existing:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  [OK] {table} exists ({count} rows)")
        else:
            print(f"  [MISSING] {table} - will be created on server restart")

    cursor.close()
    conn.close()
    print("\n[DONE] Migration complete! Restart the backend server.")

if __name__ == '__main__':
    run()
