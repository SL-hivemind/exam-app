import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app import app
from models import db, PublicProfile, CourseSubscription, PublicCourse, CourseContent, PublicExamAttempt

with app.app_context():
    profiles = PublicProfile.query.all()
    print(f"Profiles: {len(profiles)}")
    for p in profiles:
        print(f"Profile {p.id} (User {p.user_id}):")
        subs = CourseSubscription.query.filter_by(public_profile_id=p.id).all()
        for s in subs:
            c = PublicCourse.query.get(s.course_id)
            print(f"  Sub: Course {s.course_id} '{c.title if c else 'None'}', Status: {s.status}")

    print("\n--- Courses & Contents ---")
    courses = PublicCourse.query.all()
    for c in courses:
        print(f"Course {c.id}: '{c.title}' (status: {c.status})")
        contents = CourseContent.query.filter_by(course_id=c.id).order_by(CourseContent.order_index).all()
        print(f"  Contents count: {len(contents)}")
        for cnt in contents:
            print(f"    - Content {cnt.id}: '{cnt.title}' [type: {cnt.content_type}, status: {cnt.status}, order_index: {cnt.order_index}]")

    print("\n--- Exam Attempts ---")
    attempts = PublicExamAttempt.query.all()
    print(f"Total attempts: {len(attempts)}")
    for a in attempts:
        print(f"  Attempt {a.id}: Content {a.course_content_id}, Profile {a.public_profile_id}, Score: {a.score}/{a.total_questions}, Submitted: {a.submitted_at}")

