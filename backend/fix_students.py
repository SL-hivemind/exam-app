from app import app
from utils.files import fix_existing_students

with app.app_context():
    fixed_students = fix_existing_students()
    print("Fixed students:", fixed_students)
