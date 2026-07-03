from app import app
from models import db, PublicCourse, CourseContent, PublicUser, CourseSubscription, PublicExamAttempt, PublicPracticeAttempt, PublicDailyChallengeAttempt, PublicPendingImageQuestion, PublicCourseContentQuestion, PublicQuestionRepo
from sqlalchemy import text

def run_migration():
    with app.app_context():
        # Drop tables that depended on PublicProfile
        print("Dropping dependencies...")
        db.session.execute(text("DROP TABLE IF EXISTS course_subscriptions CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS public_exam_attempts CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS public_practice_attempts CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS public_daily_challenge_attempts CASCADE"))
        
        # Drop PublicProfile
        print("Dropping public_profiles...")
        db.session.execute(text("DROP TABLE IF EXISTS public_profiles CASCADE"))
        
        # Drop PublicUser if it exists to cleanly recreate
        print("Dropping public_users...")
        db.session.execute(text("DROP TABLE IF EXISTS public_users CASCADE"))
        db.session.commit()

        # Create all missing tables
        print("Creating new tables...")
        db.create_all()
        
        print("Migration complete. PublicUser and dependencies created.")

if __name__ == '__main__':
    run_migration()
