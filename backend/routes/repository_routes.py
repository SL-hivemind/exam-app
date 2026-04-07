"""Repository routes for admin/school_admin/subject_specialist extracted from app.py."""

import os
from datetime import datetime

from flask import jsonify, request
from sqlalchemy import desc, or_

from models import AuditLog, QuestionRepository, QuestionReport, User, db
from utils.files import ALLOWED_CSV, allowed_file, import_repository_csv, save_csv_file


def register_repository_routes(app, token_required):
    @app.route('/admin/repository/questions', methods=['GET', 'POST', 'OPTIONS'])
    @token_required
    def repository_questions(current_user):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        if request.method == 'GET':
            if current_user.role not in ('admin', 'school_admin', 'subject_specialist'):
                return jsonify({'message': 'forbidden'}), 403

            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            cls = request.args.get('class_number')
            subject = request.args.get('subject')
            chapter = request.args.get('chapter')
            topic = request.args.get('topic')
            search = request.args.get('search', '').strip()

            query = QuestionRepository.query
            if current_user.role == 'subject_specialist':
                query = query.filter(QuestionRepository.subject.ilike(current_user.specialist_subject))
            if cls and cls not in ('null', ''):
                query = query.filter(QuestionRepository.class_number == cls)
            if subject and subject not in ('null', ''):
                query = query.filter(QuestionRepository.subject.ilike(subject))
            if chapter and chapter not in ('null', ''):
                query = query.filter(QuestionRepository.chapter.ilike(chapter))
            if topic and topic not in ('null', ''):
                query = query.filter(QuestionRepository.topic.ilike(topic))
            if search:
                like = f'%{search}%'
                query = query.filter(
                    or_(
                        QuestionRepository.text.ilike(like),
                        QuestionRepository.custom_id.ilike(like),
                        QuestionRepository.option_a.ilike(like),
                    )
                )
            if ':' in search and search.count('-') >= 2:
                prefix, range_part = search.rsplit('-', 1)
                start_str, end_str = range_part.split(':')
                query = query.filter(
                    QuestionRepository.custom_id.like(f'{prefix}-%'),
                    QuestionRepository.custom_id >= f'{prefix}-{start_str.zfill(4)}',
                    QuestionRepository.custom_id <= f'{prefix}-{end_str.zfill(4)}',
                )

            pagination = query.order_by(desc(QuestionRepository.id)).paginate(page=page, per_page=per_page, error_out=False)
            return (
                jsonify(
                    {
                        'questions': [q.to_dict() for q in pagination.items],
                        'total': pagination.total,
                        'pages': pagination.pages,
                        'current_page': pagination.page,
                    }
                ),
                200,
            )

        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403

        data = request.json or {}
        final_subject = data.get('subject')
        if current_user.role == 'subject_specialist':
            final_subject = current_user.specialist_subject
        if not final_subject:
            return jsonify({'message': 'subject is required'}), 400

        question = QuestionRepository(
            text=data.get('text'),
            option_a=data.get('option_a'),
            option_b=data.get('option_b'),
            option_c=data.get('option_c'),
            option_d=data.get('option_d'),
            correct_answer=(data.get('correct_answer') or '').strip() or None,
            class_number=data.get('class_number'),
            marks=int(data.get('marks') or 1),
            image_path=data.get('image_path'),
            subject=final_subject,
            created_by=current_user.id,
        )
        db.session.add(question)
        db.session.commit()
        return jsonify({'message': 'repository question created', 'question': question.id}), 201

    @app.route('/admin/repository/questions/import', methods=['POST', 'OPTIONS'])
    @token_required
    def route_import_repository_csv(current_user):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        if current_user.role not in ('admin', 'subject_specialist', 'school_admin'):
            return jsonify({'message': 'forbidden'}), 403
        if 'file' not in request.files:
            return jsonify({'message': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({'message': 'No selected file'}), 400
        if not allowed_file(file.filename, ALLOWED_CSV):
            return jsonify({'message': 'Only CSV files allowed'}), 400

        try:
            csv_path = save_csv_file(file)
            result = import_repository_csv(csv_path, current_user.id)
            db.session.commit()

            try:
                os.remove(csv_path)
            except Exception:
                pass

            return (
                jsonify(
                    {
                        'message': f"Successfully imported {result['inserted']} questions",
                        'inserted': result['inserted'],
                        'skipped': result['skipped'],
                    }
                ),
                201,
            )
        except Exception as error:
            db.session.rollback()
            app.logger.exception('Repository CSV import failed')
            return jsonify({'message': 'Import failed', 'detail': str(error)}), 500

    @app.route('/admin/repository/questions/<int:q_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
    @token_required
    def repository_question_detail(current_user, q_id):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        question = QuestionRepository.query.get_or_404(q_id)
        if request.method == 'GET':
            if current_user.role not in ('admin', 'school_admin', 'subject_specialist'):
                return jsonify({'message': 'forbidden'}), 403
            return (
                jsonify(
                    {
                        'id': question.id,
                        'text': question.text,
                        'option_a': question.option_a,
                        'option_b': question.option_b,
                        'option_c': question.option_c,
                        'option_d': question.option_d,
                        'correct_answer': question.correct_answer,
                        'class_number': question.class_number,
                        'subject': question.subject,
                        'marks': question.marks,
                        'image_path': question.image_path,
                        'created_by': question.created_by,
                    }
                ),
                200,
            )

        if request.method == 'PUT':
            if current_user.role not in ('admin', 'subject_specialist'):
                return jsonify({'message': 'forbidden'}), 403
            data = request.get_json(silent=True) or {}
            allowed_fields = [
                'text',
                'option_a',
                'option_b',
                'option_c',
                'option_d',
                'correct_answer',
                'class_number',
                'marks',
                'image_path',
            ]
            if current_user.role == 'admin':
                allowed_fields.append('subject')
                
            for field in allowed_fields:
                if field in data:
                    setattr(question, field, data.get(field))
            try:
                question.last_edited_by = current_user.id
                question.last_edited_at = datetime.now()
            except Exception:
                pass
            db.session.commit()
            app.logger.info('repo question %s updated by %s', question.id, current_user.username)
            return jsonify({'message': 'updated'}), 200

        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403
        db.session.delete(question)
        db.session.commit()
        return jsonify({'message': 'deleted'}), 200

    @app.route('/admin/repository/questions/bulk', methods=['PUT', 'OPTIONS'])
    @token_required
    def bulk_update_questions(current_user):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403

        data = request.json or []
        updated_count = 0
        try:
            # Prevent autoflush mid-loop: each .get() was triggering flush of
            # prior iterations' UPDATEs, firing before_update → generate_short_id()
            # SELECT on the same locked rows → lock wait timeout.
            with db.session.no_autoflush:
                for item in data:
                    q_id = item.get('id')
                    question = QuestionRepository.query.get(q_id)
                    if not question:
                        continue

                    if current_user.role == 'subject_specialist':
                        subject = (current_user.specialist_subject or '').lower()
                        if not question.subject or question.subject.lower() != subject:
                            continue

                    changes = []

                    def check_change(obj, field, new_val):
                        old_val = getattr(obj, field)
                        if str(old_val) != str(new_val):
                            setattr(obj, field, new_val)
                            changes.append(f'{field}: {old_val} -> {new_val}')

                    check_change(question, 'text', item.get('text'))
                    check_change(question, 'option_a', item.get('option_a'))
                    check_change(question, 'option_b', item.get('option_b'))
                    check_change(question, 'option_c', item.get('option_c'))
                    check_change(question, 'option_d', item.get('option_d'))
                    check_change(question, 'correct_answer', item.get('correct_answer'))
                    check_change(question, 'marks', int(item.get('marks') or 1))
                    check_change(question, 'class_number', item.get('class_number'))

                    if current_user.role == 'admin':
                        check_change(question, 'subject', item.get('subject'))

                    check_change(question, 'chapter', item.get('chapter'))
                    check_change(question, 'topic', item.get('topic'))

                    if changes:
                        log = AuditLog(
                            user_id=current_user.id,
                            action='QUESTION_EDIT',
                            target_type='question',
                            target_id=question.id,
                            details='; '.join(changes),
                        )
                        db.session.add(log)
                        updated_count += 1

            db.session.commit()
            return jsonify({'message': f'Successfully updated {updated_count} questions', 'status': 'success'}), 200
        except Exception as error:
            db.session.rollback()
            app.logger.exception('Bulk update failed')
            return jsonify({'message': 'Bulk update failed', 'detail': str(error)}), 500

    @app.get('/admin/audit-logs')
    @token_required
    def get_audit_logs(current_user):
        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403

        query = AuditLog.query
        if current_user.role == 'subject_specialist':
            query = query.filter_by(user_id=current_user.id)

        logs = query.order_by(desc(AuditLog.timestamp)).limit(100).all()
        return (
            jsonify(
                {
                    'logs': [
                        {
                            'id': log.id,
                            'action': log.action,
                            'target_type': log.target_type,
                            'target_id': log.target_id,
                            'details': log.details,
                            'timestamp': log.timestamp.isoformat(),
                            'username': log.user.username,
                        }
                        for log in logs
                    ]
                }
            ),
            200,
        )

    @app.route('/api/metadata/repository', methods=['GET'])
    @token_required
    def get_repository_metadata(current_user):
        cls = request.args.get('class_number')
        subject = request.args.get('subject')
        chapter = request.args.get('chapter')

        def _base():
            q = QuestionRepository.query
            if current_user.role == 'subject_specialist':
                q = q.filter(QuestionRepository.subject.ilike(current_user.specialist_subject))
            return q

        def _clean(val):
            return val and val not in ('null', '')

        # Classes: always show all (no parent filter)
        classes_q = _base().with_entities(QuestionRepository.class_number).distinct()

        # Subjects: narrowed by class only
        subjects_q = _base().with_entities(QuestionRepository.subject).distinct()
        if _clean(cls):
            subjects_q = subjects_q.filter(QuestionRepository.class_number == cls)

        # Chapters: narrowed by class + subject
        chapters_q = _base().with_entities(QuestionRepository.chapter).distinct()
        if _clean(cls):
            chapters_q = chapters_q.filter(QuestionRepository.class_number == cls)
        if _clean(subject):
            chapters_q = chapters_q.filter(QuestionRepository.subject.ilike(subject))

        # Topics: narrowed by class + subject + chapter
        topics_q = _base().with_entities(QuestionRepository.topic).distinct()
        if _clean(cls):
            topics_q = topics_q.filter(QuestionRepository.class_number == cls)
        if _clean(subject):
            topics_q = topics_q.filter(QuestionRepository.subject.ilike(subject))
        if _clean(chapter):
            topics_q = topics_q.filter(QuestionRepository.chapter.ilike(chapter))

        metadata = {
            'classes': sorted([r[0] for r in classes_q.all() if r[0]], key=lambda x: str(x)),
            'subjects': sorted([r[0] for r in subjects_q.all() if r[0]]),
            'chapters': sorted([r[0] for r in chapters_q.all() if r[0]]),
            'topics': sorted([r[0] for r in topics_q.all() if r[0]]),
        }
        return jsonify(metadata), 200


    @app.route('/admin/repository/questions/<int:q_id>/report', methods=['POST', 'OPTIONS'])
    @token_required
    def report_repository_question(current_user, q_id):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200
            
        if current_user.role not in ('admin', 'school_admin'):
            return jsonify({'message': 'forbidden'}), 403
            
        data = request.json or {}
        message = (data.get('message') or '').strip()
        if not message:
            return jsonify({'message': 'message is required'}), 400
            
        question = QuestionRepository.query.get_or_404(q_id)
        
        report = QuestionReport(
            repo_question_id=question.id,
            reported_by=current_user.id,
            message=message
        )
        db.session.add(report)
        db.session.commit()
        
        return jsonify({'message': 'question reported successfully'}), 201

    @app.route('/admin/repository/reports', methods=['GET', 'OPTIONS'])
    @token_required
    def get_repository_reports(current_user):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200
            
        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403
            
        query = QuestionReport.query
        
        status_filter = request.args.get('status')
        if status_filter:
            query = query.filter_by(status=status_filter)
            
        if current_user.role == 'subject_specialist':
            query = query.join(QuestionRepository).filter(QuestionRepository.subject.ilike(current_user.specialist_subject))
            
        reports = query.order_by(desc(QuestionReport.created_at)).all()
        
        result = []
        for r in reports:
            result.append({
                'id': r.id,
                'repo_question_id': r.repo_question_id,
                'reporter_name': r.reporter.username if r.reporter else 'Unknown',
                'message': r.message,
                'status': r.status,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'resolved_at': r.resolved_at.isoformat() if r.resolved_at else None,
                'resolver_name': r.resolver.username if r.resolver else None,
                'question_text': r.question.text if r.question else None,
                'question_custom_id': r.question.custom_id if r.question else None
            })
            
        return jsonify({'reports': result}), 200

    @app.route('/admin/repository/reports/<int:r_id>/resolve', methods=['POST', 'OPTIONS'])
    @token_required
    def resolve_repository_report(current_user, r_id):
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200
            
        if current_user.role not in ('admin', 'subject_specialist'):
            return jsonify({'message': 'forbidden'}), 403
            
        report = QuestionReport.query.get_or_404(r_id)
        
        if report.status == 'resolved':
            return jsonify({'message': 'report already resolved'}), 400
            
        if current_user.role == 'subject_specialist':
            if not report.question or not report.question.subject or report.question.subject.lower() != (current_user.specialist_subject or '').lower():
                return jsonify({'message': 'forbidden'}), 403
                
        data = request.json or {}
        resolution_notes = (data.get('notes') or '').strip()
        
        report.status = 'resolved'
        report.resolved_by = current_user.id
        report.resolved_at = datetime.utcnow()
        
        log = AuditLog(
            user_id=current_user.id,
            action='REPORT_RESOLVED',
            target_type='report',
            target_id=report.id,
            details=resolution_notes or 'Report resolved'
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'message': 'report resolved successfully'}), 200
