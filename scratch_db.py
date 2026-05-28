import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app import app
from models import db, PublicProfile, CourseSubscription, PublicCourse

with app.app_context():
    profiles = PublicProfile.query.all()
    print(f"Profiles: {len(profiles)}")
    for p in profiles:
        print(f"Profile {p.id} (User {p.user_id}):")
        subs = CourseSubscription.query.filter_by(public_profile_id=p.id).all()
        for s in subs:
            c = PublicCourse.query.get(s.course_id)
            print(f"  Sub: Course {s.course_id} '{c.title if c else 'None'}', Status: {s.status}")
