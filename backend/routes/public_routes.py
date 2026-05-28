# routes/public_routes.py
# ─────────────────────────────────────────────────────────────
# Public Routes  (B2C — completely isolated from School/Student flow)
# ─────────────────────────────────────────────────────────────
import os
import json
import re
import random
import hashlib
import hmac
import traceback
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import request, jsonify, send_file, current_app
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

from models import (
    db, bcrypt, User,
    PublicProfile, PublicCourse, CourseContent,
    CourseSubscription, PublicExamAttempt, EmailVerificationOTP,
    PublicQuestion,
)

# ── Upload directory for public PDFs ──
PUBLIC_UPLOADS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'portal')
os.makedirs(PUBLIC_UPLOADS, exist_ok=True)

ALLOWED_PDF = {'pdf'}


def allowed_pdf(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PDF


def register_public_routes(app, token_required, role_required):
    """Register all /public/* and /admin/public/* routes."""

    import jwt as pyjwt

    # ─── helper: get public profile from token ───
    def get_public_profile(current_user):
        if current_user.role != 'public_user':
            return None
        return PublicProfile.query.filter_by(user_id=current_user.id).first()

    # ═══════════════════════════════════════════════════
    # 1. PUBLIC AUTH (Registration, Login, Forgot Password)
    # ═══════════════════════════════════════════════════

    @app.post('/public/register/init')
    def public_register_init():
        """Step 1: Collect email, username, password — send OTP."""
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        username = (data.get('username') or '').strip()
        password = data.get('password')

        if not email or not username or not password:
            return jsonify({'message': 'email, username, and password are required'}), 400
        if len(password) < 8:
            return jsonify({'message': 'Password must be at least 8 characters'}), 400

        # Check duplicates
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'An account with this email already exists'}), 409
        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username is already taken'}), 409

        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        expires = datetime.utcnow() + timedelta(minutes=10)

        # Invalidate old OTPs for this email
        EmailVerificationOTP.query.filter_by(email=email, used=False).update({'used': True})
        otp = EmailVerificationOTP(email=email, otp_code=otp_code, purpose='registration', expires_at=expires)
        db.session.add(otp)
        db.session.commit()

        try:
            from utils.email import send_otp_email
            send_otp_email(email, otp_code, username)
        except Exception as e:
            current_app.logger.error(f"Public OTP email error: {e}")
            return jsonify({'message': f'Failed to send OTP email: {str(e)}'}), 500

        parts = email.split('@')
        masked = parts[0][:2] + '***@' + parts[1] if len(parts) == 2 else '***'
        return jsonify({'message': f'OTP sent to {masked}', 'email_hint': masked}), 200

    @app.post('/public/register/verify')
    def public_register_verify():
        """Step 2: Verify OTP and create account."""
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        otp_code = (data.get('otp') or '').strip()
        username = (data.get('username') or '').strip()
        password = data.get('password')
        phone_number = (data.get('phone_number') or '').strip() or None
        course_id = data.get('course_id') # Selected course during registration

        if not email or not otp_code or not username or not password:
            return jsonify({'message': 'email, otp, username, and password are required'}), 400

        otp = EmailVerificationOTP.query.filter_by(
            email=email, otp_code=otp_code, purpose='registration', used=False
        ).order_by(EmailVerificationOTP.created_at.desc()).first()

        if not otp:
            return jsonify({'message': 'Invalid OTP'}), 400
        if datetime.utcnow() > otp.expires_at:
            otp.used = True
            db.session.commit()
            return jsonify({'message': 'OTP has expired. Please request a new one.'}), 400

        # Final duplicate check
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'An account with this email already exists'}), 409
        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username is already taken'}), 409

        try:
            otp.used = True
            user = User(username=username, role='public_user', email=email, is_verified=True)
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

            profile = PublicProfile(user_id=user.id, phone_number=phone_number)
            db.session.add(profile)
            db.session.flush() # Ensure profile gets an ID before creating subscription

            # Auto-enroll if a course was selected
            if course_id:
                course = PublicCourse.query.get(course_id)
                if course and course.status == 'published':
                    sub_status = 'active' if course.price == 0 else 'enrolled'
                    sub = CourseSubscription(
                        public_profile_id=profile.id,
                        course_id=course.id,
                        status=sub_status
                    )
                    db.session.add(sub)
            
            db.session.commit()

            # Auto-login: generate JWT
            payload = {
                'sub': str(user.id),
                'role': user.role,
                'iat': datetime.now(timezone.utc),
                'exp': datetime.now(timezone.utc) + timedelta(hours=12),
            }
            token = pyjwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

            return jsonify({
                'message': 'Account created successfully',
                'auth_token': token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role,
                    'email': user.email,
                },
            }), 201
        except IntegrityError:
            db.session.rollback()
            return jsonify({'message': 'Account creation failed — duplicate data'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': f'Registration failed: {str(e)}'}), 500

    @app.post('/public/login')
    def public_login():
        """Login for public users (email + password)."""
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')

        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email, role='public_user').first()
        if not user or not user.check_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401

        if not user.is_verified:
            return jsonify({'message': 'Please verify your email before logging in'}), 403

        payload = {
            'sub': str(user.id),
            'role': user.role,
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + timedelta(hours=12),
        }
        token = pyjwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'auth_token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'email': user.email,
            },
        }), 200

    @app.post('/public/forgot-password/init')
    def public_forgot_init():
        """Send OTP to email for password reset."""
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'message': 'Email is required'}), 400

        user = User.query.filter_by(email=email, role='public_user').first()
        if not user:
            return jsonify({'message': 'No public account found with that email'}), 404

        otp_code = str(random.randint(100000, 999999))
        expires = datetime.utcnow() + timedelta(minutes=5)
        EmailVerificationOTP.query.filter_by(email=email, purpose='forgot_password', used=False).update({'used': True})
        otp = EmailVerificationOTP(email=email, otp_code=otp_code, purpose='forgot_password', expires_at=expires)
        db.session.add(otp)
        db.session.commit()

        try:
            from utils.email import send_otp_email
            send_otp_email(email, otp_code, user.username)
        except Exception as e:
            return jsonify({'message': f'Failed to send OTP: {str(e)}'}), 500

        parts = email.split('@')
        masked = parts[0][:2] + '***@' + parts[1] if len(parts) == 2 else '***'
        return jsonify({'message': f'OTP sent to {masked}', 'email_hint': masked}), 200

    @app.post('/public/forgot-password/reset')
    def public_forgot_reset():
        """Verify OTP and reset password."""
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        otp_code = (data.get('otp') or '').strip()
        new_password = data.get('new_password')

        if not email or not otp_code or not new_password:
            return jsonify({'message': 'email, otp, and new_password are required'}), 400
        if len(new_password) < 8:
            return jsonify({'message': 'Password must be at least 8 characters'}), 400

        otp = EmailVerificationOTP.query.filter_by(
            email=email, otp_code=otp_code, purpose='forgot_password', used=False
        ).order_by(EmailVerificationOTP.created_at.desc()).first()

        if not otp:
            return jsonify({'message': 'Invalid OTP'}), 400
        if datetime.utcnow() > otp.expires_at:
            otp.used = True
            db.session.commit()
            return jsonify({'message': 'OTP expired'}), 400

        user = User.query.filter_by(email=email, role='public_user').first()
        if not user:
            return jsonify({'message': 'Account not found'}), 404

        otp.used = True
        user.set_password(new_password)
        db.session.commit()

        return jsonify({'message': 'Password reset successfully. You can now login.'}), 200

    # ═══════════════════════════════════════════════════
    # 2. PUBLIC CATALOG (Guest-accessible)
    # ═══════════════════════════════════════════════════

    @app.get('/public/courses')
    def public_list_courses():
        """List all published courses — accessible to anyone."""
        courses = PublicCourse.query.filter_by(status='published').order_by(PublicCourse.created_at.desc()).all()
        return jsonify({'courses': [c.to_dict() for c in courses]}), 200

    @app.get('/public/courses/<int:course_id>')
    def public_course_detail(course_id):
        """Course detail with content list (file_url hidden for paid content if not subscribed)."""
        course = PublicCourse.query.get(course_id)
        if not course or course.status != 'published':
            return jsonify({'message': 'Course not found'}), 404

        # Check if requester is subscribed or enrolled
        is_subscribed = False
        is_enrolled = False
        profile = None
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header:
            parts = auth_header.split(" ", 1)
            if len(parts) == 2:
                token = parts[1].strip()
        if not token:
            token = request.headers.get("auth_token")

        if token:
            try:
                decoded = pyjwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                user_id = int(decoded.get('sub'))
                profile = PublicProfile.query.filter_by(user_id=user_id).first()
                if profile:
                    sub = CourseSubscription.query.filter_by(
                        public_profile_id=profile.id, course_id=course_id
                    ).first()
                    if sub:
                        is_enrolled = True
                        if sub.status in ('active', 'enrolled'):
                            # 'enrolled' = added to dashboard (free content accessible)
                            # 'active' = fully paid (all content accessible)
                            if sub.status == 'active':
                                is_subscribed = True
            except Exception:
                pass

        contents = CourseContent.query.filter_by(course_id=course_id).order_by(CourseContent.order_index).all()
        content_list = []
        for c in contents:
            d = c.to_dict()
            # Hide file_url for paid content if not subscribed
            if not c.is_free and not is_subscribed:
                d['file_url'] = None
                d['locked'] = True
            else:
                d['locked'] = False

            # Attach exam attempt info (score) if user has taken this exam
            d['attempt_score'] = None
            d['attempt_total'] = None
            d['attempt_submitted'] = False
            if profile and c.content_type == 'pdf_exam':
                submitted_attempt = PublicExamAttempt.query.filter(
                    PublicExamAttempt.public_profile_id == profile.id,
                    PublicExamAttempt.content_id == c.id,
                    PublicExamAttempt.submitted_at.isnot(None)
                ).first()
                if submitted_attempt:
                    d['attempt_score'] = submitted_attempt.score
                    d['attempt_total'] = submitted_attempt.total_questions
                    d['attempt_submitted'] = True

            content_list.append(d)

        return jsonify({
            'course': course.to_dict(),
            'contents': content_list,
            'is_enrolled': is_enrolled,
            'is_subscribed': is_subscribed,
        }), 200

    # ═══════════════════════════════════════════════════
    # 3. ENROLLMENT & PAYMENT
    # ═══════════════════════════════════════════════════

    @app.post('/public/courses/<int:course_id>/enroll')
    @token_required
    def public_enroll_free(current_user, course_id):
        """Enroll in a free course (or free tier of a paid course)."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        course = PublicCourse.query.get(course_id)
        if not course or course.status != 'published':
            return jsonify({'message': 'Course not found'}), 404

        existing = CourseSubscription.query.filter_by(
            public_profile_id=profile.id, course_id=course_id
        ).first()
        if existing:
            if existing.status == 'pending':
                existing.status = 'active' if course.price == 0 else 'enrolled'
                db.session.commit()
            return jsonify({'message': 'Already enrolled', 'subscription': existing.to_dict()}), 200

        sub = CourseSubscription(
            public_profile_id=profile.id,
            course_id=course_id,
            status='active' if course.price == 0 else 'enrolled',  # Free=full access, Paid=dashboard+free content only
        )
        db.session.add(sub)
        db.session.commit()

        return jsonify({'message': 'Enrolled successfully', 'subscription': sub.to_dict()}), 201

    @app.post('/public/courses/<int:course_id>/create-order')
    @token_required
    def public_create_razorpay_order(current_user, course_id):
        """Create a Razorpay order for a paid course."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        course = PublicCourse.query.get(course_id)
        if not course or course.status != 'published':
            return jsonify({'message': 'Course not found'}), 404

        if course.price <= 0:
            return jsonify({'message': 'This course is free — use the enroll endpoint instead'}), 400

        # Check if already subscribed
        existing = CourseSubscription.query.filter_by(
            public_profile_id=profile.id, course_id=course_id, status='active'
        ).first()
        if existing:
            return jsonify({'message': 'Already subscribed'}), 200

        razorpay_key_id = os.getenv('RAZORPAY_KEY_ID')
        razorpay_key_secret = os.getenv('RAZORPAY_KEY_SECRET')
        if not razorpay_key_id or not razorpay_key_secret:
            return jsonify({'message': 'Payment system not configured'}), 500

        try:
            import razorpay
            client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
            order_data = {
                'amount': int(course.price * 100),  # paise
                'currency': 'INR',
                'receipt': f'course_{course_id}_profile_{profile.id}',
                'notes': {
                    'course_id': str(course_id),
                    'profile_id': str(profile.id),
                },
            }
            order = client.order.create(data=order_data)

            # Create pending subscription
            sub = CourseSubscription.query.filter_by(
                public_profile_id=profile.id, course_id=course_id
            ).first()
            if sub:
                sub.razorpay_order_id = order['id']
                sub.status = 'pending'
            else:
                sub = CourseSubscription(
                    public_profile_id=profile.id,
                    course_id=course_id,
                    razorpay_order_id=order['id'],
                    status='pending',
                )
                db.session.add(sub)
            db.session.commit()

            return jsonify({
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency'],
                'key_id': razorpay_key_id,
            }), 200
        except Exception as e:
            current_app.logger.error(f"Razorpay order error: {traceback.format_exc()}")
            return jsonify({'message': f'Payment order creation failed: {str(e)}'}), 500

    @app.post('/public/payment/verify')
    @token_required
    def public_verify_payment(current_user):
        """Verify Razorpay payment signature and activate subscription."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        data = request.get_json(silent=True) or {}
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return jsonify({'message': 'Missing payment details'}), 400

        razorpay_key_secret = os.getenv('RAZORPAY_KEY_SECRET', '')
        msg = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected_sig = hmac.new(
            razorpay_key_secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, razorpay_signature):
            return jsonify({'message': 'Payment verification failed — invalid signature'}), 400

        sub = CourseSubscription.query.filter_by(
            public_profile_id=profile.id, razorpay_order_id=razorpay_order_id
        ).first()
        if not sub:
            return jsonify({'message': 'Subscription not found for this order'}), 404

        sub.razorpay_payment_id = razorpay_payment_id
        sub.status = 'active'
        sub.enrolled_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Payment verified — subscription activated', 'subscription': sub.to_dict()}), 200

    # ═══════════════════════════════════════════════════
    # 4. PDF SERVING & EXAM ATTEMPTS
    # ═══════════════════════════════════════════════════

    @app.get('/public/content/<int:content_id>/file')
    @token_required
    def public_serve_pdf(current_user, content_id):
        """Serve PDF file — checks access (free or subscribed)."""
        content = CourseContent.query.get(content_id)
        if not content or not content.file_url:
            return jsonify({'message': 'Content not found'}), 404

        if content.is_free:
            # Free content — serve to anyone authenticated
            pass
        else:
            profile = get_public_profile(current_user)
            if not profile:
                return jsonify({'message': 'Subscription required'}), 403
            sub = CourseSubscription.query.filter_by(
                public_profile_id=profile.id, course_id=content.course_id, status='active'
            ).first()
            if not sub:
                return jsonify({'message': 'Subscription required to access this content'}), 403

        file_path = os.path.join(PUBLIC_UPLOADS, content.file_url)
        if not os.path.isfile(file_path):
            return jsonify({'message': 'File not found on server'}), 404

        return send_file(file_path, mimetype='application/pdf')

    @app.post('/public/content/<int:content_id>/start-exam')
    @token_required
    def public_start_exam(current_user, content_id):
        """Start a PDF exam attempt."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        content = CourseContent.query.get(content_id)
        if not content or content.content_type not in ('pdf_exam', 'cbt_exam'):
            return jsonify({'message': 'Exam content not found'}), 404

        # Check access
        if not content.is_free:
            sub = CourseSubscription.query.filter_by(
                public_profile_id=profile.id, course_id=content.course_id, status='active'
            ).first()
            if not sub:
                return jsonify({'message': 'Subscription required'}), 403

        # Check if exam was already submitted — prevent retakes
        submitted = PublicExamAttempt.query.filter(
            PublicExamAttempt.public_profile_id == profile.id,
            PublicExamAttempt.content_id == content_id,
            PublicExamAttempt.submitted_at.isnot(None)
        ).first()
        if submitted:
            return jsonify({
                'message': 'Exam already completed',
                'attempt': submitted.to_dict(),
                'total_questions': content.total_questions,
                'already_submitted': True,
            }), 200

        # Check if attempt is in progress (not yet submitted)
        existing = PublicExamAttempt.query.filter_by(
            public_profile_id=profile.id, content_id=content_id, submitted_at=None
        ).first()
        if existing:
            return jsonify({
                'message': 'Exam already in progress',
                'attempt': existing.to_dict(),
                'total_questions': content.total_questions,
            }), 200

        attempt = PublicExamAttempt(
            public_profile_id=profile.id,
            content_id=content_id,
            total_questions=content.total_questions,
        )
        db.session.add(attempt)
        db.session.commit()

        return jsonify({
            'message': 'Exam started',
            'attempt': attempt.to_dict(),
            'total_questions': content.total_questions,
            'duration_minutes': content.duration_minutes,
        }), 201

    @app.get('/public/content/<int:content_id>/questions')
    @token_required
    def public_get_questions(current_user, content_id):
        """Serve CBT questions for a native interactive exam (without answers)."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        content = CourseContent.query.get(content_id)
        if not content or content.content_type != 'cbt_exam':
            return jsonify({'message': 'CBT content not found'}), 404

        # Check access
        if not content.is_free:
            sub = CourseSubscription.query.filter_by(
                public_profile_id=profile.id, course_id=content.course_id, status='active'
            ).first()
            if not sub:
                return jsonify({'message': 'Subscription required'}), 403

        questions = PublicQuestion.query.filter_by(content_id=content_id).order_by(PublicQuestion.order_index).all()
        return jsonify({
            'questions': [q.to_dict(include_answer=False) for q in questions],
            'total': len(questions),
        }), 200

    @app.post('/public/attempts/<int:attempt_id>/submit')
    @token_required
    def public_submit_exam(current_user, attempt_id):
        """Submit answers for a PDF exam and auto-grade."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        attempt = PublicExamAttempt.query.get(attempt_id)
        if not attempt or attempt.public_profile_id != profile.id:
            return jsonify({'message': 'Attempt not found'}), 404
        if attempt.submitted_at:
            return jsonify({'message': 'Already submitted', 'attempt': attempt.to_dict()}), 200

        data = request.get_json(silent=True) or {}
        answers = data.get('answers', {})  # {"1":"A","2":"C",...}

        attempt.answers_json = json.dumps(answers)
        attempt.submitted_at = datetime.utcnow()

        # Auto-grade
        content = CourseContent.query.get(attempt.content_id)
        if content and content.answer_key_json:
            try:
                answer_key = json.loads(content.answer_key_json)
                score = 0
                for q_num, correct_ans in answer_key.items():
                    if answers.get(str(q_num), '').upper() == correct_ans.upper():
                        score += 1
                attempt.score = score
            except Exception:
                attempt.score = None
        db.session.commit()

        return jsonify({
            'message': 'Exam submitted',
            'attempt': attempt.to_dict(),
        }), 200

    @app.get('/public/attempts/<int:attempt_id>/review')
    @token_required
    def public_exam_review(current_user, attempt_id):
        """Return submitted answers alongside the answer key for post-exam review."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        attempt = PublicExamAttempt.query.get(attempt_id)
        if not attempt or attempt.public_profile_id != profile.id:
            return jsonify({'message': 'Attempt not found'}), 404
        if not attempt.submitted_at:
            return jsonify({'message': 'Exam not yet submitted'}), 400

        content = CourseContent.query.get(attempt.content_id)
        answer_key = {}
        if content and content.answer_key_json:
            try:
                answer_key = json.loads(content.answer_key_json)
            except Exception:
                pass

        user_answers = {}
        if attempt.answers_json:
            try:
                user_answers = json.loads(attempt.answers_json)
            except Exception:
                pass

        return jsonify({
            'attempt': attempt.to_dict(),
            'user_answers': user_answers,
            'answer_key': answer_key,
            'total_questions': content.total_questions if content else 0,
            'duration_minutes': content.duration_minutes if content else 60,
            'questions': [],  # will be populated for CBT
        }), 200

    # ═══════════════════════════════════════════════════
    # 5. PUBLIC USER DASHBOARD
    # ═══════════════════════════════════════════════════

    @app.get('/public/me/profile')
    @token_required
    def public_my_profile(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile not found'}), 404
        return jsonify({'profile': profile.to_dict()}), 200

    @app.put('/public/me/profile')
    @token_required
    def public_update_profile(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'phone_number' in data:
            profile.phone_number = (data['phone_number'] or '').strip() or None
        if 'address' in data:
            profile.address = (data['address'] or '').strip() or None
        if 'username' in data:
            new_un = (data['username'] or '').strip()
            if new_un and new_un != current_user.username:
                if User.query.filter(User.username == new_un, User.id != current_user.id).first():
                    return jsonify({'message': 'Username already taken'}), 409
                current_user.username = new_un
        db.session.commit()
        return jsonify({'message': 'Profile updated', 'profile': profile.to_dict()}), 200

    @app.get('/public/me/subscriptions')
    @token_required
    def public_my_subscriptions(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'subscriptions': []}), 200
        subs = CourseSubscription.query.filter(
            CourseSubscription.public_profile_id == profile.id,
            CourseSubscription.status.in_(['active', 'enrolled', 'pending'])
        ).all()
        return jsonify({'subscriptions': [s.to_dict() for s in subs]}), 200

    @app.get('/public/me/attempts')
    @token_required
    def public_my_attempts(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'attempts': []}), 200
        attempts = PublicExamAttempt.query.filter_by(
            public_profile_id=profile.id
        ).order_by(PublicExamAttempt.start_time.desc()).all()
        return jsonify({'attempts': [a.to_dict() for a in attempts]}), 200

    @app.get('/public/me/dashboard-data')
    @token_required
    def public_my_dashboard_data(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'dashboard_courses': [], 'available_courses': []}), 200

        # 1. Get all active/enrolled/pending subscriptions for this user
        subs = CourseSubscription.query.filter(
            CourseSubscription.public_profile_id == profile.id,
            CourseSubscription.status.in_(['active', 'enrolled', 'pending'])
        ).all()
        
        enrolled_course_ids = [sub.course_id for sub in subs]
        
        dashboard_courses = []
        for sub in subs:
            course = sub.course
            if not course or course.status != 'published':
                continue
                
            is_subscribed = (sub.status == 'active')
            
            # Fetch contents for this course
            contents = CourseContent.query.filter_by(course_id=course.id).order_by(CourseContent.order_index).all()
            content_list = []
            for c in contents:
                d = c.to_dict()
                
                # Lock premium content if not fully subscribed
                if not c.is_free and not is_subscribed:
                    d['file_url'] = None
                    d['locked'] = True
                else:
                    d['locked'] = False
                    
                # Attach exam attempt info
                d['attempt_score'] = None
                d['attempt_total'] = None
                d['attempt_submitted'] = False
                if c.content_type == 'pdf_exam':
                    submitted_attempt = PublicExamAttempt.query.filter(
                        PublicExamAttempt.public_profile_id == profile.id,
                        PublicExamAttempt.content_id == c.id,
                        PublicExamAttempt.submitted_at.isnot(None)
                    ).first()
                    if submitted_attempt:
                        d['attempt_score'] = submitted_attempt.score
                        d['attempt_total'] = submitted_attempt.total_questions
                        d['attempt_submitted'] = True
                        
                content_list.append(d)
                
            dashboard_courses.append({
                'subscription': sub.to_dict(),
                'course': course.to_dict(),
                'contents': content_list
            })

        # 2. Get available courses (published and not enrolled)
        available_query = PublicCourse.query.filter_by(status='published')
        if enrolled_course_ids:
            available_query = available_query.filter(~PublicCourse.id.in_(enrolled_course_ids))
        available_courses = [c.to_dict() for c in available_query.all()]

        return jsonify({
            'dashboard_courses': dashboard_courses,
            'available_courses': available_courses
        }), 200

    # ═══════════════════════════════════════════════════
    # 6. ADMIN — MANAGE PUBLIC Public
    # ═══════════════════════════════════════════════════

    @app.get('/admin/public/courses')
    @role_required('admin')
    def admin_public_list_courses(current_user):
        courses = PublicCourse.query.order_by(PublicCourse.created_at.desc()).all()
        return jsonify({'courses': [c.to_dict() for c in courses]}), 200

    @app.post('/admin/public/courses')
    @role_required('admin')
    def admin_public_create_course(current_user):
        data = request.get_json(silent=True) or {}
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'message': 'Title is required'}), 400

        course = PublicCourse(
            title=title,
            description=(data.get('description') or '').strip() or None,
            thumbnail_url=(data.get('thumbnail_url') or '').strip() or None,
            price=float(data.get('price', 0)),
            status=data.get('status', 'draft'),
            created_by=current_user.id,
        )
        db.session.add(course)
        db.session.commit()
        return jsonify({'message': 'Course created', 'course': course.to_dict()}), 201

    @app.put('/admin/public/courses/<int:course_id>')
    @role_required('admin')
    def admin_public_update_course(current_user, course_id):
        course = PublicCourse.query.get(course_id)
        if not course:
            return jsonify({'message': 'Course not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'title' in data:
            course.title = (data['title'] or '').strip()
        if 'description' in data:
            course.description = (data['description'] or '').strip() or None
        if 'thumbnail_url' in data:
            course.thumbnail_url = (data['thumbnail_url'] or '').strip() or None
        if 'price' in data:
            course.price = float(data['price'])
        if 'status' in data:
            course.status = data['status']
        db.session.commit()

        return jsonify({'message': 'Course updated', 'course': course.to_dict()}), 200

    @app.delete('/admin/public/courses/<int:course_id>')
    @role_required('admin')
    def admin_public_delete_course(current_user, course_id):
        course = PublicCourse.query.get(course_id)
        if not course:
            return jsonify({'message': 'Course not found'}), 404
        db.session.delete(course)
        db.session.commit()
        return jsonify({'message': 'Course deleted'}), 200

    # ── Content Management ──

    @app.get('/admin/public/courses/<int:course_id>/contents')
    @role_required('admin')
    def admin_public_list_contents(current_user, course_id):
        course = PublicCourse.query.get(course_id)
        if not course:
            return jsonify({'message': 'Course not found'}), 404
        contents = CourseContent.query.filter_by(course_id=course_id).order_by(CourseContent.order_index).all()
        return jsonify({'contents': [c.to_dict(include_answers=True) for c in contents]}), 200

    @app.post('/admin/public/courses/<int:course_id>/contents')
    @role_required('admin')
    def admin_public_upload_content(current_user, course_id):
        """Upload a PDF and create content entry. Use multipart/form-data."""
        course = PublicCourse.query.get(course_id)
        if not course:
            return jsonify({'message': 'Course not found'}), 404

        title = request.form.get('title', '').strip()
        content_type = request.form.get('content_type', 'pdf_material')
        is_free = request.form.get('is_free', 'false').lower() == 'true'
        total_questions = request.form.get('total_questions')
        answer_key_json = request.form.get('answer_key_json')
        duration_minutes = request.form.get('duration_minutes', '60')
        order_index = request.form.get('order_index', '0')

        if not title:
            return jsonify({'message': 'Title is required'}), 400

        file_url = None
        if 'file' in request.files:
            f = request.files['file']
            if f and allowed_pdf(f.filename):
                fname = secure_filename(f.filename)
                unique_name = f"{course_id}_{int(datetime.utcnow().timestamp())}_{fname}"
                f.save(os.path.join(PUBLIC_UPLOADS, unique_name))
                file_url = unique_name
            else:
                return jsonify({'message': 'Only PDF files are allowed'}), 400

        content = CourseContent(
            course_id=course_id,
            title=title,
            content_type=content_type,
            file_url=file_url,
            is_free=is_free,
            total_questions=int(total_questions) if total_questions else None,
            answer_key_json=answer_key_json or None,
            duration_minutes=int(duration_minutes) if duration_minutes else 60,
            order_index=int(order_index) if order_index else 0,
        )
        db.session.add(content)
        db.session.commit()

        return jsonify({'message': 'Content uploaded', 'content': content.to_dict(include_answers=True)}), 201

    @app.put('/admin/public/contents/<int:content_id>')
    @role_required('admin')
    def admin_public_update_content(current_user, content_id):
        content = CourseContent.query.get(content_id)
        if not content:
            return jsonify({'message': 'Content not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'title' in data:
            content.title = (data['title'] or '').strip()
        if 'content_type' in data:
            content.content_type = data['content_type']
        if 'is_free' in data:
            content.is_free = bool(data['is_free'])
        if 'total_questions' in data:
            content.total_questions = int(data['total_questions']) if data['total_questions'] else None
        if 'answer_key_json' in data:
            content.answer_key_json = data['answer_key_json'] or None
        if 'duration_minutes' in data:
            content.duration_minutes = int(data['duration_minutes']) if data['duration_minutes'] else 60
        if 'order_index' in data:
            content.order_index = int(data['order_index'])
        db.session.commit()

        return jsonify({'message': 'Content updated', 'content': content.to_dict(include_answers=True)}), 200

    @app.delete('/admin/public/contents/<int:content_id>')
    @role_required('admin')
    def admin_public_delete_content(current_user, content_id):
        content = CourseContent.query.get(content_id)
        if not content:
            return jsonify({'message': 'Content not found'}), 404

        # Delete file from disk
        if content.file_url:
            file_path = os.path.join(PUBLIC_UPLOADS, content.file_url)
            if os.path.isfile(file_path):
                os.remove(file_path)

        db.session.delete(content)
        db.session.commit()
        return jsonify({'message': 'Content deleted'}), 200

    # ── Subscriptions Overview ──

    @app.get('/admin/public/subscriptions')
    @role_required('admin')
    def admin_public_subscriptions(current_user):
        subs = CourseSubscription.query.order_by(CourseSubscription.enrolled_at.desc()).all()
        result = []
        for s in subs:
            d = s.to_dict()
            d['username'] = s.profile.user.username if s.profile and s.profile.user else None
            d['email'] = s.profile.user.email if s.profile and s.profile.user else None
            result.append(d)
        return jsonify({'subscriptions': result, 'count': len(result)}), 200

    # ── Smart Paste: Parse raw text into CBT questions ──

    @app.post('/admin/public/contents/<int:content_id>/smart-questions')
    @role_required('admin')
    def admin_smart_paste_questions(current_user, content_id):
        """Parse raw pasted text into native CBT questions and save them."""
        content = CourseContent.query.get(content_id)
        if not content:
            return jsonify({'message': 'Content not found'}), 404

        data = request.get_json(silent=True) or {}
        raw_text = data.get('raw_text', '').strip()
        if not raw_text:
            return jsonify({'message': 'No text provided'}), 400

        # ── Regex parser ──
        # Supports patterns like:
        #   1. Question text?        OR    Q1. Question text?
        #   A) Option A              OR    a) Option A
        #   B) Option B
        #   C) Option C
        #   D) Option D
        #   Answer: B                OR    Ans: B
        #   Explanation: optional
        question_pattern = re.compile(
            r'(?:Q?\s*)(\d+)[.)\s]+(.+?)\s*'
            r'[Aa][.)\s]+(.+?)\s*'
            r'[Bb][.)\s]+(.+?)\s*'
            r'[Cc][.)\s]+(.+?)\s*'
            r'[Dd][.)\s]+(.+?)\s*'
            r'(?:Ans(?:wer)?\s*[:.)\s]+\s*([A-Da-d]))'
            r'(?:\s*Explanation\s*[:.)\s]*(.+?))?'
            r'(?=\s*(?:Q?\s*\d+[.)\s])|$)',
            re.DOTALL | re.IGNORECASE
        )

        matches = question_pattern.findall(raw_text)

        if not matches:
            # Fallback: try a simpler line-by-line approach
            matches = _parse_questions_simple(raw_text)

        if not matches:
            return jsonify({'message': 'Could not parse any questions from the provided text. Please check the format.'}), 400

        # Delete existing questions for this content (overwrite)
        PublicQuestion.query.filter_by(content_id=content_id).delete()

        created = []
        answer_key = {}
        for idx, m in enumerate(matches):
            q_num = m[0] if m[0] else str(idx + 1)
            q_text = m[1].strip()
            opt_a = m[2].strip()
            opt_b = m[3].strip()
            opt_c = m[4].strip()
            opt_d = m[5].strip()
            correct = m[6].strip().upper() if len(m) > 6 and m[6] else 'A'
            explanation = m[7].strip() if len(m) > 7 and m[7] else None

            options = json.dumps({'A': opt_a, 'B': opt_b, 'C': opt_c, 'D': opt_d})
            q = PublicQuestion(
                content_id=content_id,
                question_text=q_text,
                options_json=options,
                correct_option=correct,
                explanation=explanation,
                order_index=int(q_num),
            )
            db.session.add(q)
            created.append(q)
            answer_key[str(q_num)] = correct

        # Update CourseContent metadata
        content.content_type = 'cbt_exam'
        content.total_questions = len(created)
        content.answer_key_json = json.dumps(answer_key)
        db.session.commit()

        return jsonify({
            'message': f'{len(created)} questions parsed and saved',
            'questions': [q.to_dict(include_answer=True) for q in created],
            'content': content.to_dict(include_answers=True),
        }), 201

    @app.get('/admin/public/contents/<int:content_id>/questions')
    @role_required('admin')
    def admin_list_questions(current_user, content_id):
        """List all questions for a content item (admin view with answers)."""
        questions = PublicQuestion.query.filter_by(content_id=content_id).order_by(PublicQuestion.order_index).all()
        return jsonify({
            'questions': [q.to_dict(include_answer=True) for q in questions],
            'total': len(questions),
        }), 200


def _parse_questions_simple(raw_text):
    """Fallback line-by-line parser for simpler text formats."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    questions = []
    i = 0
    while i < len(lines):
        # Try to match a question number line
        q_match = re.match(r'^(?:Q?\s*)(\d+)[.)\s]+(.+)', lines[i], re.IGNORECASE)
        if q_match and i + 4 < len(lines):
            q_num = q_match.group(1)
            q_text = q_match.group(2).strip()
            opts = []
            j = i + 1
            for letter in ['A', 'B', 'C', 'D']:
                if j < len(lines):
                    opt_match = re.match(r'^[A-Da-d][.)\s]+(.+)', lines[j])
                    if opt_match:
                        opts.append(opt_match.group(1).strip())
                        j += 1
                    else:
                        opts.append(lines[j])
                        j += 1
                else:
                    opts.append('')

            correct = 'A'
            explanation = None
            if j < len(lines):
                ans_match = re.match(r'^(?:Ans(?:wer)?\s*[:.)\s]+\s*)([A-Da-d])', lines[j], re.IGNORECASE)
                if ans_match:
                    correct = ans_match.group(1).upper()
                    j += 1
            if j < len(lines):
                exp_match = re.match(r'^(?:Explanation\s*[:.)\s]*)(.+)', lines[j], re.IGNORECASE)
                if exp_match:
                    explanation = exp_match.group(1).strip()
                    j += 1

            questions.append((q_num, q_text, opts[0], opts[1], opts[2], opts[3], correct, explanation or ''))
            i = j
        else:
            i += 1
    return questions
