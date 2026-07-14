import io
import pytest
from app import app, db
from models import User, School, Student

@pytest.fixture
def client():
    # NOTE: setting SQLALCHEMY_DATABASE_URI here does NOT work — the real
    # MySQL engine is bound when `app` is imported. conftest.py swaps the
    # engine onto isolated in-memory sqlite before any test runs, which is
    # the only reason create_all/drop_all below are safe.
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Setup initial data
            admin = User(username='admin', role='admin')
            admin.set_password('adminpass')
            db.session.add(admin)
            db.session.commit()
            school = School(name='Test School', code='TST', created_by=admin.id)
            db.session.add(school)
            db.session.commit()
        yield client
        with app.app_context():
            db.session.remove()
            db.drop_all()

def admin_headers(client):
    resp = client.post('/login', json={'username': 'admin', 'password': 'adminpass'})
    assert resp.status_code == 200
    return {'Authorization': f"Bearer {resp.get_json()['auth_token']}"}

def csv_upload(csv_content):
    # Fresh BytesIO per request — werkzeug closes the stream after sending.
    return {'file': (io.BytesIO(csv_content.encode()), 'students.csv')}

def test_import_students_csv_success(client):
    headers = admin_headers(client)
    csv_content = """username,number,school_code,class_number,email,password
Alice,1,TST,10,alice@example.com,secret123
Bob,2,TST,10,bob@example.com,secret123
Charlie,3,TST,9,charlie@example.com,
"""
    response = client.post('/admin/students/import', data=csv_upload(csv_content), content_type='multipart/form-data', headers=headers)
    assert response.status_code == 200 or response.status_code == 201
    json_data = response.get_json()
    assert 'created' in json_data or 'message' in json_data

def test_import_students_csv_duplicate_email(client):
    headers = admin_headers(client)
    # First import
    csv_content = """username,number,school_code,class_number,email,password
Alice,1,TST,10,alice@example.com,secret123
"""
    response = client.post('/admin/students/import', data=csv_upload(csv_content), content_type='multipart/form-data', headers=headers)
    assert response.status_code in (200, 201)

    # Re-import: duplicate usernames get auto-suffixed, but the unique email
    # constraint rejects the row.
    response = client.post('/admin/students/import', data=csv_upload(csv_content), content_type='multipart/form-data', headers=headers)
    assert response.status_code == 400
    assert 'failed' in str(response.get_json()).lower()

def test_import_students_csv_invalid_school(client):
    headers = admin_headers(client)
    csv_content = """username,number,school_code,class_number,email,password
Alice,1,XXX,10,alice@example.com,secret123
"""
    response = client.post('/admin/students/import', data=csv_upload(csv_content), content_type='multipart/form-data', headers=headers)
    assert response.status_code == 400
    json_data = response.get_json()
    assert 'error' in json_data or 'school_code' in str(json_data).lower() or 'not found' in str(json_data).lower()

# Additional tests for other endpoints can be added similarly
