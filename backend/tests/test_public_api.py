import io
import json
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

pytest.skip(
    "Stale test module: written against the removed PublicProfile model "
    "(models now use the standalone PublicUser account). Needs a rewrite "
    "against the current public auth flow before it can run.",
    allow_module_level=True,
)

from app import app, db
from models import (
    User, PublicProfile, PublicCourse, CourseContent,
    CourseSubscription, PublicExamAttempt, EmailVerificationOTP,
    PublicQuestion
)

@pytest.fixture(autouse=True)
def setup_test_config():
    """Ensure the testing configuration is applied before each test.

    NOTE: overriding SQLALCHEMY_DATABASE_URI here does NOT work — the real
    MySQL engine is bound when `app` is imported. conftest.py swaps the
    engine onto isolated in-memory sqlite before any test runs, which is the
    only reason create_all/drop_all in the client fixture are safe.
    """
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key-123456789'
    app.config['SECRET_KEY'] = 'test-secret-key-123456789'

@pytest.fixture
def client():
    """Create a Flask test client with an empty initialized in-memory database."""
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            
            # Setup a platform admin for administrative endpoints
            admin = User(username='platform_admin', role='admin', email='admin@example.com')
            admin.set_password('adminpass123')
            db.session.add(admin)
            
            # Setup a default published course and draft course for catalog testing
            course1 = PublicCourse(
                title='Intro to Calculus',
                description='A comprehensive guide to derivatives and integrals.',
                price=0.0,
                status='published',
                created_by=1
            )
            course2 = PublicCourse(
                title='Advanced physics',
                description='Mastering classical mechanics.',
                price=499.0,
                status='published',
                created_by=1
            )
            course3 = PublicCourse(
                title='Draft Art History',
                description='Not published yet.',
                price=100.0,
                status='draft',
                created_by=1
            )
            db.session.add_all([course1, course2, course3])
            db.session.commit()
            
            # Add some contents to course 1 (Calculus)
            content_free = CourseContent(
                course_id=course1.id,
                title='Calculus Basics PDF',
                content_type='pdf_material',
                file_url='calc_basics.pdf',
                is_free=True,
                order_index=1
            )
            content_exam = CourseContent(
                course_id=course1.id,
                title='Calculus Diagnostic Exam',
                content_type='pdf_exam',
                file_url='calc_exam.pdf',
                is_free=True,
                order_index=2,
                total_questions=2,
                answer_key_json=json.dumps({"1": "A", "2": "C"}),
                duration_minutes=30
            )
            db.session.add_all([content_free, content_exam])
            
            # Add some contents to course 2 (Physics - Paid)
            content_premium = CourseContent(
                course_id=course2.id,
                title='Premium Quantum Mechanics',
                content_type='pdf_material',
                file_url='quantum_notes.pdf',
                is_free=False,
                order_index=1
            )
            db.session.add(content_premium)
            db.session.commit()
            
        yield client

        with app.app_context():
            db.session.remove()
            db.drop_all()

# Helper to get authentication headers
def get_auth_headers(client, email, password):
    resp = client.post('/public/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    token = resp.get_json()['auth_token']
    return {'Authorization': f'Bearer {token}', 'auth_token': token}

def get_admin_auth_headers(client):
    resp = client.post('/login', json={'username': 'platform_admin', 'password': 'adminpass123'})
    assert resp.status_code == 200
    token = resp.get_json()['auth_token']
    return {'Authorization': f'Bearer {token}', 'auth_token': token}

# ═══════════════════════════════════════════════════
# 1. PUBLIC AUTHENTICATION TESTS
# ═══════════════════════════════════════════════════

@patch('utils.email.send_otp_email')
def test_public_registration_flow(mock_send_email, client):
    """Test standard multi-step registration flow and automatic login."""
    mock_send_email.return_value = True
    
    # Step 1: Initialize Registration
    reg_data = {
        'email': 'student@example.com',
        'username': 'student_user',
        'password': 'securepassword123'
    }
    resp = client.post('/public/register/init', json=reg_data)
    assert resp.status_code == 200
    assert 'OTP sent' in resp.get_json()['message']
    
    with app.app_context():
        otp_record = EmailVerificationOTP.query.filter_by(email='student@example.com', used=False).first()
        assert otp_record is not None
        otp_code = otp_record.otp_code
        
    # Step 2: Verify Registration with Invalid OTP
    verify_data = reg_data.copy()
    verify_data['otp'] = '000000' # Wrong OTP
    resp = client.post('/public/register/verify', json=verify_data)
    assert resp.status_code == 400
    assert 'Invalid OTP' in resp.get_json()['message']
    
    # Step 3: Verify Registration with Valid OTP
    verify_data['otp'] = otp_code
    verify_data['phone_number'] = '9876543210'
    resp = client.post('/public/register/verify', json=verify_data)
    assert resp.status_code == 201
    res_json = resp.get_json()
    assert 'Account created successfully' in res_json['message']
    assert 'auth_token' in res_json
    assert res_json['user']['username'] == 'student_user'
    
    # Verify DB entry exists
    with app.app_context():
        user = User.query.filter_by(email='student@example.com').first()
        assert user is not None
        assert user.is_verified is True
        profile = PublicProfile.query.filter_by(user_id=user.id).first()
        assert profile is not None
        assert profile.phone_number == '9876543210'

def test_public_registration_duplicate(client):
    """Test that registration init rejects existing emails or usernames."""
    # Pre-create a verified public user
    with app.app_context():
        existing_user = User(username='existing_guy', email='existing@example.com', role='public_user', is_verified=True)
        existing_user.set_password('password123')
        db.session.add(existing_user)
        db.session.commit()
        
    # Try duplicate email
    resp = client.post('/public/register/init', json={
        'email': 'existing@example.com',
        'username': 'new_guy',
        'password': 'password123'
    })
    assert resp.status_code == 409
    assert 'already exists' in resp.get_json()['message']
    
    # Try duplicate username
    resp = client.post('/public/register/init', json={
        'email': 'new@example.com',
        'username': 'existing_guy',
        'password': 'password123'
    })
    assert resp.status_code == 409
    assert 'already taken' in resp.get_json()['message']

def test_public_login(client):
    """Test login functionality for public users."""
    # Setup user
    with app.app_context():
        user = User(username='test_user', email='test@example.com', role='public_user', is_verified=True)
        user.set_password('secretpwd123')
        db.session.add(user)
        db.session.commit()
        
    # Valid login
    resp = client.post('/public/login', json={'email': 'test@example.com', 'password': 'secretpwd123'})
    assert resp.status_code == 200
    assert 'auth_token' in resp.get_json()
    
    # Invalid password
    resp = client.post('/public/login', json={'email': 'test@example.com', 'password': 'wrongpassword'})
    assert resp.status_code == 401
    
    # Non-existent user
    resp = client.post('/public/login', json={'email': 'nonexistent@example.com', 'password': 'secretpwd123'})
    assert resp.status_code == 401
    
    # Unverified user login attempt
    with app.app_context():
        unverified = User(username='unverified_user', email='unver@example.com', role='public_user', is_verified=False)
        unverified.set_password('secretpwd123')
        db.session.add(unverified)
        db.session.commit()
        
    resp = client.post('/public/login', json={'email': 'unver@example.com', 'password': 'secretpwd123'})
    assert resp.status_code == 403
    assert 'verify your email' in resp.get_json()['message']

@patch('utils.email.send_otp_email')
def test_public_forgot_password_flow(mock_send_email, client):
    """Test forgot password initiation and reset sequence."""
    mock_send_email.return_value = True
    
    with app.app_context():
        user = User(username='forgetful', email='forgetful@example.com', role='public_user', is_verified=True)
        user.set_password('oldpassword123')
        db.session.add(user)
        db.session.commit()
        
    # Init reset
    resp = client.post('/public/forgot-password/init', json={'email': 'forgetful@example.com'})
    assert resp.status_code == 200
    assert 'OTP sent' in resp.get_json()['message']
    
    with app.app_context():
        otp_record = EmailVerificationOTP.query.filter_by(email='forgetful@example.com', purpose='forgot_password', used=False).first()
        assert otp_record is not None
        otp_code = otp_record.otp_code
        
    # Reset password with valid OTP
    resp = client.post('/public/forgot-password/reset', json={
        'email': 'forgetful@example.com',
        'otp': otp_code,
        'new_password': 'brandnewpassword123'
    })
    assert resp.status_code == 200
    assert 'Password reset successfully' in resp.get_json()['message']
    
    # Verify login with new password
    resp = client.post('/public/login', json={'email': 'forgetful@example.com', 'password': 'brandnewpassword123'})
    assert resp.status_code == 200

# ═══════════════════════════════════════════════════
# 2. PUBLIC CATALOG TESTS
# ═══════════════════════════════════════════════════

def test_public_catalog_list_and_details(client):
    """Test catalog lists only published courses and hides premium content if not subscribed."""
    # List courses
    resp = client.get('/public/courses')
    assert resp.status_code == 200
    courses = resp.get_json()['courses']
    # Must contain course 1 and 2, but NOT 3 (draft)
    titles = [c['title'] for c in courses]
    assert 'Intro to Calculus' in titles
    assert 'Advanced physics' in titles
    assert 'Draft Art History' not in titles
    
    # Get free course details (anonymous)
    calc_id = courses[titles.index('Intro to Calculus')]['id']
    resp = client.get(f'/public/courses/{calc_id}')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['course']['title'] == 'Intro to Calculus'
    # Calculus materials are free so they must not be locked
    assert len(data['contents']) == 2
    assert data['contents'][0]['locked'] is False
    assert data['contents'][0]['file_url'] == 'calc_basics.pdf'
    
    # Get paid course details (anonymous)
    physics_id = courses[titles.index('Advanced physics')]['id']
    resp = client.get(f'/public/courses/{physics_id}')
    assert resp.status_code == 200
    data = resp.get_json()
    # Premium contents are paid, and the guest is unsubscribed, so the files must be locked/hidden
    assert len(data['contents']) == 1
    assert data['contents'][0]['locked'] is True
    assert data['contents'][0]['file_url'] is None

# ═══════════════════════════════════════════════════
# 3. ENROLLMENT & PAYMENT TESTS
# ═══════════════════════════════════════════════════

def test_enrollment_free_course(client):
    """Test enrolling in a free course."""
    # Create public user
    with app.app_context():
        user = User(username='learner1', email='learner1@example.com', role='public_user', is_verified=True)
        user.set_password('password123')
        db.session.add(user)
        db.session.flush()
        profile = PublicProfile(user_id=user.id)
        db.session.add(profile)
        db.session.commit()
        
    headers = get_auth_headers(client, 'learner1@example.com', 'password123')
    
    # Get calculus course ID
    with app.app_context():
        course = PublicCourse.query.filter_by(title='Intro to Calculus').first()
        course_id = course.id
        
    resp = client.post(f'/public/courses/{course_id}/enroll', headers=headers)
    assert resp.status_code in (200, 201)
    assert 'Enrolled successfully' in resp.get_json()['message']
    
    # Check subscription status in DB is active (since price is 0.0)
    with app.app_context():
        sub = CourseSubscription.query.filter_by(course_id=course_id).first()
        assert sub is not None
        assert sub.status == 'active'

@patch('razorpay.Client')
def test_razorpay_payment_and_verification_flow(mock_razorpay_client, client):
    """Test Razorpay order creation and HMAC verification to activate a paid subscription."""
    # Mock Razorpay
    mock_instance = MagicMock()
    mock_instance.order.create.return_value = {
        'id': 'order_test123',
        'amount': 49900,
        'currency': 'INR'
    }
    mock_razorpay_client.return_value = mock_instance
    
    with app.app_context():
        user = User(username='buyer', email='buyer@example.com', role='public_user', is_verified=True)
        user.set_password('password123')
        db.session.add(user)
        db.session.flush()
        profile = PublicProfile(user_id=user.id)
        db.session.add(profile)
        
        course = PublicCourse.query.filter_by(title='Advanced physics').first()
        course_id = course.id
        db.session.commit()
        
    headers = get_auth_headers(client, 'buyer@example.com', 'password123')
    
    with patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'key_id', 'RAZORPAY_KEY_SECRET': 'key_secret'}):
        # Create order
        resp = client.post(f'/public/courses/{course_id}/create-order', headers=headers)
        assert resp.status_code == 200
        order_json = resp.get_json()
        assert order_json['order_id'] == 'order_test123'
        
        # Verify database record has pending status
        with app.app_context():
            sub = CourseSubscription.query.filter_by(course_id=course_id, razorpay_order_id='order_test123').first()
            assert sub is not None
            assert sub.status == 'pending'
            
        # Calculate matching signature for verification testing
        import hmac
        import hashlib
        msg = f"order_test123|pay_test456"
        expected_sig = hmac.new(
            b'key_secret',
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Verify payment
        pay_data = {
            'razorpay_order_id': 'order_test123',
            'razorpay_payment_id': 'pay_test456',
            'razorpay_signature': expected_sig
        }
        resp = client.post('/public/payment/verify', json=pay_data, headers=headers)
        assert resp.status_code == 200
        assert 'verified' in resp.get_json()['message'].lower()
        
        # Verify subscription is now active
        with app.app_context():
            db.session.expire_all()
            sub = CourseSubscription.query.filter_by(course_id=course_id).first()
            assert sub.status == 'active'
            assert sub.razorpay_payment_id == 'pay_test456'

# ═══════════════════════════════════════════════════
# 4. PDF MATERIALS & EXAMS
# ═══════════════════════════════════════════════════

def test_pdf_serving_and_exam_attempts(client):
    """Test loading PDFs, starting examinations, auto-grading submission, and reviewing questions."""
    with app.app_context():
        user = User(username='examinee', email='examinee@example.com', role='public_user', is_verified=True)
        user.set_password('password123')
        db.session.add(user)
        db.session.flush()
        profile = PublicProfile(user_id=user.id)
        db.session.add(profile)
        
        # Enrol user in free Calculus
        calc_course = PublicCourse.query.filter_by(title='Intro to Calculus').first()
        sub = CourseSubscription(public_profile_id=profile.id, course_id=calc_course.id, status='active')
        db.session.add(sub)
        
        content_material = CourseContent.query.filter_by(title='Calculus Basics PDF').first()
        content_exam = CourseContent.query.filter_by(title='Calculus Diagnostic Exam').first()
        
        content_material_id = content_material.id
        content_exam_id = content_exam.id
        
        db.session.commit()
        
    headers = get_auth_headers(client, 'examinee@example.com', 'password123')
    
    # 1. Test Serving PDF (material is free, but check file not found on server since we didn't write physical files)
    resp = client.get(f'/public/content/{content_material_id}/file', headers=headers)
    assert resp.status_code == 404 # Server correctly returns 404 because calc_basics.pdf file is not physically on disk
    
    # 2. Start Exam Attempt
    resp = client.post(f'/public/content/{content_exam_id}/start-exam', headers=headers)
    assert resp.status_code == 201
    attempt_id = resp.get_json()['attempt']['id']
    
    # Verify status in database
    with app.app_context():
        attempt = PublicExamAttempt.query.get(attempt_id)
        assert attempt is not None
        assert attempt.submitted_at is None
        
    # 3. Submit Exam (Questions: {"1": "A", "2": "C"}. Let's submit 1: "A", 2: "B" -> should grade 1 out of 2)
    submit_data = {
        'answers': {'1': 'A', '2': 'B'}
    }
    resp = client.post(f'/public/attempts/{attempt_id}/submit', json=submit_data, headers=headers)
    assert resp.status_code == 200
    res_json = resp.get_json()
    assert res_json['attempt']['score'] == 1
    assert res_json['attempt']['total_questions'] == 2
    
    # 4. Attempt post-exam Review
    resp = client.get(f'/public/attempts/{attempt_id}/review', headers=headers)
    assert resp.status_code == 200
    review_json = resp.get_json()
    assert review_json['user_answers']['1'] == 'A'
    assert review_json['answer_key']['2'] == 'C'
    assert review_json['attempt']['score'] == 1

# ═══════════════════════════════════════════════════
# 5. PUBLIC USER PROFILE & DASHBOARD
# ═══════════════════════════════════════════════════

def test_public_user_dashboard(client):
    """Test loading and updating profile and loading Unified Dashboard data."""
    with app.app_context():
        user = User(username='dashuser', email='dash@example.com', role='public_user', is_verified=True)
        user.set_password('password123')
        db.session.add(user)
        db.session.flush()
        profile = PublicProfile(user_id=user.id, phone_number='111', address='Old Street')
        db.session.add(profile)
        db.session.commit()
        
    headers = get_auth_headers(client, 'dash@example.com', 'password123')
    
    # Get Profile
    resp = client.get('/public/me/profile', headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['profile']['phone_number'] == '111'
    
    # Update Profile
    update_data = {
        'phone_number': '222',
        'address': 'New Street',
        'username': 'dashuser_new'
    }
    resp = client.put('/public/me/profile', json=update_data, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['profile']['phone_number'] == '222'
    assert resp.get_json()['profile']['address'] == 'New Street'
    
    with app.app_context():
        user_db = User.query.filter_by(email='dash@example.com').first()
        assert user_db.username == 'dashuser_new'
        
    # Get Dashboard Data
    resp = client.get('/public/me/dashboard-data', headers=headers)
    assert resp.status_code == 200
    dash_json = resp.get_json()
    # Available courses should contain the courses since no subscriptions exist yet
    assert len(dash_json['available_courses']) >= 2
    assert len(dash_json['dashboard_courses']) == 0

# ═══════════════════════════════════════════════════
# 6. ADMIN PUBLIC PORTAL MANAGEMENT
# ═══════════════════════════════════════════════════

def test_admin_public_course_crud(client):
    """Test administrative CRUD controls over courses."""
    admin_headers = get_admin_auth_headers(client)
    
    # Create course
    new_course = {
        'title': 'Admin Created Course',
        'description': 'Description here',
        'price': 199.0,
        'status': 'draft'
    }
    resp = client.post('/admin/public/courses', json=new_course, headers=admin_headers)
    assert resp.status_code == 201
    course_id = resp.get_json()['course']['id']
    
    # List courses
    resp = client.get('/admin/public/courses', headers=admin_headers)
    assert resp.status_code == 200
    courses = resp.get_json()['courses']
    titles = [c['title'] for c in courses]
    assert 'Admin Created Course' in titles
    
    # Update course
    update_course = {
        'title': 'Updated Title',
        'price': 299.0,
        'status': 'published'
    }
    resp = client.put(f'/admin/public/courses/{course_id}', json=update_course, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.get_json()['course']['title'] == 'Updated Title'
    assert resp.get_json()['course']['price'] == 299.0
    
    # Delete course
    resp = client.delete(f'/admin/public/courses/{course_id}', headers=admin_headers)
    assert resp.status_code == 200
    
    # Confirm deletion
    with app.app_context():
        course_db = PublicCourse.query.get(course_id)
        assert course_db is None

def test_admin_public_course_delete_with_attempts(client):
    """Test that deleting a course deletes its contents and associated attempts without IntegrityErrors."""
    admin_headers = get_admin_auth_headers(client)
    
    # 1. Register a student so we have a profile to link an attempt
    reg_data = {
        'email': 'student_test_del@example.com',
        'username': 'student_del_user',
        'password': 'securepassword123'
    }
    client.post('/public/register/init', json=reg_data)
    with app.app_context():
        otp_record = EmailVerificationOTP.query.filter_by(email='student_test_del@example.com', used=False).first()
        otp_code = otp_record.otp_code
    
    verify_data = reg_data.copy()
    verify_data['otp'] = otp_code
    verify_data['phone_number'] = '1234567890'
    resp = client.post('/public/register/verify', json=verify_data)
    assert resp.status_code == 201
    
    # Get the student auth headers
    student_headers = get_auth_headers(client, 'student_test_del@example.com', 'securepassword123')

    # 2. Create a course, add content to it, and have the student attempt it
    new_course = {
        'title': 'Course to Delete',
        'description': 'Will delete this',
        'price': 0.0,
        'status': 'published'
    }
    resp = client.post('/admin/public/courses', json=new_course, headers=admin_headers)
    assert resp.status_code == 201
    course_id = resp.get_json()['course']['id']
    
    # Enroll the student
    resp = client.post(f'/public/courses/{course_id}/enroll', headers=student_headers)
    assert resp.status_code in (200, 201)

    # Add content (exam) to the course
    with app.app_context():
        content = CourseContent(
            course_id=course_id,
            title='Calculus Exam to Delete',
            content_type='pdf_exam',
            is_free=True,
            total_questions=5,
            duration_minutes=30
        )
        db.session.add(content)
        db.session.commit()
        content_id = content.id

    # Student starts the exam attempt
    resp = client.post(f'/public/content/{content_id}/start-exam', headers=student_headers)
    assert resp.status_code == 201
    attempt_id = resp.get_json()['attempt']['id']

    # 3. Delete the course as admin
    resp = client.delete(f'/admin/public/courses/{course_id}', headers=admin_headers)
    assert resp.status_code == 200

    # 4. Verify everything is deleted
    with app.app_context():
        assert PublicCourse.query.get(course_id) is None
        assert CourseContent.query.get(content_id) is None
        assert PublicExamAttempt.query.get(attempt_id) is None

def test_admin_public_content_crud(client):
    """Test admin CRUD controls for course content items."""
    admin_headers = get_admin_auth_headers(client)
    
    with app.app_context():
        course = PublicCourse.query.filter_by(title='Intro to Calculus').first()
        course_id = course.id
        
    # 1. Create content via multipart/form-data upload simulation
    pdf_content = b"%PDF-1.4 dummy content"
    data = {
        'title': 'Ad-hoc Syllabus PDF',
        'content_type': 'pdf_material',
        'is_free': 'true',
        'file': (io.BytesIO(pdf_content), 'syllabus.pdf')
    }
    resp = client.post(f'/admin/public/courses/{course_id}/contents', data=data, content_type='multipart/form-data', headers=admin_headers)
    assert resp.status_code == 201
    content_id = resp.get_json()['content']['id']
    
    # 2. List contents
    resp = client.get(f'/admin/public/courses/{course_id}/contents', headers=admin_headers)
    assert resp.status_code == 200
    contents = resp.get_json()['contents']
    titles = [c['title'] for c in contents]
    assert 'Ad-hoc Syllabus PDF' in titles
    
    # 3. Update content
    update_data = {
        'title': 'Syllabus Updated V2',
        'is_free': False
    }
    resp = client.put(f'/admin/public/contents/{content_id}', json=update_data, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.get_json()['content']['title'] == 'Syllabus Updated V2'
    assert resp.get_json()['content']['is_free'] is False
    
    # 4. Delete content
    resp = client.delete(f'/admin/public/contents/{content_id}', headers=admin_headers)
    assert resp.status_code == 200
    
    with app.app_context():
        content_db = CourseContent.query.get(content_id)
        assert content_db is None

def test_admin_smart_questions_parser(client):
    """Test smart raw-text parser for CBT question creation."""
    admin_headers = get_admin_auth_headers(client)
    
    with app.app_context():
        course = PublicCourse.query.filter_by(title='Intro to Calculus').first()
        course_id = course.id
        
        # Add a placeholder content to import questions into
        content = CourseContent(course_id=course_id, title='CBT Test', content_type='cbt_exam')
        db.session.add(content)
        db.session.commit()
        content_id = content.id
        
    raw_text = """
    Q1. What is the derivative of x^2?
    A) x
    B) 2x
    C) x^2
    D) 2
    Answer: B
    Explanation: Power rule gives d/dx (x^n) = n * x^(n-1).
    
    Q2. What is integral of 1/x dx?
    a) x
    b) log(x)
    c) e^x
    d) 1
    Ans: B
    """
    
    # Smart Paste POST request
    resp = client.post(
        f'/admin/public/contents/{content_id}/smart-questions',
        json={'raw_text': raw_text},
        headers=admin_headers
    )
    assert resp.status_code == 201
    res_json = resp.get_json()
    assert '2 questions parsed' in res_json['message']
    assert len(res_json['questions']) == 2
    assert res_json['questions'][0]['question_text'] == 'What is the derivative of x^2?'
    assert res_json['questions'][0]['correct_option'] == 'B'
    
    # List questions Admin view
    resp = client.get(f'/admin/public/contents/{content_id}/questions', headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.get_json()['questions']) == 2
