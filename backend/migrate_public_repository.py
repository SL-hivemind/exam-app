"""
Migration script: Public Exam Portal - Question Repository & Practice System
Run this once to create/alter tables for:
  - public_question_repository
  - public_course_content_questions (join table)
  - public_practice_attempts
  - public_daily_challenge_attempts
  - ALTER public_profiles (daily_streak, last_challenge_date)
  - ALTER course_contents (subject, chapter, is_previous_paper)
"""
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
        if 'already exists' in msg.lower() or 'duplicate' in msg.lower():
            print(f"  SKIP: {label} (already exists, skipped)")
        else:
            print(f"  FAIL: {label}: {e}")

with app.app_context():
    print("=" * 60)
    print("  Public Exam Portal -- Database Migration")
    print("=" * 60)

    # 1. Create public_question_repository
    print("\n[1/6] Creating public_question_repository table...")
    run_safe("""
        CREATE TABLE IF NOT EXISTS public_question_repository (
            id INT AUTO_INCREMENT PRIMARY KEY,
            custom_id VARCHAR(50) UNIQUE,
            course_tags VARCHAR(255),
            subject VARCHAR(100) NOT NULL,
            chapter VARCHAR(100),
            topic VARCHAR(150),
            difficulty VARCHAR(20) DEFAULT 'Medium',
            is_pyq BOOLEAN DEFAULT FALSE,
            pyq_year INT,
            text TEXT NOT NULL,
            option_a VARCHAR(500),
            option_b VARCHAR(500),
            option_c VARCHAR(500),
            option_d VARCHAR(500),
            correct_answer VARCHAR(10) NOT NULL,
            explanation TEXT,
            image_path VARCHAR(255),
            marks INT DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """, "public_question_repository table")

    # 2. Create join table
    print("\n[2/6] Creating public_course_content_questions table...")
    run_safe("""
        CREATE TABLE IF NOT EXISTS public_course_content_questions (
            content_id INT NOT NULL,
            public_q_id INT NOT NULL,
            order_index INT NOT NULL DEFAULT 1,
            PRIMARY KEY (content_id, public_q_id),
            FOREIGN KEY (content_id) REFERENCES course_contents(id) ON DELETE CASCADE,
            FOREIGN KEY (public_q_id) REFERENCES public_question_repository(id) ON DELETE CASCADE
        )
    """, "public_course_content_questions table")

    # 3. Create practice attempts
    print("\n[3/6] Creating public_practice_attempts table...")
    run_safe("""
        CREATE TABLE IF NOT EXISTS public_practice_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_profile_id INT NOT NULL,
            course_id INT NOT NULL,
            subject VARCHAR(100),
            chapter VARCHAR(100),
            difficulty VARCHAR(20) DEFAULT 'Random',
            questions_json TEXT NOT NULL,
            answers_json TEXT,
            score INT,
            total_questions INT DEFAULT 30,
            is_adaptive BOOLEAN DEFAULT FALSE,
            current_index INT DEFAULT 0,
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            submitted_at DATETIME,
            FOREIGN KEY (public_profile_id) REFERENCES public_profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES public_courses(id) ON DELETE CASCADE
        )
    """, "public_practice_attempts table")

    # 4. Create daily challenge attempts
    print("\n[4/6] Creating public_daily_challenge_attempts table...")
    run_safe("""
        CREATE TABLE IF NOT EXISTS public_daily_challenge_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_profile_id INT NOT NULL,
            challenge_date DATE NOT NULL,
            questions_json TEXT NOT NULL,
            answers_json TEXT,
            score INT DEFAULT 0,
            completed_at DATETIME,
            FOREIGN KEY (public_profile_id) REFERENCES public_profiles(id) ON DELETE CASCADE
        )
    """, "public_daily_challenge_attempts table")

    # 5. ALTER public_profiles
    print("\n[5/6] Adding streak columns to public_profiles...")
    run_safe("ALTER TABLE public_profiles ADD COLUMN daily_streak INT DEFAULT 0", "daily_streak column")
    run_safe("ALTER TABLE public_profiles ADD COLUMN last_challenge_date DATE DEFAULT NULL", "last_challenge_date column")

    # 6. ALTER course_contents
    print("\n[6/6] Adding subject/chapter/is_previous_paper to course_contents...")
    run_safe("ALTER TABLE course_contents ADD COLUMN subject VARCHAR(100) DEFAULT NULL", "subject column")
    run_safe("ALTER TABLE course_contents ADD COLUMN chapter VARCHAR(100) DEFAULT NULL", "chapter column")
    run_safe("ALTER TABLE course_contents ADD COLUMN is_previous_paper BOOLEAN DEFAULT FALSE", "is_previous_paper column")

    print("\n" + "=" * 60)
    print("  Migration Complete!")
    print("=" * 60)
