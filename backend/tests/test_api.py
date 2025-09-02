import io
import pytest
from app import app, db
from models import User, School, Student

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Setup initial data
            admin = User(username='admin', role='admin')
            admin.set_password('adminpass')
            db.session.add(admin)
            school = School(name='Test School', code='TST', created_by=1)
            db.session.add(school)
            db.session.commit()
        yield client
        with app.app_context():
            db.drop_all()

def test_import_students_csv_success(client):
    csv_content = """name,number,school_code,class_number,email,password
Alice,1,TST,10,alice@example.com,secret123
Bob,2,TST,10,bob@example.com,secret123
Charlie,3,TST,9,charlie@example.com,
"""
    data = {
        'file': (io.BytesIO(csv_content.encode()), 'students.csv')
    }
    response = client.post('/admin/students/import', data=data, content_type='multipart/form-data')
    assert response.status_code == 200 or response.status_code == 201
    json_data = response.get_json()
    assert 'created' in json_data or 'message' in json_data

def test_import_students_csv_duplicate(client):
    # First import
    csv_content = """name,number,school_code,class_number,email,password
Alice,1,TST,10,alice@example.com,secret123
"""
    data = {
        'file': (io.BytesIO(csv_content.encode()), 'students.csv')
    }
    client.post('/admin/students/import', data=data, content_type='multipart/form-data')

    # Duplicate import should raise error
    response = client.post('/admin/students/import', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    json_data = response.get_json()
    assert 'error' in json_data or 'Duplicate' in str(json_data).lower()

def test_import_students_csv_invalid_school(client):
    csv_content = """name,number,school_code,class_number,email,password
Alice,1,XXX,10,alice@example.com,secret123
"""
    data = {
        'file': (io.BytesIO(csv_content.encode()), 'students.csv')
    }
    response = client.post('/admin/students/import', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    json_data = response.get_json()
    assert 'error' in json_data or 'school_code' in str(json_data).lower()

# Additional tests for other endpoints can be added similarly
