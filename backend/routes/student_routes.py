"""Student exam flow routes extracted from app.py."""

import hashlib
from datetime import datetime, timedelta, timezone

from flask import jsonify, request
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from models import (
    Exam,
    ExamStudent,
    Question,
    QuestionRepository,
    Student,
    StudentAnswer,
    StudentExamAttempt,
    ProctorEvent,
    MAX_EVENTS_PER_ATTEMPT,
    KNOWN_EVENT_TYPES,
    HARD_EVENT_TYPES,
    db,
)


def register_student_routes(
    app,
    role_required,
    no_cache,
    to_utc_naive,
    limiter=None,
):
    # Rate limits on the exam endpoints are a BACKSTOP against a runaway
    # client, not traffic shaping. They are set far above anything a real
    # student can produce: autosave is debounced at 500ms, so ~2/second is the
    # human ceiling, and the fallback event flush fires once every 120s.
    #
    # Keyed per student session rather than per IP. A whole school sits behind
    # one NAT address, which is exactly why app.py sets no global default —
    # an IP-keyed limit here would throttle a classroom as if it were one
    # abusive client.
    def _student_key():
        token = request.headers.get('auth_token') or request.headers.get('Authorization', '')
        if token:
            return f'stu:{hashlib.sha256(token.encode()).hexdigest()[:32]}'
        return f'ip:{request.remote_addr}'

    def exam_limit(spec):
        """No-op when the limiter isn't wired, so tests and any other caller
        that omits it keep working unchanged."""
        if limiter is None:
            return lambda f: f
        return limiter.limit(spec, key_func=_student_key)

    @app.get('/student/exams')
    @role_required('student')
    def student_list_exams(current_user):
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return jsonify({'message': 'student profile not found'}), 400

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        query = ExamStudent.query.filter_by(student_id=student.user_id).join(Exam).order_by(desc(Exam.created_at))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # One attempts query for the whole page (avoids one query per exam).
        page_exam_ids = [a.exam_id for a in pagination.items]
        attempt_map = {}
        if page_exam_ids:
            attempt_map = {
                a.exam_id: a
                for a in StudentExamAttempt.query.filter(
                    StudentExamAttempt.student_id == student.user_id,
                    StudentExamAttempt.exam_id.in_(page_exam_ids),
                ).all()
            }

        exams_data = []
        for assignment in pagination.items:
            exam = assignment.exam
            attempt = attempt_map.get(exam.id)
            in_progress = bool(attempt and attempt.submitted_time is None)
            exams_data.append(
                {
                    'exam': exam.to_dict(),
                    'assigned': True,
                    'attempted': bool(attempt and attempt.submitted_time is not None),
                    'in_progress': in_progress,
                    'score': attempt.score if (attempt and attempt.submitted_time) else None,
                }
            )

        return (
            jsonify(
                {
                    'exams': exams_data,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'current_page': page,
                }
            ),
            200,
        )

    @app.get('/student/exams/summary')
    @role_required('student')
    @no_cache
    def student_exams_summary(current_user):
        """Counts across *every* assignment, plus whatever needs attention now.

        `/student/exams` is paginated, so a dashboard tallying the rows it
        received would be reporting on one page of five — "2 completed" when
        the real figure is thirty. Anything shown as a headline number has to
        be computed over the whole set, which is what this endpoint is for.

        It also returns the exam to resume or start next. That cannot be
        derived from a page either: the exam a student most urgently needs is
        frequently not on the page they happen to be looking at.
        """
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return jsonify({'message': 'student profile not found'}), 400

        assignments = (
            ExamStudent.query.filter_by(student_id=student.user_id).join(Exam).all()
        )
        exam_ids = [a.exam_id for a in assignments]

        attempts = {}
        if exam_ids:
            attempts = {
                a.exam_id: a
                for a in StudentExamAttempt.query.filter(
                    StudentExamAttempt.student_id == student.user_id,
                    StudentExamAttempt.exam_id.in_(exam_ids),
                ).all()
            }

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        counts = {
            'total': len(assignments),
            'in_progress': 0,
            'active_now': 0,
            'upcoming': 0,
            'missed': 0,
            'results_pending': 0,
            'completed': 0,
        }
        in_progress = []
        active = []
        upcoming = []
        scored = []

        for assignment in assignments:
            exam = assignment.exam
            attempt = attempts.get(exam.id)
            start = to_utc_naive(exam.access_start)
            end = to_utc_naive(exam.access_end)

            if attempt and attempt.submitted_time is None:
                counts['in_progress'] += 1
                in_progress.append((attempt.start_time, exam))
            elif attempt:
                if exam.results_released:
                    counts['completed'] += 1
                    if attempt.score is not None:
                        scored.append(attempt.score)
                else:
                    counts['results_pending'] += 1
            elif start and now < start:
                counts['upcoming'] += 1
                upcoming.append((start, exam))
            elif end and now > end:
                counts['missed'] += 1
            else:
                counts['active_now'] += 1
                active.append((end, exam))

        # Resuming always outranks starting something new; among several, the
        # one begun earliest is closest to running out of time.
        resume = min(in_progress, key=lambda p: (p[0] is None, p[0]))[1] if in_progress else None

        # Then whatever is open and closing soonest — that is the one actually
        # at risk of being missed. Only if nothing is open do we look ahead.
        if active:
            next_up = min(active, key=lambda p: (p[0] is None, p[0]))[1]
        elif upcoming:
            next_up = min(upcoming, key=lambda p: p[0])[1]
        else:
            next_up = None

        average = round(sum(scored) / len(scored), 1) if scored else None

        return (
            jsonify(
                {
                    **counts,
                    'average_score': average,
                    'scored_count': len(scored),
                    'resume': resume.to_dict() if resume else None,
                    'next_up': next_up.to_dict() if next_up else None,
                }
            ),
            200,
        )

    @app.get('/student/exams/<int:exam_id>/can_start')
    @role_required('student')
    @no_cache
    def student_can_start(current_user, exam_id):
        student = Student.query.filter_by(user_id=current_user.id).first()
        exam = Exam.query.get_or_404(exam_id)
        assigned = ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first() is not None
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        access_start = to_utc_naive(exam.access_start)
        access_end = to_utc_naive(exam.access_end)
        within_window = True
        if access_start and now < access_start:
            within_window = False
        if access_end and now > access_end:
            within_window = False
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
        already_submitted = bool(attempt and attempt.submitted_time)
        return (
            jsonify(
                {
                    'assigned': assigned,
                    'within_window': within_window,
                    'already_submitted': already_submitted,
                    'duration_minutes': exam.duration_minutes,
                    'exam': exam.to_dict(),
                    # The monitoring policy the browser should enforce. Sent
                    # here so the readiness screen can tell the student what
                    # to expect *before* they commit to starting.
                    'proctor_policy': exam.proctor_policy,
                }
            ),
            200,
        )

    @app.post('/student/exams/<int:exam_id>/start')
    @exam_limit('30 per minute')
    @role_required('student')
    @no_cache
    def student_start_exam(current_user, exam_id):
        student = Student.query.filter_by(user_id=current_user.id).first()
        exam = Exam.query.get_or_404(exam_id)
        if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first():
            return jsonify({'message': 'not assigned to exam'}), 403

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        access_start = to_utc_naive(exam.access_start)
        access_end = to_utc_naive(exam.access_end)
        if access_start and now < access_start:
            return jsonify({'message': 'exam not opened yet'}), 403
        if access_end and now > access_end:
            return jsonify({'message': 'exam start window closed'}), 403

        attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
        if attempt and attempt.submitted_time:
            return jsonify({'message': 'already submitted'}), 400

        if not attempt:
            attempt = StudentExamAttempt(exam_id=exam.id, student_id=student.user_id, start_time=now)
            allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
            if exam.access_end:
                access_end_utc = to_utc_naive(exam.access_end)
                allowed_end = min(allowed_end, access_end_utc)
            db.session.add(attempt)
            try:
                db.session.commit()
            except IntegrityError:
                # Race: two /start requests landed together (double-click or
                # two tabs). The unique constraint kept one row — reuse it
                # instead of returning a 500.
                db.session.rollback()
                attempt = StudentExamAttempt.query.filter_by(
                    exam_id=exam.id, student_id=student.user_id
                ).first()
                if attempt is None:
                    return jsonify({'message': 'could not start exam, please retry'}), 500
                allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
                if exam.access_end:
                    allowed_end = min(allowed_end, to_utc_naive(exam.access_end))
            return (
                jsonify(
                    {
                        'message': 'started',
                        'attempt_id': attempt.id,
                        'start_time': attempt.start_time.isoformat() + 'Z',
                        'expires_at': allowed_end.isoformat() + 'Z',
                    }
                ),
                200,
            )

        allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
        if exam.access_end:
            access_end_utc = to_utc_naive(exam.access_end)
            allowed_end = min(allowed_end, access_end_utc)
            
        saved_answers = {}
        for sa in StudentAnswer.query.filter_by(attempt_id=attempt.id).all():
            saved_answers[str(sa.question_id)] = sa.answer

        return (
            jsonify(
                {
                    'message': 'exam already started',
                    'attempt_id': attempt.id,
                    'start_time': attempt.start_time.isoformat() + 'Z',
                    'expires_at': allowed_end.isoformat() + 'Z',
                    'saved_answers': saved_answers
                }
            ),
            200,
        )

    @app.get('/student/exams/<int:exam_id>/questions')
    @role_required('student')
    @no_cache
    def student_get_exam_questions(current_user, exam_id):
        student = Student.query.filter_by(user_id=current_user.id).first()
        exam = Exam.query.get_or_404(exam_id)

        if not ExamStudent.query.filter_by(exam_id=exam.id, student_id=student.user_id).first():
            return jsonify({'message': 'not assigned to exam'}), 403

        # Guard: block access after submission
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
        if attempt and attempt.submitted_time:
            return jsonify({'message': 'exam already submitted'}), 403

        questions = Question.query.filter_by(exam_id=exam.id).all()

        # Batch-fetch linked repo questions in ONE query (avoids N+1 under load).
        repo_ids = [q.repo_question_id for q in questions if q.repo_question_id]
        repo_map = {}
        if repo_ids:
            repo_map = {
                r.id: r
                for r in QuestionRepository.query.filter(QuestionRepository.id.in_(repo_ids)).all()
            }

        questions_data = []
        for question in questions:
            final_text = question.text
            final_opt_a = question.option_a
            final_opt_b = question.option_b
            final_opt_c = question.option_c
            final_opt_d = question.option_d
            final_marks = question.marks
            final_image = question.image_path

            if question.repo_question_id:
                repo_q = repo_map.get(question.repo_question_id)
                if repo_q:
                    final_text = repo_q.text
                    final_opt_a = repo_q.option_a
                    final_opt_b = repo_q.option_b
                    final_opt_c = repo_q.option_c
                    final_opt_d = repo_q.option_d
                    final_marks = repo_q.marks
                    final_image = repo_q.image_path

            questions_data.append(
                {
                    'id': question.id,
                    'text': final_text,
                    'option_a': final_opt_a,
                    'option_b': final_opt_b,
                    'option_c': final_opt_c,
                    'option_d': final_opt_d,
                    'marks': final_marks,
                    'image_path': final_image,
                }
            )

        return jsonify({'questions': questions_data}), 200

    # ---- AUTO-SAVE (click-based, debounced 500ms from frontend) ----
    def _ingest_events(attempt, raw_events):
        """Persist integrity events for an attempt. Returns rows written.

        Caller must commit. Deliberately tolerant: a malformed event is
        skipped, never fatal — losing an answer because a monitoring event
        was badly shaped would be an absurd trade.
        """
        if not raw_events or not isinstance(raw_events, list):
            return 0

        # Hard ceiling. A client stuck in a loop must not be able to fill the
        # table; past the cap we stop writing rather than degrade the DB.
        existing_count = db.session.query(ProctorEvent.id).filter_by(
            attempt_id=attempt.id
        ).count()
        if existing_count >= MAX_EVENTS_PER_ATTEMPT:
            return 0

        # A flush retried after a dropped connection replays the same events.
        # seq is the client's idempotency key.
        existing_seqs = {
            s for (s,) in db.session.query(ProctorEvent.seq).filter_by(
                attempt_id=attempt.id
            ).all()
        }

        budget = MAX_EVENTS_PER_ATTEMPT - existing_count
        written = 0

        for raw in raw_events[:budget]:
            if not isinstance(raw, dict):
                continue
            event_type = str(raw.get('type') or '').strip().lower()
            if event_type not in KNOWN_EVENT_TYPES:
                continue

            try:
                seq = int(raw.get('seq'))
            except (TypeError, ValueError):
                continue
            if seq in existing_seqs:
                continue

            try:
                severity = max(0, min(3, int(raw.get('severity', 0))))
            except (TypeError, ValueError):
                severity = 0

            def _opt_int(value, limit):
                try:
                    n = int(value)
                except (TypeError, ValueError):
                    return None
                return n if 0 <= n <= limit else None

            db.session.add(ProctorEvent(
                attempt_id=attempt.id,
                seq=seq,
                event_type=event_type,
                severity=severity,
                # Client clock: recorded for ordering, never trusted. The
                # authoritative timestamp is received_at, set server-side.
                client_ts=_opt_int(raw.get('ts'), 4102444800000),   # ~year 2100
                duration_ms=_opt_int(raw.get('durationMs'), 86400000),
                received_at=datetime.now(timezone.utc).replace(tzinfo=None),
            ))
            existing_seqs.add(seq)
            written += 1

        return written

    @app.post('/student/exams/<int:exam_id>/events')
    @exam_limit('60 per minute')
    @role_required('student')
    def student_proctor_events(current_user, exam_id):
        """Fallback flush for students who are idle (no autosave to ride on)
        and the sendBeacon target on page hide.

        The common path is NOT this endpoint — events piggyback on autosave.
        At 300 concurrent students a per-event request is what saturates the
        instance, so this should stay a low-traffic route.
        """
        student = Student.query.filter_by(user_id=current_user.id).first()
        exam = Exam.query.get_or_404(exam_id)

        attempt = StudentExamAttempt.query.filter_by(
            exam_id=exam.id, student_id=student.user_id
        ).first()
        if not attempt:
            return jsonify({'message': 'no active attempt'}), 400
        # Late events on a submitted attempt are accepted silently — a beacon
        # racing the submit is normal, not an error worth surfacing.
        if attempt.submitted_time:
            return jsonify({'message': 'already submitted', 'stored': 0}), 200

        payload = request.get_json(silent=True) or {}
        try:
            stored = _ingest_events(attempt, payload.get('events'))
            db.session.commit()
            return jsonify({'message': 'ok', 'stored': stored}), 200
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({'message': 'event save failed'}), 500

    @app.post('/student/exams/<int:exam_id>/autosave')
    @exam_limit('180 per minute')
    @role_required('student')
    def student_autosave(current_user, exam_id):
        student = Student.query.filter_by(user_id=current_user.id).first()
        exam = Exam.query.get_or_404(exam_id)

        attempt = StudentExamAttempt.query.filter_by(
            exam_id=exam.id, student_id=student.user_id
        ).first()
        if not attempt:
            return jsonify({'message': 'no active attempt'}), 400
        if attempt.submitted_time:
            return jsonify({'message': 'already submitted'}), 200

        # Check if time isn't long past
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
        if now > allowed_end + timedelta(minutes=2):
            # Time is over — auto-finalize this attempt
            _finalize_attempt(attempt, exam, reason='timeout')
            return jsonify({'message': 'time expired, auto-submitted'}), 200

        payload = request.get_json(silent=True) or {}
        answers = payload.get('answers', [])

        try:
            # Batch-fetch existing answers once (avoids one SELECT per answer).
            existing_map = {
                sa.question_id: sa
                for sa in StudentAnswer.query.filter_by(attempt_id=attempt.id).all()
            }
            # Only accept question_ids that belong to THIS exam.
            valid_qids = {
                qid for (qid,) in db.session.query(Question.id).filter_by(exam_id=exam.id).all()
            }

            for ans in answers:
                qid = ans.get('question_id')
                resp = ans.get('answer')
                if not qid or qid not in valid_qids:
                    continue

                existing = existing_map.get(qid)
                if existing:
                    existing.answer = resp
                else:
                    db.session.add(StudentAnswer(
                        attempt_id=attempt.id,
                        question_id=qid,
                        answer=resp,
                        is_correct=False,
                        marks_awarded=0,
                    ))

            # Integrity events ride along on the answer save. This is the
            # whole point of the design: no extra request, no extra round
            # trip, one commit covering both.
            stored_events = _ingest_events(attempt, payload.get('events'))

            db.session.commit()
            return jsonify({
                'message': 'saved',
                'count': len(answers),
                'events_stored': stored_events,
            }), 200
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({'message': 'save failed'}), 500

    # Reasons a client is allowed to assert. 'abandoned' is server-only — it
    # means "the student never submitted", which a submitting client cannot
    # truthfully claim. Anything unrecognised is coerced to 'manual' rather
    # than trusted: the column is String(50) and this value reaches admin
    # reports and CSV exports.
    CLIENT_SUBMIT_REASONS = {'manual', 'timeout', 'tab_switch'}

    def _coerce_submit_reason(raw):
        reason = str(raw or 'manual').strip().lower()
        return reason if reason in CLIENT_SUBMIT_REASONS else 'manual'

    def _finalize_attempt(attempt, exam, reason='abandoned'):
        """Grade whatever answers exist and mark the attempt as submitted."""
        if attempt.submitted_time:
            return

        # One query for the exam's questions instead of one per saved answer.
        question_map = {q.id: q for q in Question.query.filter_by(exam_id=exam.id).all()}

        total_score = 0
        for sa in StudentAnswer.query.filter_by(attempt_id=attempt.id).all():
            question = question_map.get(sa.question_id)
            if not question:
                continue
            is_correct = False
            marks_awarded = 0
            if question.correct_answer and sa.answer and \
               str(sa.answer).strip().upper() == str(question.correct_answer).strip().upper():
                is_correct = True
                marks_awarded = int(question.marks or 0)
            sa.is_correct = is_correct
            sa.marks_awarded = marks_awarded
            total_score += marks_awarded

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        attempt.submitted_time = now
        attempt.score = total_score
        attempt.submission_reason = reason
        db.session.commit()

    @app.post('/student/exams/<int:exam_id>/submit')
    @exam_limit('20 per minute')
    @role_required('student')
    @no_cache
    def student_submit_exam(current_user, exam_id):
        student = Student.query.filter_by(user_id=current_user.id).first()
        exam = Exam.query.get_or_404(exam_id)
        payload = request.get_json(silent=True) or {}
        answers = payload.get('answers', [])
        reason = _coerce_submit_reason(payload.get('reason'))

        attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()
        if not attempt:
            return jsonify({'message': 'start the exam first'}), 400
        if attempt.submitted_time:
            return jsonify({'message': 'already submitted'}), 400

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)

        # If time is over but they didn't manually submit on time, record as timeout.
        if now > allowed_end:
            reason = 'timeout'
            if now > allowed_end + timedelta(minutes=5):
                # Auto-finalize with whatever auto-saved answers exist
                _finalize_attempt(attempt, exam)
                return jsonify({'message': 'time expired, auto-graded from saved answers', 'score': attempt.score}), 200

        try:
            # Flush any events the client is still holding, BEFORE the reason
            # is settled — the violation that triggered an auto-submit is
            # usually in this final batch.
            _ingest_events(attempt, payload.get('events'))
            db.session.flush()
        except SQLAlchemyError:
            db.session.rollback()   # never let a monitoring event block a submit

        # A client claiming it auto-submitted for violations has to be able to
        # show them. Without this the field is pure assertion: a student could
        # POST reason='manual' after ten tab switches, or the reverse.
        if reason == 'tab_switch':
            hard_count = db.session.query(ProctorEvent.id).filter(
                ProctorEvent.attempt_id == attempt.id,
                ProctorEvent.event_type.in_(HARD_EVENT_TYPES),
            ).count()
            policy = exam.proctor_policy
            if hard_count < int(policy.get('maxViolations') or 3):
                reason = 'manual'

        total_score = 0
        try:
            # Batch-fetch this exam's questions and any auto-saved answers in
            # TWO queries total (was 2 queries PER answer — the main submit
            # bottleneck when a whole class submits at once).
            question_map = {q.id: q for q in Question.query.filter_by(exam_id=exam.id).all()}
            existing_map = {
                sa.question_id: sa
                for sa in StudentAnswer.query.filter_by(attempt_id=attempt.id).all()
            }

            for ans in answers:
                qid = ans.get('question_id')
                resp = ans.get('answer')
                if not qid:
                    continue

                # Only grade questions that belong to THIS exam.
                question = question_map.get(qid)
                if not question:
                    continue

                is_correct = False
                marks_awarded = 0
                if question.correct_answer and str(resp).strip().upper() == str(question.correct_answer).strip().upper():
                    is_correct = True
                    marks_awarded = int(question.marks or 0)

                # Upsert: update if auto-saved answer exists, else insert
                existing = existing_map.get(qid)
                if existing:
                    existing.answer = resp
                    existing.is_correct = is_correct
                    existing.marks_awarded = marks_awarded
                else:
                    db.session.add(StudentAnswer(
                        attempt_id=attempt.id,
                        question_id=qid,
                        answer=resp,
                        is_correct=is_correct,
                        marks_awarded=marks_awarded,
                    ))
                total_score += marks_awarded

            attempt.submitted_time = now
            attempt.score = total_score
            attempt.submission_reason = reason
            db.session.add(attempt)
            db.session.commit()
            return jsonify({'message': 'submitted', 'score': total_score}), 200

        except SQLAlchemyError:
            db.session.rollback()
            app.logger.exception('exam submission failed')
            return jsonify({'message': 'submission failed - please try again'}), 500

    @app.get('/student/exams/<int:exam_id>/result')
    @role_required('student')
    @no_cache
    def student_view_result(current_user, exam_id):
        exam = Exam.query.get_or_404(exam_id)
        if not exam.results_released:
            return jsonify({'message': 'results not released yet'}), 403

        student = Student.query.filter_by(user_id=current_user.id).first()
        attempt = StudentExamAttempt.query.filter_by(exam_id=exam.id, student_id=student.user_id).first()

        if attempt and not attempt.submitted_time:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            allowed_end = attempt.start_time + timedelta(minutes=exam.duration_minutes)
            if now > allowed_end + timedelta(minutes=2):
                _finalize_attempt(attempt, exam)

        if not attempt or not attempt.submitted_time:
            return jsonify({'message': 'no attempt found'}), 400

        peer_scores = [
            score
            for (score,) in db.session.query(StudentExamAttempt.score)
            .filter(StudentExamAttempt.exam_id == exam.id)
            .filter(StudentExamAttempt.submitted_time.isnot(None))
            .filter(StudentExamAttempt.score.isnot(None))
            .all()
        ]
        higher_scores = sum(1 for score in peer_scores if score > (attempt.score or 0))
        rank = higher_scores + 1 if peer_scores else None

        # Batch everything: questions in one query, and ONE text-fallback
        # query for legacy rows missing repo_question_id (was a full-table
        # TEXT scan per answer — brutal when a whole class opens results).
        question_map = {q.id: q for q in Question.query.filter_by(exam_id=exam.id).all()}

        fallback_texts = []
        for answer in attempt.answers:
            question = question_map.get(answer.question_id)
            if question is None:
                continue
            source = question.source
            if not getattr(source, 'subject', None):
                q_text = (getattr(source, 'text', None) or '').strip()
                if q_text:
                    fallback_texts.append(q_text)

        fallback_map = {}
        if fallback_texts:
            for repo_row in (
                QuestionRepository.query
                .filter(QuestionRepository.text.in_(fallback_texts))
                .order_by(QuestionRepository.id.asc())
                .all()
            ):
                # ascending order + overwrite → highest id wins (same as before)
                fallback_map[(repo_row.text or '').strip()] = repo_row

        answers_data = []
        for answer in attempt.answers:
            question = question_map.get(answer.question_id)
            if question is None:
                continue
            source = question.source
            fallback_repo = None
            if not getattr(source, 'subject', None):
                q_text = (getattr(source, 'text', None) or '').strip()
                if q_text:
                    fallback_repo = fallback_map.get(q_text)
            answers_data.append(
                {
                    'question_id': question.id,
                    'text': source.text,
                    'answer': answer.answer,
                    'marks_awarded': answer.marks_awarded,
                    'is_correct': answer.is_correct,
                    'marks': source.marks,
                    'subject': getattr(source, 'subject', None) or (fallback_repo.subject if fallback_repo else None),
                    'chapter': getattr(source, 'chapter', None) or (fallback_repo.chapter if fallback_repo else None),
                    'topic': getattr(source, 'topic', None) or (fallback_repo.topic if fallback_repo else None),
                    'option_a': source.option_a,
                    'option_b': source.option_b,
                    'option_c': source.option_c,
                    'option_d': source.option_d,
                    'correct_answer': source.correct_answer,
                    'image_path': source.image_path if hasattr(source, 'image_path') else None,
                }
            )

        return (
            jsonify(
                {
                    'exam': exam.to_dict(),
                    'attempt': {
                        'start_time': attempt.start_time.isoformat(),
                        'submitted_time': attempt.submitted_time.isoformat(),
                        'score': attempt.score,
                        'submission_reason': getattr(attempt, 'submission_reason', 'manual'),
                        'rank': rank,
                        'participants': len(peer_scores),
                    },
                    'answers': answers_data,
                }
            ),
            200,
        )
