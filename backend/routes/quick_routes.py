# routes/quick_routes.py
# ─────────────────────────────────────────────────────────────
# Module 3: Quick Exam (Zero-Auth, Link-Based)
# ─────────────────────────────────────────────────────────────
import json
import re
import string
import random
from datetime import datetime, timedelta

from flask import request, jsonify

from models import (
    db, QuickExam, QuickQuestion, QuickResponse,
)


def _generate_code(length=6):
    """Generate a unique alphanumeric exam code."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(50):  # 50 attempts
        code = ''.join(random.choices(chars, k=length))
        if not QuickExam.query.filter_by(code=code).first():
            return code
    raise ValueError('Could not generate unique code')


def _parse_questions(raw_text):
    """Parse raw pasted text into structured question tuples.
    Returns list of tuples: (q_num, q_text, opt_a, opt_b, opt_c, opt_d, correct, explanation)
    """
    # Primary regex parser
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
        # Fallback: line-by-line parser
        matches = _parse_questions_simple(raw_text)

    return matches


def _parse_questions_simple(raw_text):
    """Fallback line-by-line parser for simpler text formats."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    questions = []
    i = 0
    while i < len(lines):
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


def register_quick_routes(app, token_required, role_required):
    """Register all /quick/* and /admin/quick/* routes."""

    # ═══════════════════════════════════════════════════
    # ADMIN ENDPOINTS (require admin login)
    # ═══════════════════════════════════════════════════

    @app.post('/admin/quick/exams')
    @role_required('admin')
    def admin_create_quick_exam(current_user):
        """Create a quick exam from Smart Paste text."""
        data = request.get_json(silent=True) or {}
        title = (data.get('title') or '').strip()
        raw_text = (data.get('raw_text') or '').strip()
        duration = data.get('duration_minutes', 30)
        expires_in = data.get('expires_in')  # e.g. "24h", "7d", "30d", or null

        if not title:
            return jsonify({'message': 'Title is required'}), 400
        if not raw_text:
            return jsonify({'message': 'Question text is required'}), 400

        # Parse questions
        matches = _parse_questions(raw_text)
        if not matches:
            return jsonify({
                'message': 'Could not parse any questions. Check the format: 1. Question? A) ... B) ... C) ... D) ... Answer: B'
            }), 400

        # Calculate expiry
        expires_at = None
        if expires_in:
            now = datetime.utcnow()
            if expires_in == '1h':
                expires_at = now + timedelta(hours=1)
            elif expires_in == '6h':
                expires_at = now + timedelta(hours=6)
            elif expires_in == '24h':
                expires_at = now + timedelta(hours=24)
            elif expires_in == '7d':
                expires_at = now + timedelta(days=7)
            elif expires_in == '30d':
                expires_at = now + timedelta(days=30)
            elif expires_in == 'never':
                expires_at = None

        # Create exam
        code = _generate_code()
        exam = QuickExam(
            code=code,
            title=title,
            created_by=current_user.id,
            duration_minutes=int(duration),
            total_questions=len(matches),
            expires_at=expires_at,
        )
        db.session.add(exam)
        db.session.flush()  # get exam.id

        # Create questions
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
            q = QuickQuestion(
                exam_id=exam.id,
                question_text=q_text,
                options_json=options,
                correct_option=correct,
                explanation=explanation,
                order_index=int(q_num),
            )
            db.session.add(q)
            answer_key[str(q_num)] = correct

        db.session.commit()

        return jsonify({
            'message': f'Quick exam created with {len(matches)} questions',
            'exam': exam.to_dict(include_stats=True),
            'share_code': code,
        }), 201

    @app.get('/admin/quick/exams')
    @role_required('admin')
    def admin_list_quick_exams(current_user):
        """List all quick exams created by this admin."""
        exams = QuickExam.query.filter_by(created_by=current_user.id).order_by(QuickExam.created_at.desc()).all()
        return jsonify({
            'exams': [e.to_dict(include_stats=True) for e in exams],
        }), 200

    @app.get('/admin/quick/exams/<int:exam_id>')
    @role_required('admin')
    def admin_get_quick_exam(current_user, exam_id):
        """Get quick exam details with questions and responses."""
        exam = QuickExam.query.get(exam_id)
        if not exam or exam.created_by != current_user.id:
            return jsonify({'message': 'Exam not found'}), 404

        questions = QuickQuestion.query.filter_by(exam_id=exam_id).order_by(QuickQuestion.order_index).all()
        responses = QuickResponse.query.filter_by(exam_id=exam_id).order_by(QuickResponse.submitted_at.desc()).all()

        return jsonify({
            'exam': exam.to_dict(include_stats=True),
            'questions': [q.to_dict(include_answer=True) for q in questions],
            'responses': [r.to_dict() for r in responses],
        }), 200

    @app.patch('/admin/quick/exams/<int:exam_id>')
    @role_required('admin')
    def admin_toggle_quick_exam(current_user, exam_id):
        """Toggle active/inactive status of a quick exam."""
        exam = QuickExam.query.get(exam_id)
        if not exam or exam.created_by != current_user.id:
            return jsonify({'message': 'Exam not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'is_active' in data:
            exam.is_active = data['is_active']
        db.session.commit()
        return jsonify({'exam': exam.to_dict(include_stats=True)}), 200

    @app.delete('/admin/quick/exams/<int:exam_id>')
    @role_required('admin')
    def admin_delete_quick_exam(current_user, exam_id):
        """Delete a quick exam and all its data."""
        exam = QuickExam.query.get(exam_id)
        if not exam or exam.created_by != current_user.id:
            return jsonify({'message': 'Exam not found'}), 404

        db.session.delete(exam)
        db.session.commit()
        return jsonify({'message': 'Exam deleted'}), 200

    # ═══════════════════════════════════════════════════
    # PUBLIC ENDPOINTS (zero-auth, accessed via code)
    # ═══════════════════════════════════════════════════

    @app.get('/quick/<string:code>')
    def quick_exam_info(code):
        """Get exam info by code — no auth needed."""
        exam = QuickExam.query.filter_by(code=code.upper()).first()
        if not exam:
            return jsonify({'message': 'Exam not found. Check your code.'}), 404
        if not exam.is_active:
            return jsonify({'message': 'This exam is no longer active.'}), 410
        if exam.is_expired():
            return jsonify({'message': 'This exam has expired.'}), 410

        return jsonify({
            'exam': {
                'code': exam.code,
                'title': exam.title,
                'total_questions': exam.total_questions,
                'duration_minutes': exam.duration_minutes,
            }
        }), 200

    @app.get('/quick/<string:code>/questions')
    def quick_exam_questions(code):
        """Serve questions — no auth, no answers."""
        exam = QuickExam.query.filter_by(code=code.upper()).first()
        if not exam:
            return jsonify({'message': 'Exam not found'}), 404
        if not exam.is_active or exam.is_expired():
            return jsonify({'message': 'This exam is no longer available'}), 410

        questions = QuickQuestion.query.filter_by(exam_id=exam.id).order_by(QuickQuestion.order_index).all()
        return jsonify({
            'questions': [q.to_dict(include_answer=False) for q in questions],
            'total': len(questions),
            'duration_minutes': exam.duration_minutes,
        }), 200

    @app.post('/quick/<string:code>/submit')
    def quick_exam_submit(code):
        """Submit answers — no auth, just name + answers."""
        exam = QuickExam.query.filter_by(code=code.upper()).first()
        if not exam:
            return jsonify({'message': 'Exam not found'}), 404
        if not exam.is_active or exam.is_expired():
            return jsonify({'message': 'This exam is no longer available'}), 410

        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        answers = data.get('answers', {})  # {"1":"A","2":"C",...}

        if not name:
            return jsonify({'message': 'Please enter your name'}), 400

        # Auto-grade
        questions = QuickQuestion.query.filter_by(exam_id=exam.id).all()
        score = 0
        total = len(questions)
        answer_key = {}
        for q in questions:
            idx = str(q.order_index)
            answer_key[idx] = q.correct_option
            if answers.get(idx, '').upper() == q.correct_option.upper():
                score += 1

        response = QuickResponse(
            exam_id=exam.id,
            participant_name=name,
            answers_json=json.dumps(answers),
            score=score,
            total=total,
        )
        db.session.add(response)
        db.session.commit()

        return jsonify({
            'message': 'Exam submitted successfully',
            'result': {
                'name': name,
                'score': score,
                'total': total,
                'percentage': round((score / total) * 100, 1) if total > 0 else 0,
                'answer_key': answer_key,
                'user_answers': answers,
            }
        }), 201
