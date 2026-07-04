"""Student performance analysis routes extracted from app.py."""

from flask import jsonify

from models import Exam, Question, QuestionRepository, Student, StudentAnswer, StudentExamAttempt, db
from utils.math_utils import competition_rank, calculate_percentile


def register_analysis_routes(
    app,
    token_required,
):
    @app.route('/student/analysis/<int:user_id>', methods=['GET'])
    @token_required
    def student_performance_analysis(current_user, user_id):
        if current_user.role == 'student' and current_user.id != user_id:
            return jsonify({'message': 'Forbidden'}), 403
        if current_user.role == 'school_admin':
            student = Student.query.filter_by(user_id=user_id).first()
            if not student or student.school_id != current_user.school_id:
                return jsonify({'message': 'Forbidden'}), 403

        attempts_rows = (
            db.session.query(StudentExamAttempt, Exam)
            .join(Exam, Exam.id == StudentExamAttempt.exam_id)
            .filter(StudentExamAttempt.student_id == user_id)
            .filter(StudentExamAttempt.submitted_time.isnot(None))
            .order_by(StudentExamAttempt.submitted_time.asc())
            .all()
        )

        exam_wise = []
        timeline = []
        percentages = []

        for att, exam in attempts_rows:
            peer_scores = [
                score
                for (score,) in db.session.query(StudentExamAttempt.score)
                .filter(StudentExamAttempt.exam_id == exam.id)
                .filter(StudentExamAttempt.submitted_time.isnot(None))
                .filter(StudentExamAttempt.score.isnot(None))
                .all()
            ]
            percent = round((att.score / exam.total_marks) * 100, 2) if exam.total_marks else 0
            percentages.append(percent)

            rank = competition_rank(att.score, peer_scores)
            participants = len(peer_scores)
            percentile = calculate_percentile(att.score, peer_scores)

            exam_wise.append(
                {
                    'exam_id': exam.id,
                    'exam_title': exam.title,
                    'submitted_time': att.submitted_time.isoformat() if att.submitted_time else None,
                    'score': att.score,
                    'total_marks': exam.total_marks,
                    'percentage': percent,
                    'rank': rank,
                    'participants': participants,
                    'percentile': percentile,
                }
            )
            timeline.append(
                {
                    'label': att.submitted_time.strftime('%d %b'),
                    'exam_title': exam.title,
                    'percentage': percent,
                }
            )

        perf_rows = (
            db.session.query(
                QuestionRepository.subject,
                QuestionRepository.chapter,
                StudentAnswer.marks_awarded,
                Question.marks,
            )
            .select_from(StudentExamAttempt)
            .join(StudentAnswer, StudentAnswer.attempt_id == StudentExamAttempt.id)
            .join(Question, Question.id == StudentAnswer.question_id)
            .outerjoin(QuestionRepository, Question.repo_question_id == QuestionRepository.id)
            .filter(StudentExamAttempt.student_id == user_id)
            .filter(StudentExamAttempt.submitted_time.isnot(None))
            .all()
        )

        chapter_map = {}
        subject_map = {}
        for subject, chapter, marks_awarded, question_marks in perf_rows:
            subject_key = (subject or 'General').strip() or 'General'
            chapter_key = (chapter or 'General').strip() or 'General'
            max_marks = question_marks or 1
            earned = marks_awarded or 0

            chapter_item = chapter_map.setdefault(
                chapter_key,
                {'chapter': chapter_key, 'subject': subject_key, 'earned': 0, 'total': 0},
            )
            chapter_item['earned'] += earned
            chapter_item['total'] += max_marks

            subject_item = subject_map.setdefault(subject_key, {'subject': subject_key, 'earned': 0, 'total': 0})
            subject_item['earned'] += earned
            subject_item['total'] += max_marks

        chapter_breakdown = []
        for item in chapter_map.values():
            pct = round((item['earned'] / item['total']) * 100, 2) if item['total'] else 0
            chapter_breakdown.append(
                {
                    'chapter': item['chapter'],
                    'subject': item['subject'],
                    'earned_marks': item['earned'],
                    'total_marks': item['total'],
                    'percentage': pct,
                }
            )
        chapter_breakdown.sort(key=lambda x: x['percentage'])

        subject_breakdown = []
        for item in subject_map.values():
            pct = round((item['earned'] / item['total']) * 100, 2) if item['total'] else 0
            subject_breakdown.append(
                {
                    'subject': item['subject'],
                    'earned_marks': item['earned'],
                    'total_marks': item['total'],
                    'percentage': pct,
                }
            )
        subject_breakdown.sort(key=lambda x: x['percentage'])

        attempted = len(exam_wise)
        avg_pct = round(sum(percentages) / attempted, 2) if attempted else 0
        best_exam = max(exam_wise, key=lambda x: x['percentage']) if exam_wise else None
        worst_exam = min(exam_wise, key=lambda x: x['percentage']) if exam_wise else None
        latest_pct = percentages[-1] if percentages else 0
        previous_pct = percentages[-2] if len(percentages) > 1 else None

        trend_delta = round(latest_pct - previous_pct, 2) if previous_pct is not None else 0
        trend_label = 'steady'
        if previous_pct is not None:
            if trend_delta > 0:
                trend_label = 'improving'
            elif trend_delta < 0:
                trend_label = 'declining'

        improvement_needed = [c for c in chapter_breakdown if c['percentage'] < 50][:5]
        strengths = sorted(
            [c for c in chapter_breakdown if c['percentage'] >= 70],
            key=lambda x: x['percentage'],
            reverse=True,
        )[:5]
        valid_percentiles = [x['percentile'] for x in exam_wise if x['percentile'] is not None]
        avg_percentile = round(sum(valid_percentiles) / len(valid_percentiles), 2) if valid_percentiles else 0

        return (
            jsonify(
                {
                    'summary': {
                        'attempted_exams': attempted,
                        'average_percentage': avg_pct,
                        'average_percentile': avg_percentile,
                        'best_exam': best_exam,
                        'worst_exam': worst_exam,
                        'latest_percentage': latest_pct,
                        'trend_delta': trend_delta,
                        'trend': trend_label,
                    },
                    'timeline': timeline,
                    'exam_wise': exam_wise,
                    'chapter_breakdown': chapter_breakdown,
                    'subject_breakdown': subject_breakdown,
                    'improvement_needed': improvement_needed,
                    'strengths': strengths,
                }
            ),
            200,
        )

    from flask import request

    @app.route('/school/analysis/<int:school_id>', methods=['GET'])
    @token_required
    def school_performance_analysis(current_user, school_id):
        if current_user.role != 'school_admin' or current_user.school_id != school_id:
            return jsonify({'message': 'Forbidden'}), 403

        class_filter = request.args.get('class', 'all')
        subject_filter = request.args.get('subject', 'all')

        query = (
            db.session.query(StudentExamAttempt, Exam, Student)
            .join(Exam, Exam.id == StudentExamAttempt.exam_id)
            .join(Student, Student.user_id == StudentExamAttempt.student_id)
            .filter(Student.school_id == school_id)
            .filter(StudentExamAttempt.submitted_time.isnot(None))
        )

        if class_filter != 'all':
            query = query.filter(Student.class_number == class_filter)

        attempts_rows = query.order_by(StudentExamAttempt.submitted_time.asc()).all()

        exam_wise = []
        timeline = []
        percentages = []

        total_students_set = set()

        for att, exam, student in attempts_rows:
            total_students_set.add(student.user_id)
            percent = round((att.score / exam.total_marks) * 100, 2) if exam.total_marks else 0
            percentages.append(percent)

            exam_wise.append(
                {
                    'exam_id': exam.id,
                    'exam_title': exam.title,
                    'student_id': student.student_id,
                    'class_number': student.class_number,
                    'submitted_time': att.submitted_time.isoformat() if att.submitted_time else None,
                    'score': att.score,
                    'total_marks': exam.total_marks,
                    'percentage': percent,
                }
            )
            timeline.append(
                {
                    'label': att.submitted_time.strftime('%d %b') if att.submitted_time else '-',
                    'exam_title': exam.title,
                    'percentage': percent,
                }
            )

        perf_query = (
            db.session.query(
                QuestionRepository.subject,
                Student.class_number,
                StudentAnswer.marks_awarded,
                Question.marks,
            )
            .select_from(StudentExamAttempt)
            .join(Student, Student.user_id == StudentExamAttempt.student_id)
            .join(StudentAnswer, StudentAnswer.attempt_id == StudentExamAttempt.id)
            .join(Question, Question.id == StudentAnswer.question_id)
            .outerjoin(QuestionRepository, Question.repo_question_id == QuestionRepository.id)
            .filter(Student.school_id == school_id)
            .filter(StudentExamAttempt.submitted_time.isnot(None))
        )

        if class_filter != 'all':
            perf_query = perf_query.filter(Student.class_number == class_filter)
        if subject_filter != 'all':
            perf_query = perf_query.filter(QuestionRepository.subject == subject_filter)

        perf_rows = perf_query.all()

        class_map = {}
        subject_map = {}

        for subject, class_num, marks_awarded, question_marks in perf_rows:
            subject_key = (subject or 'General').strip() or 'General'
            class_key = (class_num or 'Unknown').strip() or 'Unknown'
            max_marks = question_marks or 1
            earned = marks_awarded or 0

            class_item = class_map.setdefault(
                class_key,
                {'class_number': class_key, 'earned': 0, 'total': 0},
            )
            class_item['earned'] += earned
            class_item['total'] += max_marks

            subject_item = subject_map.setdefault(
                subject_key,
                {'subject': subject_key, 'earned': 0, 'total': 0}
            )
            subject_item['earned'] += earned
            subject_item['total'] += max_marks

        class_breakdown = []
        for item in class_map.values():
            pct = round((item['earned'] / item['total']) * 100, 2) if item['total'] else 0
            class_breakdown.append(
                {
                    'class_number': item['class_number'],
                    'earned_marks': item['earned'],
                    'total_marks': item['total'],
                    'percentage': pct,
                }
            )
        class_breakdown.sort(key=lambda x: x['percentage'], reverse=True)

        subject_breakdown = []
        for item in subject_map.values():
            pct = round((item['earned'] / item['total']) * 100, 2) if item['total'] else 0
            subject_breakdown.append(
                {
                    'subject': item['subject'],
                    'earned_marks': item['earned'],
                    'total_marks': item['total'],
                    'percentage': pct,
                }
            )
        subject_breakdown.sort(key=lambda x: x['percentage'], reverse=True)

        attempted = len(exam_wise)
        avg_pct = round(sum(percentages) / attempted, 2) if attempted else 0
        latest_pct = percentages[-1] if percentages else 0
        previous_pct = percentages[-2] if len(percentages) > 1 else None

        trend_delta = round(latest_pct - previous_pct, 2) if previous_pct is not None else 0
        trend_label = 'steady'
        if previous_pct is not None:
            if trend_delta > 0:
                trend_label = 'improving'
            elif trend_delta < 0:
                trend_label = 'declining'

        improvement_needed = sorted(
            [c for c in subject_breakdown if c['percentage'] < 50],
            key=lambda x: x['percentage']
        )[:5]
        
        strengths = sorted(
            [c for c in subject_breakdown if c['percentage'] >= 70],
            key=lambda x: x['percentage'],
            reverse=True,
        )[:5]

        # Filters based on available school data
        filters_query = (
            db.session.query(Student.class_number, QuestionRepository.subject)
            .select_from(StudentExamAttempt)
            .join(Student, Student.user_id == StudentExamAttempt.student_id)
            .join(StudentAnswer, StudentAnswer.attempt_id == StudentExamAttempt.id)
            .join(Question, Question.id == StudentAnswer.question_id)
            .outerjoin(QuestionRepository, Question.repo_question_id == QuestionRepository.id)
            .filter(Student.school_id == school_id)
            .distinct()
            .all()
        )

        available_classes = sorted(list(set(str(f[0]).strip() for f in filters_query if f[0] and str(f[0]).strip())))
        available_subjects = sorted(list(set(str(f[1]).strip() for f in filters_query if f[1] and str(f[1]).strip())))

        daily_timeline = {}
        for item in timeline:
            date_label = item['label']
            if date_label not in daily_timeline:
                daily_timeline[date_label] = {'sum': 0, 'count': 0}
            daily_timeline[date_label]['sum'] += item['percentage']
            daily_timeline[date_label]['count'] += 1
            
        agg_timeline = [
            {'label': date, 'percentage': round(val['sum'] / val['count'], 2)}
            for date, val in daily_timeline.items()
        ]

        return (
            jsonify(
                {
                    'summary': {
                        'total_students_attempted': len(total_students_set),
                        'attempted_exams': attempted,
                        'average_percentage': avg_pct,
                        'latest_percentage': latest_pct,
                        'trend_delta': trend_delta,
                        'trend': trend_label,
                    },
                    'timeline': agg_timeline[-30:],
                    'exam_wise': exam_wise,
                    'class_breakdown': class_breakdown,
                    'subject_breakdown': subject_breakdown,
                    'improvement_needed': improvement_needed,
                    'strengths': strengths,
                    'filters': {
                        'classes': available_classes,
                        'subjects': available_subjects,
                    }
                }
            ),
            200,
        )
