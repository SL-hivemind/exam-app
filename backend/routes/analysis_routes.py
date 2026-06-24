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
