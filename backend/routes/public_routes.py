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
    PublicUser, PublicCourse, CourseContent,
    CourseSubscription, PublicExamAttempt, EmailVerificationOTP,
    PublicQuestion,
    PublicQuestionRepo, PublicCourseContentQuestion,
    PublicPracticeAttempt, PublicDailyChallengeAttempt,
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
        return current_user

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
        if PublicUser.query.filter_by(email=email).first():
            return jsonify({'message': 'An account with this email already exists'}), 409
        if PublicUser.query.filter_by(username=username).first():
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
        if PublicUser.query.filter_by(email=email).first():
            return jsonify({'message': 'An account with this email already exists'}), 409
        if PublicUser.query.filter_by(username=username).first():
            return jsonify({'message': 'Username is already taken'}), 409

        try:
            otp.used = True
            user = PublicUser(username=username, role='public_user', email=email, is_verified=True, phone_number=phone_number)
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

            # Auto-enroll if a course was selected
            if course_id:
                course = PublicCourse.query.get(course_id)
                if course and course.status == 'published':
                    sub_status = 'active' if course.price == 0 else 'enrolled'
                    sub = CourseSubscription(
                        public_user_id=user.id,
                        course_id=course.id,
                        status=sub_status
                    )
                    db.session.add(sub)
            
            db.session.commit()

            # Auto-login: generate JWT
            payload = {
                'sub': str(user.id),
                'user_type': 'public',
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

        user = PublicUser.query.filter_by(email=email, role='public_user').first()
        if not user or not user.check_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401

        if not user.is_verified:
            return jsonify({'message': 'Please verify your email before logging in'}), 403

        payload = {
            'sub': str(user.id),
            'user_type': 'public',
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

        user = PublicUser.query.filter_by(email=email, role='public_user').first()
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

        user = PublicUser.query.filter_by(email=email, role='public_user').first()
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
                profile = PublicUser.query.filter_by(user_id=user_id).first()
                if profile:
                    sub = CourseSubscription.query.filter_by(
                        public_user_id=profile.id, course_id=course_id
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
            # Hide draft content from students
            if c.status == 'draft':
                continue
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
            if profile and c.content_type in ('pdf_exam', 'cbt_exam'):
                submitted_attempt = PublicExamAttempt.query.filter(
                    PublicExamAttempt.public_user_id == profile.id,
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
            public_user_id=profile.id, course_id=course_id
        ).first()
        if existing:
            if existing.status == 'pending':
                existing.status = 'active' if course.price == 0 else 'enrolled'
                db.session.commit()
            return jsonify({'message': 'Already enrolled', 'subscription': existing.to_dict()}), 200

        sub = CourseSubscription(
            public_user_id=profile.id,
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
            public_user_id=profile.id, course_id=course_id, status='active'
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
                public_user_id=profile.id, course_id=course_id
            ).first()
            if sub:
                sub.razorpay_order_id = order['id']
                sub.status = 'pending'
            else:
                sub = CourseSubscription(
                    public_user_id=profile.id,
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
            public_user_id=profile.id, razorpay_order_id=razorpay_order_id
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
                public_user_id=profile.id, course_id=content.course_id, status='active'
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
                public_user_id=profile.id, course_id=content.course_id, status='active'
            ).first()
            if not sub:
                return jsonify({'message': 'Subscription required'}), 403

        # Check if exam was already submitted — prevent retakes
        submitted = PublicExamAttempt.query.filter(
            PublicExamAttempt.public_user_id == profile.id,
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
            public_user_id=profile.id, content_id=content_id, submitted_at=None
        ).first()
        if existing:
            return jsonify({
                'message': 'Exam already in progress',
                'attempt': existing.to_dict(),
                'total_questions': content.total_questions,
            }), 200

        attempt = PublicExamAttempt(
            public_user_id=profile.id,
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
                public_user_id=profile.id, course_id=content.course_id, status='active'
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
        if not attempt or attempt.public_user_id != profile.id:
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
        if not attempt or attempt.public_user_id != profile.id:
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
            CourseSubscription.public_user_id == profile.id,
            CourseSubscription.status.in_(['active', 'enrolled', 'pending'])
        ).all()
        return jsonify({'subscriptions': [s.to_dict() for s in subs]}), 200

    @app.get('/public/me/attempts')
    @token_required
    def public_my_attempts(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'attempts': []}), 200
            
        merged_attempts = []
        
        # 1. Static Mock Exams
        exams = PublicExamAttempt.query.filter_by(public_user_id=profile.id).order_by(PublicExamAttempt.start_time.desc()).all()
        for e in exams:
            merged_attempts.append({
                'id': f"exam_{e.id}",
                'type': 'exam',
                'content_title': e.content.title if e.content else 'Mock Test',
                'score': e.score,
                'total_questions': e.total_questions,
                'start_time': e.start_time.isoformat() if e.start_time else None,
                'submitted_at': e.submitted_at.isoformat() if e.submitted_at else None
            })
            
        # 2. Practice Sessions
        practices = PublicPracticeAttempt.query.filter_by(public_user_id=profile.id).order_by(PublicPracticeAttempt.start_time.desc()).all()
        for p in practices:
            title = 'Practice Session'
            if p.subject: title = f"{p.subject} Practice"
            if p.chapter: title += f" - {p.chapter}"
            merged_attempts.append({
                'id': f"practice_{p.id}",
                'type': 'practice',
                'content_title': title,
                'score': p.score,
                'total_questions': p.total_questions,
                'start_time': p.start_time.isoformat() if p.start_time else None,
                'submitted_at': p.submitted_at.isoformat() if p.submitted_at else None
            })
                
        # Sort by submitted_at (descending)
        merged_attempts.sort(key=lambda x: x.get('submitted_at') or '1970-01-01', reverse=True)
        
        return jsonify({'attempts': merged_attempts}), 200

    @app.get('/public/me/dashboard-data')
    @token_required
    def public_my_dashboard_data(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'dashboard_courses': [], 'available_courses': []}), 200

        # 1. Get all active/enrolled/pending subscriptions for this user
        subs = CourseSubscription.query.filter(
            CourseSubscription.public_user_id == profile.id,
            CourseSubscription.status.in_(['active', 'enrolled', 'pending'])
        ).all()
        
        enrolled_course_ids = [sub.course_id for sub in subs]
        
        dashboard_courses = []
        for sub in subs:
            course = sub.course
            if not course or course.status != 'published':
                continue
                
            is_subscribed = (sub.status == 'active')
            
            # Fetch published contents for this course (hide drafts from students)
            contents = CourseContent.query.filter_by(course_id=course.id).order_by(CourseContent.order_index).all()
            content_list = []
            for c in contents:
                if c.status == 'draft':
                    continue
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
                if c.content_type in ('pdf_exam', 'cbt_exam'):
                    submitted_attempt = PublicExamAttempt.query.filter(
                        PublicExamAttempt.public_user_id == profile.id,
                        PublicExamAttempt.content_id == c.id,
                        PublicExamAttempt.submitted_at.isnot(None)
                    ).first()
                    if submitted_attempt:
                        d['attempt_score'] = submitted_attempt.score
                        d['attempt_total'] = submitted_attempt.total_questions
                        d['attempt_submitted'] = True
                        
                content_list.append(d)
            # Dynamically fetch PYQ years and Practice subjects from Repo
            course_tags = [course.title.strip().upper()]
            if getattr(course, 'target_tags', None):
                course_tags = [t.strip().upper() for t in course.target_tags.split(',') if t.strip()]

            tag_filters = [PublicQuestionRepo.course_tags.ilike(f"%{t}%") for t in course_tags]

            pyq_years_q = db.session.query(PublicQuestionRepo.pyq_year).filter(
                PublicQuestionRepo.is_pyq == True,
                db.or_(*tag_filters)
            ).distinct().all()
            available_pyqs = sorted([y[0] for y in pyq_years_q if y[0]], reverse=True)
            
            practice_subs_q = db.session.query(PublicQuestionRepo.subject).filter(
                db.or_(*tag_filters)
            ).distinct().all()
            practice_subjects = sorted([s[0] for s in practice_subs_q if s[0]])
                
            dashboard_courses.append({
                'subscription': sub.to_dict(),
                'course': course.to_dict(),
                'contents': content_list,
                'available_pyqs': available_pyqs,
                'practice_subjects': practice_subjects
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
            target_tags=(data.get('target_tags') or '').strip() or None,
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
        if 'target_tags' in data:
            course.target_tags = (data['target_tags'] or '').strip() or None
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
        subject = request.form.get('subject', '').strip() or None
        is_previous_paper = request.form.get('is_previous_paper', 'false').lower() == 'true'

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
            subject=subject,
            is_previous_paper=is_previous_paper,
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
        if 'status' in data and data['status'] in ('draft', 'published'):
            content.status = data['status']
        if 'subject' in data:
            content.subject = (data['subject'] or '').strip() or None
        if 'is_previous_paper' in data:
            content.is_previous_paper = bool(data['is_previous_paper'])
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

    # ═══════════════════════════════════════════════════
    # 7. STUDY MODE (practice without recording attempt)
    # ═══════════════════════════════════════════════════

    @app.post('/public/content/<int:content_id>/study-session')
    @token_required
    def public_study_session(current_user, content_id):
        """Return questions WITH answers for practice mode. No attempt created."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        content = CourseContent.query.get(content_id)
        if not content or content.content_type not in ('pdf_exam', 'cbt_exam'):
            return jsonify({'message': 'Exam content not found'}), 404

        # Check access
        if not content.is_free:
            sub = CourseSubscription.query.filter_by(
                public_user_id=profile.id, course_id=content.course_id, status='active'
            ).first()
            if not sub:
                return jsonify({'message': 'Subscription required'}), 403

        # For CBT: return native questions with answers
        if content.content_type == 'cbt_exam':
            questions = PublicQuestion.query.filter_by(content_id=content_id).order_by(PublicQuestion.order_index).all()
            return jsonify({
                'questions': [q.to_dict(include_answer=True) for q in questions],
                'total': len(questions),
                'answer_key': {str(q.order_index): q.correct_option for q in questions},
                'duration_minutes': content.duration_minutes,
                'mode': 'study',
            }), 200

        # For PDF: return the answer key so the student can self-check
        answer_key = {}
        if content.answer_key_json:
            try:
                answer_key = json.loads(content.answer_key_json)
            except Exception:
                pass

        return jsonify({
            'questions': [],
            'total': content.total_questions or 0,
            'answer_key': answer_key,
            'duration_minutes': content.duration_minutes,
            'mode': 'study',
        }), 200

    # ═══════════════════════════════════════════════════
    # 8. BATCH REORDER CONTENT (drag-and-drop)
    # ═══════════════════════════════════════════════════

    @app.put('/admin/public/courses/<int:course_id>/reorder')
    @role_required('admin')
    def admin_public_reorder_contents(current_user, course_id):
        """Batch-update order_index for all content items in a course."""
        course = PublicCourse.query.get(course_id)
        if not course:
            return jsonify({'message': 'Course not found'}), 404

        data = request.get_json(silent=True) or {}
        ordered_ids = data.get('order', [])

        if not ordered_ids or not isinstance(ordered_ids, list):
            return jsonify({'message': 'order array is required'}), 400

        for idx, content_id in enumerate(ordered_ids):
            content = CourseContent.query.get(content_id)
            if content and content.course_id == course_id:
                content.order_index = idx
        db.session.commit()

        return jsonify({'message': f'Reordered {len(ordered_ids)} items'}), 200

    # ═══════════════════════════════════════════════════════════
    # 9. CENTRAL PUBLIC QUESTION REPOSITORY (Admin CRUD)
    # ═══════════════════════════════════════════════════════════

    @app.get('/admin/public/repository')
    @role_required('admin')
    def admin_repo_list(current_user):
        """List/filter questions in the central public repository."""
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        subject = request.args.get('subject', '').strip()
        chapter = request.args.get('chapter', '').strip()
        topic = request.args.get('topic', '').strip()
        course_tags = request.args.get('course_tags', '').strip()
        difficulty = request.args.get('difficulty', '').strip()
        search = request.args.get('search', '').strip()

        query = PublicQuestionRepo.query
        if subject:
            query = query.filter(PublicQuestionRepo.subject.ilike(subject))
        if chapter:
            query = query.filter(PublicQuestionRepo.chapter.ilike(f'%{chapter}%'))
        if topic:
            query = query.filter(PublicQuestionRepo.topic.ilike(f'%{topic}%'))
        if course_tags:
            query = query.filter(PublicQuestionRepo.course_tags.ilike(f'%{course_tags}%'))
        if difficulty:
            query = query.filter(PublicQuestionRepo.difficulty == difficulty)
        if search:
            like = f'%{search}%'
            query = query.filter(
                db.or_(
                    PublicQuestionRepo.text.ilike(like),
                    PublicQuestionRepo.custom_id.ilike(like),
                )
            )

        pagination = query.order_by(PublicQuestionRepo.id.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        return jsonify({
            'questions': [q.to_dict(include_answer=True) for q in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': pagination.page,
        }), 200

    @app.get('/admin/public/repository/meta')
    @role_required('admin')
    def admin_repo_meta(current_user):
        """Return distinct subjects, chapters, and topics for filter dropdowns."""
        subjects = [r[0] for r in db.session.query(PublicQuestionRepo.subject).distinct().all() if r[0]]
        chapters = [r[0] for r in db.session.query(PublicQuestionRepo.chapter).distinct().all() if r[0]]
        topics = [r[0] for r in db.session.query(PublicQuestionRepo.topic).distinct().all() if r[0]]
        return jsonify({'subjects': sorted(subjects), 'chapters': sorted(chapters), 'topics': sorted(topics)}), 200

    @app.post('/admin/public/repository')
    @role_required('admin')
    def admin_repo_add(current_user):
        """Add a single question to the central repository."""
        data = request.get_json(silent=True) or {}
        if not data.get('text') or not data.get('subject') or not data.get('correct_answer'):
            return jsonify({'message': 'text, subject, and correct_answer are required'}), 400

        q = PublicQuestionRepo(
            course_tags=(data.get('course_tags') or '').strip() or None,
            subject=data['subject'].strip(),
            chapter=(data.get('chapter') or '').strip() or None,
            topic=(data.get('topic') or '').strip() or None,
            difficulty=data.get('difficulty', 'Medium'),
            is_pyq=bool(data.get('is_pyq')),
            pyq_year=int(data['pyq_year']) if data.get('pyq_year') else None,
            text=data['text'].strip(),
            option_a=(data.get('option_a') or '').strip(),
            option_b=(data.get('option_b') or '').strip(),
            option_c=(data.get('option_c') or '').strip(),
            option_d=(data.get('option_d') or '').strip(),
            correct_answer=data['correct_answer'].strip().upper(),
            explanation=(data.get('explanation') or '').strip() or None,
            marks=int(data.get('marks') or 1),
        )
        db.session.add(q)
        db.session.commit()
        return jsonify({'message': 'Question added', 'question': q.to_dict(include_answer=True)}), 201

    @app.put('/admin/public/repository/<int:q_id>')
    @role_required('admin')
    def admin_repo_update(current_user, q_id):
        """Edit a single question in the repository."""
        q = PublicQuestionRepo.query.get(q_id)
        if not q:
            return jsonify({'message': 'Question not found'}), 404
        data = request.get_json(silent=True) or {}
        for field in ['text', 'option_a', 'option_b', 'option_c', 'option_d',
                       'correct_answer', 'explanation', 'subject', 'chapter', 'topic',
                       'difficulty', 'course_tags', 'image_path']:
            if field in data:
                setattr(q, field, (data[field] or '').strip() if isinstance(data[field], str) else data[field])
        if 'marks' in data:
            q.marks = int(data['marks'] or 1)
        if 'is_pyq' in data:
            q.is_pyq = bool(data['is_pyq'])
        if 'pyq_year' in data:
            q.pyq_year = int(data['pyq_year']) if data['pyq_year'] else None
        db.session.commit()
        return jsonify({'message': 'Question updated', 'question': q.to_dict(include_answer=True)}), 200

    @app.delete('/admin/public/repository/<int:q_id>')
    @role_required('admin')
    def admin_repo_delete(current_user, q_id):
        """Delete a single question from the repository."""
        q = PublicQuestionRepo.query.get(q_id)
        if not q:
            return jsonify({'message': 'Question not found'}), 404
        db.session.delete(q)
        db.session.commit()
        return jsonify({'message': 'Question deleted'}), 200

    # ═══════════════════════════════════════════════════════════
    # 10. ADVANCED SMART PASTE (Repo bulk upload with metadata)
    # ═══════════════════════════════════════════════════════════

    @app.post('/admin/public/repository/smart-paste')
    @role_required('admin')
    def admin_repo_smart_paste(current_user):
        """
        Parse raw pasted text and insert questions into the central repository.
        Batch metadata (subject, chapter, topic, course_tags, difficulty) is applied to all parsed questions.
        """
        data = request.get_json(silent=True) or {}
        raw_text = data.get('raw_text', '').strip()
        if not raw_text:
            return jsonify({'message': 'raw_text is required'}), 400

        batch_subject = (data.get('subject') or '').strip()
        if not batch_subject:
            return jsonify({'message': 'subject is required for batch metadata'}), 400

        batch_chapter = (data.get('chapter') or '').strip() or None
        batch_topic = (data.get('topic') or '').strip() or None
        batch_tags = (data.get('course_tags') or '').strip() or None
        batch_difficulty = data.get('difficulty', 'Medium')
        batch_is_pyq = bool(data.get('is_pyq'))
        batch_pyq_year = int(data['pyq_year']) if data.get('pyq_year') else None

        # Use the existing smart parser
        pattern = re.compile(
            r'(?:Q?\s*)(\d+)\s*[.)]\s*(.*?)\s*'
            r'[Aa][.)]\s*(.*?)\s*'
            r'[Bb][.)]\s*(.*?)\s*'
            r'[Cc][.)]\s*(.*?)\s*'
            r'[Dd][.)]\s*(.*?)\s*'
            r'(?:Ans(?:wer)?\s*[:.)]\s*([A-Da-d]))?\s*'
            r'(?:Explanation\s*[:.)]\s*(.*?))?'
            r'(?=(?:Q?\s*\d+\s*[.)])|$)',
            re.DOTALL | re.IGNORECASE
        )
        matches = pattern.findall(raw_text)
        if not matches:
            matches = _parse_questions_simple(raw_text)

        if not matches:
            return jsonify({'message': 'Could not parse any questions. Please check the format.'}), 400

        created = []
        for idx, m in enumerate(matches):
            q_text = m[1].strip() if len(m) > 1 else ''
            opt_a = m[2].strip() if len(m) > 2 else ''
            opt_b = m[3].strip() if len(m) > 3 else ''
            opt_c = m[4].strip() if len(m) > 4 else ''
            opt_d = m[5].strip() if len(m) > 5 else ''
            correct = m[6].strip().upper() if len(m) > 6 and m[6] else 'A'
            explanation = m[7].strip() if len(m) > 7 and m[7] else None

            if not q_text:
                continue

            q = PublicQuestionRepo(
                course_tags=batch_tags,
                subject=batch_subject,
                chapter=batch_chapter,
                topic=batch_topic,
                difficulty=batch_difficulty,
                is_pyq=batch_is_pyq,
                pyq_year=batch_pyq_year,
                text=q_text,
                option_a=opt_a,
                option_b=opt_b,
                option_c=opt_c,
                option_d=opt_d,
                correct_answer=correct,
                explanation=explanation,
            )
            db.session.add(q)
            created.append(q)

        db.session.commit()
        return jsonify({
            'message': f'{len(created)} questions added to the repository',
            'questions': [q.to_dict(include_answer=True) for q in created],
        }), 201

    # ═══════════════════════════════════════════════════════════
    # 11. DYNAMIC PRACTICE ENGINE (Student-facing)
    # ═══════════════════════════════════════════════════════════

    @app.post('/public/practice/start')
    @token_required
    def public_practice_start(current_user):
        """
        Generate a dynamic practice session from the central repository.
        Accepts: course_tags, subject (optional), chapter (optional), difficulty (optional), count (default 20).
        """
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        data = request.get_json(silent=True) or {}
        course_tags = (data.get('course_tags') or '').strip()
        subject = (data.get('subject') or '').strip()
        chapter = (data.get('chapter') or '').strip()
        difficulty = (data.get('difficulty') or '').strip()
        count = min(int(data.get('count', 20)), 50)

        query = PublicQuestionRepo.query
        if course_tags:
            query = query.filter(PublicQuestionRepo.course_tags.ilike(f'%{course_tags}%'))
        if subject:
            query = query.filter(PublicQuestionRepo.subject.ilike(subject))
        if chapter:
            query = query.filter(PublicQuestionRepo.chapter.ilike(f'%{chapter}%'))
        if difficulty and difficulty != 'Random':
            query = query.filter(PublicQuestionRepo.difficulty == difficulty)

        # Pull random questions
        all_ids = [r[0] for r in query.with_entities(PublicQuestionRepo.id).all()]
        if not all_ids:
            return jsonify({'message': 'No questions found matching filters'}), 404

        selected_ids = random.sample(all_ids, min(count, len(all_ids)))
        questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(selected_ids)).all()

        # Find a course_id to link (use first subscribed course or 0)
        sub = CourseSubscription.query.filter_by(public_user_id=profile.id, status='active').first()
        course_id = sub.course_id if sub else 0

        attempt = PublicPracticeAttempt(
            public_user_id=profile.id,
            course_id=course_id,
            subject=subject or None,
            chapter=chapter or None,
            difficulty=difficulty or 'Random',
            questions_json=json.dumps(selected_ids),
            total_questions=len(selected_ids),
        )
        db.session.add(attempt)
        db.session.commit()

        return jsonify({
            'attempt_id': attempt.id,
            'questions': [q.to_dict(include_answer=False) for q in questions],
            'total': len(questions),
        }), 200

    @app.post('/public/practice/<int:attempt_id>/submit')
    @token_required
    def public_practice_submit(current_user, attempt_id):
        """Submit answers for a practice session and get scored results."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        attempt = PublicPracticeAttempt.query.get(attempt_id)
        if not attempt or attempt.public_user_id != profile.id:
            return jsonify({'message': 'Attempt not found'}), 404
        if attempt.submitted_at:
            return jsonify({'message': 'Already submitted'}), 400

        data = request.get_json(silent=True) or {}
        answers = data.get('answers', {})  # {question_id: 'A'}

        question_ids = json.loads(attempt.questions_json)
        questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(question_ids)).all()
        q_map = {q.id: q for q in questions}

        score = 0
        results = []
        for qid in question_ids:
            q = q_map.get(qid)
            if not q:
                continue
            user_ans = answers.get(str(qid), '')
            is_correct = user_ans.upper() == q.correct_answer.upper() if user_ans else False
            if is_correct:
                score += q.marks
            results.append({
                'question_id': qid,
                'user_answer': user_ans,
                'correct_answer': q.correct_answer,
                'is_correct': is_correct,
                'explanation': q.explanation,
            })

        attempt.answers_json = json.dumps(answers)
        attempt.score = score
        attempt.submitted_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'score': score,
            'total': len(question_ids),
            'results': results,
        }), 200

    @app.get('/public/practice/<int:attempt_id>/review')
    @token_required
    def public_practice_review(current_user, attempt_id):
        """Review a completed practice attempt."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        attempt = PublicPracticeAttempt.query.get(attempt_id)
        if not attempt or attempt.public_user_id != profile.id:
            return jsonify({'message': 'Attempt not found'}), 404

        question_ids = json.loads(attempt.questions_json)
        questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(question_ids)).all()
        answers = json.loads(attempt.answers_json) if attempt.answers_json else {}

        return jsonify({
            'attempt': attempt.to_dict(),
            'questions': [q.to_dict(include_answer=True) for q in questions],
            'answers': answers,
        }), 200

    # ── Practice meta: subjects + chapters for building a custom session ──
    @app.get('/public/practice/meta')
    @token_required
    def public_practice_meta(current_user):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        subjects = sorted([r[0] for r in db.session.query(PublicQuestionRepo.subject).distinct().all() if r[0]])
        rows = db.session.query(PublicQuestionRepo.subject, PublicQuestionRepo.chapter).distinct().all()
        chapters_by_subject = {}
        for subj, chap in rows:
            if not subj or not chap:
                continue
            chapters_by_subject.setdefault(subj, set()).add(chap)
        chapters_by_subject = {k: sorted(v) for k, v in chapters_by_subject.items()}
        total = db.session.query(PublicQuestionRepo.id).count()
        return jsonify({
            'subjects': subjects,
            'chapters_by_subject': chapters_by_subject,
            'total_questions': total,
        }), 200

    # ── Interactive practice pool (powers adaptive + fixed difficulty) ──
    @app.post('/public/practice/adaptive/start')
    @token_required
    def public_practice_adaptive_start(current_user):
        """
        Build a practice pool grouped by difficulty (WITH answers, for immediate
        feedback). The client serves questions one-by-one — adapting difficulty
        (easy→medium→hard on correct, the reverse on wrong) or fixed/random.
        Accepts: subject, chapter, course_tags (optional), count (default 15).
        """
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        data = request.get_json(silent=True) or {}
        subject = (data.get('subject') or '').strip()
        chapter = (data.get('chapter') or '').strip()
        course_tags = (data.get('course_tags') or '').strip()
        pyq_year = data.get('pyq_year')
        count = min(max(int(data.get('count', 15)), 5), 100)

        query = PublicQuestionRepo.query
        if course_tags:
            query = query.filter(PublicQuestionRepo.course_tags.ilike(f'%{course_tags}%'))
        if subject:
            query = query.filter(PublicQuestionRepo.subject.ilike(subject))
        if chapter:
            query = query.filter(PublicQuestionRepo.chapter.ilike(f'%{chapter}%'))
        if pyq_year:
            query = query.filter(PublicQuestionRepo.is_pyq == True, PublicQuestionRepo.pyq_year == int(pyq_year))

        questions = query.all()
        if not questions:
            return jsonify({'message': 'No questions found for this selection'}), 404

        random.shuffle(questions)
        pool = {'easy': [], 'medium': [], 'hard': []}
        for q in questions:
            d = (q.difficulty or 'Medium').strip().lower()
            bucket = 'easy' if d == 'easy' else 'hard' if d == 'hard' else 'medium'
            pool[bucket].append(q.to_dict(include_answer=True))

        sub = CourseSubscription.query.filter_by(public_user_id=profile.id, status='active').first()
        course_id = sub.course_id if sub else 0
        attempt = PublicPracticeAttempt(
            public_user_id=profile.id,
            course_id=course_id,
            subject=subject or None,
            chapter=chapter or None,
            difficulty='Adaptive',
            questions_json=json.dumps([]),
            total_questions=count,
            is_adaptive=True,
        )
        db.session.add(attempt)
        db.session.commit()

        return jsonify({
            'attempt_id': attempt.id,
            'count': count,
            'pool': pool,
            'available': {k: len(v) for k, v in pool.items()},
        }), 200

    # ── Persist an interactive practice run (graded server-side) ──
    @app.post('/public/practice/<int:attempt_id>/submit-adaptive')
    @token_required
    def public_practice_submit_adaptive(current_user, attempt_id):
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403
        attempt = PublicPracticeAttempt.query.get(attempt_id)
        if not attempt or attempt.public_user_id != profile.id:
            return jsonify({'message': 'Attempt not found'}), 404
        if attempt.submitted_at:
            return jsonify({'message': 'Already submitted'}), 400

        data = request.get_json(silent=True) or {}
        asked_ids = data.get('asked_ids', []) or []
        answers = data.get('answers', {}) or {}

        questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(asked_ids)).all()
        q_map = {q.id: q for q in questions}
        score = 0
        for qid in asked_ids:
            q = q_map.get(qid)
            if not q:
                continue
            ua = (answers.get(str(qid)) or '').upper()
            if ua and ua == (q.correct_answer or '').upper():
                score += q.marks or 1

        attempt.questions_json = json.dumps(asked_ids)
        attempt.answers_json = json.dumps(answers)
        attempt.score = score
        attempt.total_questions = len(asked_ids)
        attempt.submitted_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'score': score, 'total': len(asked_ids)}), 200

    # ═══════════════════════════════════════════════════════════
    # 12. DAILY CHALLENGE & STREAK SYSTEM
    # ═══════════════════════════════════════════════════════════

    @app.post('/public/challenge/start')
    @token_required
    def public_challenge_start(current_user):
        """
        Start or resume today's daily challenge.
        Pulls 5 random questions from the repository based on user's enrolled course tags.
        """
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        today = datetime.utcnow().date()

        # Check if already started today
        existing = PublicDailyChallengeAttempt.query.filter_by(
            public_user_id=profile.id, challenge_date=today
        ).first()
        if existing:
            if existing.completed_at:
                return jsonify({
                    'message': 'Already completed today\'s challenge',
                    'challenge': existing.to_dict(),
                    'streak': profile.daily_streak or 0,
                    'already_completed': True,
                }), 200

            # Resume: return the same questions
            question_ids = json.loads(existing.questions_json)
            questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(question_ids)).all()
            return jsonify({
                'challenge_id': existing.id,
                'questions': [q.to_dict(include_answer=True) for q in questions],
                'total': len(questions),
                'streak': profile.daily_streak or 0,
                'already_completed': False,
            }), 200

        # Determine which tags to pull from based on subscriptions
        subs = CourseSubscription.query.filter_by(public_user_id=profile.id, status='active').all()
        course_tags = set()
        for s in subs:
            course = PublicCourse.query.get(s.course_id)
            if course:
                if getattr(course, 'target_tags', None):
                    tags = [t.strip().upper() for t in course.target_tags.split(',')]
                    for t in tags:
                        if t:
                            course_tags.add(t)
                else:
                    course_tags.add(course.title.strip().upper())

        # Pull 5 random questions
        query = PublicQuestionRepo.query
        if course_tags:
            tag_filters = [PublicQuestionRepo.course_tags.ilike(f'%{t}%') for t in course_tags]
            query = query.filter(db.or_(*tag_filters))

        all_ids = [r[0] for r in query.with_entities(PublicQuestionRepo.id).all()]

        # If not enough tagged questions, fall back to any questions
        if len(all_ids) < 5:
            all_ids = [r[0] for r in db.session.query(PublicQuestionRepo.id).all()]

        if not all_ids:
            return jsonify({'message': 'No questions available in the repository yet'}), 404

        selected_ids = random.sample(all_ids, min(5, len(all_ids)))
        questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(selected_ids)).all()

        challenge = PublicDailyChallengeAttempt(
            public_user_id=profile.id,
            challenge_date=today,
            questions_json=json.dumps(selected_ids),
        )
        db.session.add(challenge)
        db.session.commit()

        return jsonify({
            'challenge_id': challenge.id,
            'questions': [q.to_dict(include_answer=True) for q in questions],
            'total': len(questions),
            'streak': profile.daily_streak or 0,
            'already_completed': False,
        }), 200

    @app.post('/public/challenge/<int:challenge_id>/submit')
    @token_required
    def public_challenge_submit(current_user, challenge_id):
        """Submit daily challenge answers and update streak."""
        profile = get_public_profile(current_user)
        if not profile:
            return jsonify({'message': 'Public profile required'}), 403

        challenge = PublicDailyChallengeAttempt.query.get(challenge_id)
        if not challenge or challenge.public_user_id != profile.id:
            return jsonify({'message': 'Challenge not found'}), 404
        if challenge.completed_at:
            return jsonify({'message': 'Already submitted'}), 400

        data = request.get_json(silent=True) or {}
        answers = data.get('answers', {})

        question_ids = json.loads(challenge.questions_json)
        questions = PublicQuestionRepo.query.filter(PublicQuestionRepo.id.in_(question_ids)).all()
        q_map = {q.id: q for q in questions}

        score = 0
        results = []
        for qid in question_ids:
            q = q_map.get(qid)
            if not q:
                continue
            user_ans = answers.get(str(qid), '')
            is_correct = user_ans.upper() == q.correct_answer.upper() if user_ans else False
            if is_correct:
                score += 1
            results.append({
                'question_id': qid,
                'text': q.text,
                'user_answer': user_ans,
                'correct_answer': q.correct_answer,
                'is_correct': is_correct,
                'explanation': q.explanation,
            })

        challenge.answers_json = json.dumps(answers)
        challenge.score = score
        challenge.completed_at = datetime.utcnow()

        # Update streak
        today = datetime.utcnow().date()
        from datetime import timedelta as td
        yesterday = today - td(days=1)

        if profile.last_challenge_date == yesterday:
            profile.daily_streak = (profile.daily_streak or 0) + 1
        elif profile.last_challenge_date != today:
            profile.daily_streak = 1
        profile.last_challenge_date = today

        db.session.commit()

        return jsonify({
            'score': score,
            'total': len(question_ids),
            'results': results,
            'streak': profile.daily_streak,
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
