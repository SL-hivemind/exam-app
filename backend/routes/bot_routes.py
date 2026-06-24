# routes/bot_routes.py
# Level 2 Bot — Fuzzy Matching, Memory, Rich Data Queries
import re
from flask import request, jsonify
from sqlalchemy import func, or_
from models import (
    db, User, School, Student, Exam, Question, ExamStudent,
    StudentExamAttempt, StudentAnswer, QuestionRepository, StudentRequest,
)
from routes.bot_engine import (
    extract_entities, classify_intent, get_effective_school,
    fuzzy_find_school, fuzzy_find_students, add_to_memory, get_context,
)
from utils.math_utils import competition_rank
import os
import requests

# ── External RAG service (info-only, read-only). Only used as a fallback for
#    questions the rule-based bot can't answer. Disabled (no-op) until the
#    RAG_API_URL / RAG_API_KEY env vars are set, and always degrades gracefully. ──
RAG_API_URL = os.getenv("RAG_API_URL")  # e.g. https://chat.theslpl.in/chat
RAG_API_KEY = os.getenv("RAG_API_KEY")


def _ask_rag(question, school_name=None):
    """Ask the external RAG service. Returns answer text, or None on any failure."""
    if not RAG_API_URL or not RAG_API_KEY:
        return None
    try:
        payload = {"question": question}
        if school_name:
            payload["school"] = school_name
        r = requests.post(
            RAG_API_URL,
            json=payload,
            headers={"X-API-Key": RAG_API_KEY},
            timeout=20,
        )
        if r.status_code == 200:
            return (r.json().get("response") or "").strip() or None
    except requests.RequestException:
        return None
    return None

# ── Knowledge Base ──
KB = {
    'kb_create_exam': ("📝 **How to Create an Exam:**\n\n1. Go to **Exams** → **Create Exam**\n2. Set title, duration, and access window\n3. Add questions from Repository or manually\n4. Assign students\n5. Students see it during the access window", "exams"),
    'kb_add_students': ("👨‍🎓 **Adding Students:**\n\n1. **Students** → **Add Student** or **Import CSV**\n2. CSV: `username, class_number, password`\n3. Auto-generated IDs from school code\n4. Students can self-register with your school code", "students"),
    'kb_question_repo': ("📚 **Question Repository:**\n\nCentralized bank by Subject/Chapter/Topic.\n• Add individually or bulk CSV import\n• Unique IDs (e.g. 10-PHY-KIN-0001)\n• Pull into any exam\n• Ask me to **validate questions** to find errors!", "repository/questions"),
    'kb_assign': ("📋 **Assigning Students:**\n\n1. **Exams** → click exam → **Assign Students**\n2. Select by class or individually\n3. Only assigned students see the exam", "exams"),
    'kb_results': ("📊 **Exam Results:**\n\n1. **Exams** → exam → **Results** tab\n2. Toggle **Release Results** for students\n3. Export to Excel\n4. **Analysis** tab for breakdowns", "exams"),
    'kb_csv': ("📄 **CSV Formats:**\n\n**Students:** `username, class_number, password`\n**Questions:** `subject, class_number, chapter, topic, difficulty, text, option_a, option_b, option_c, option_d, correct_answer, marks`", None),
    'kb_quick_exam': ("⚡ **Quick Exams:** Shareable tests, no login.\n1. **Quick Exams** → paste questions\n2. Set duration/expiry\n3. Share 6-char code\n4. Participants enter name and go", "quick"),
    'kb_profile': ("👤 **Profile:** Sidebar bottom → update username, email, mobile. Change password via email OTP.", "profile"),
}

GREETING = "Hello! 👋 I'm your **SL Exams Assistant** (Level 2).\n\n• 📊 **Data queries** — \"How many students in class 10?\"\n• 🏫 **School lookup** — \"Tell me about school Eesha\"\n• 🔍 **Find students** — \"Find student Rahul\" (fuzzy match!)\n• 📈 **Performance** — \"Show Rahul's scores\"\n• ✅ **Validate** — \"Check questions for errors\"\n• 📋 **Summary** — \"Give me a dashboard summary\"\n• 💬 **Memory** — I remember context in our conversation!\n\nJust ask!"
SUGGESTIONS = ["Dashboard summary", "Tell me about my school", "Check questions for errors", "Show recent exams", "Find student..."]


# ════════════════════════════════════════════════════════
# HANDLERS
# ════════════════════════════════════════════════════════

def h_student_count(ent, sid, user):
    cls = ent.get('class_number')
    q = Student.query
    label = "all schools"
    if sid:
        q = q.filter_by(school_id=sid)
        s = School.query.get(sid)
        label = s.name if s else "your school"
    elif user.role == 'school_admin':
        q = q.filter_by(school_id=user.school_id)
        s = School.query.get(user.school_id)
        label = s.name if s else "your school"
    if cls:
        q = q.filter_by(class_number=cls)
        return f"📊 **{label}** has **{q.count()}** students in Class {cls}."
    if user.role == 'admin' and not sid:
        total = Student.query.count()
        schools = School.query.all()
        lines = [f"📊 **Total: {total} students across {len(schools)} schools**\n"]
        for s in schools[:15]:
            lines.append(f"• **{s.name}** (`{s.code}`): {Student.query.filter_by(school_id=s.id).count()}")
        return '\n'.join(lines)
    return f"📊 **{label}** has **{q.count()}** students."


def h_list_students(ent, sid, user):
    cls = ent.get('class_number')
    q = Student.query.join(User, Student.user_id == User.id)
    if sid: q = q.filter(Student.school_id == sid)
    elif user.role != 'admin': q = q.filter(Student.school_id == user.school_id)
    if cls: q = q.filter(Student.class_number == cls)
    students = q.order_by(User.username).limit(25).all()
    if not students: return "📋 No students found."
    total = q.count()
    lines = [f"📋 **Students** (showing {min(25, total)} of {total}):\n"]
    for s in students:
        sch = School.query.get(s.school_id)
        lines.append(f"• **{s.user.username}** — `{s.student_id}` | Class {s.class_number or '?'} | {sch.name if sch else '?'}")
    return '\n'.join(lines)


def h_find_student(ent, sid, user):
    hint = ent.get('student_hint')
    if not hint: return "🔍 Please specify a name. Example: \"Find student Rahul\""
    eff_sid = sid if user.role == 'admin' else user.school_id
    students = fuzzy_find_students(hint, school_id=eff_sid)
    if not students: return f"🔍 No students found matching **\"{hint}\"**. Try a different spelling?"
    lines = [f"🔍 **Found {len(students)} match{'es' if len(students)!=1 else ''} for \"{hint}\":**\n"]
    for s in students:
        sch = School.query.get(s.school_id)
        lines.append(f"• **{s.user.username}** — `{s.student_id}` | Class {s.class_number or '?'} | {sch.name if sch else '?'}")
    return '\n'.join(lines)


def h_student_performance(ent, sid, user):
    if user.role == 'student':
        st = Student.query.filter_by(user_id=user.id).first()
    else:
        hint = ent.get('student_hint')
        if not hint: return "📈 Please specify a student. Example: \"Show Rahul's scores\""
        eff_sid = sid if user.role == 'admin' else user.school_id
        students = fuzzy_find_students(hint, school_id=eff_sid, limit=1)
        if not students: return f"📈 No student found matching **\"{hint}\"**."
        st = students[0]
    attempts = StudentExamAttempt.query.filter_by(student_id=st.user_id).order_by(StudentExamAttempt.start_time.desc()).limit(10).all()
    if not attempts: return f"📈 **{st.user.username}** has no exam attempts yet."
    lines = [f"📈 **{st.user.username}** (`{st.student_id}`) — Recent Scores:\n"]
    for a in attempts:
        exam = Exam.query.get(a.exam_id)
        title = exam.title if exam else f"Exam #{a.exam_id}"
        total = exam.total_marks if exam else '?'
        dt = a.start_time.strftime('%b %d') if a.start_time else '?'
        pct = f"{round(a.score/total*100)}%" if a.score is not None and total and total != '?' and total > 0 else 'N/A'
        lines.append(f"• **{title}** ({dt}): {a.score}/{total} ({pct})")
    return '\n'.join(lines)


def h_school_info(ent, sid, user):
    if not sid and user.role == 'school_admin':
        sid = user.school_id
    if not sid and ent.get('school_hint'):
        s = fuzzy_find_school(ent['school_hint'])
        if s: sid = s.id
        else: return f"🏫 Couldn't find a school matching **\"{ent['school_hint']}\"**. Check the spelling?"
    if not sid:
        if user.role == 'admin':
            schools = School.query.all()
            lines = [f"🏫 **All Schools ({len(schools)}):**\n"]
            for s in schools:
                sc = Student.query.filter_by(school_id=s.id).count()
                lines.append(f"• **{s.name}** (`{s.code}`) — {sc} students")
            return '\n'.join(lines)
        return "🏫 Which school? Example: \"Tell me about school Eesha\""
    sch = School.query.get(sid)
    if not sch: return "❌ School not found."
    sc = Student.query.filter_by(school_id=sid).count()
    ec = Exam.query.filter_by(school_id=sid).count()
    qc = QuestionRepository.query.filter_by(school_id=sid).count()
    admins = User.query.filter_by(school_id=sid, role='school_admin').all()
    anames = ', '.join(a.username for a in admins) or 'None'
    pend = StudentRequest.query.filter_by(school_id=sid, status='pending').count()
    classes = db.session.query(Student.class_number, func.count(Student.user_id)).filter_by(school_id=sid).group_by(Student.class_number).all()
    cl = '\n'.join(f"  • Class {c or '?'}: {n}" for c, n in sorted(classes, key=lambda x: str(x[0])))
    return f"🏫 **{sch.name}**\n\n• **Code:** `{sch.code}`\n• **Admin(s):** {anames}\n• **Students:** {sc}\n• **Exams:** {ec}\n• **Questions:** {qc}\n• **Pending Requests:** {pend}\n\n**Classes:**\n{cl or '  No students yet'}"


def h_exam_count(ent, sid, user):
    q = Exam.query
    if sid: q = q.filter_by(school_id=sid)
    elif user.role == 'school_admin': q = q.filter(or_(Exam.school_id == user.school_id, Exam.school_id == None))
    return f"📊 **{q.count()} exams** found."


def h_recent_exams(ent, sid, user):
    q = Exam.query
    if sid: q = q.filter(or_(Exam.school_id == sid, Exam.school_id == None))
    elif user.role == 'school_admin': q = q.filter(or_(Exam.school_id == user.school_id, Exam.school_id == None))
    exams = q.order_by(Exam.created_at.desc()).limit(5).all()
    if not exams: return "📋 No exams yet."
    lines = ["📋 **Recent Exams:**\n"]
    for i, e in enumerate(exams, 1):
        dt = e.created_at.strftime('%b %d') if e.created_at else '?'
        att = StudentExamAttempt.query.filter_by(exam_id=e.id).count()
        asgn = ExamStudent.query.filter_by(exam_id=e.id).count()
        lines.append(f"{i}. **{e.title}** ({dt}) — {att}/{asgn} attempted")
    return '\n'.join(lines)


def h_exam_avg(ent, sid, user):
    q = Exam.query
    if sid: q = q.filter_by(school_id=sid)
    elif user.role == 'school_admin': q = q.filter(or_(Exam.school_id == user.school_id, Exam.school_id == None))
    exams = q.order_by(Exam.created_at.desc()).limit(5).all()
    if not exams: return "📊 No exams to calculate averages."
    lines = ["📊 **Exam Averages (Recent 5):**\n"]
    for e in exams:
        avg = db.session.query(func.avg(StudentExamAttempt.score)).filter_by(exam_id=e.id).scalar()
        cnt = StudentExamAttempt.query.filter_by(exam_id=e.id).count()
        avg_str = f"{avg:.1f}" if avg else "N/A"
        lines.append(f"• **{e.title}** — Avg: {avg_str}/{e.total_marks} ({cnt} attempts)")
    return '\n'.join(lines)


def h_question_count(ent, sid, user):
    subj, cls = ent.get('subject'), ent.get('class_number')
    q = QuestionRepository.query
    if user.role == 'school_admin':
        q = q.filter(or_(QuestionRepository.school_id == user.school_id, QuestionRepository.school_id == None))
    elif sid:
        q = q.filter(or_(QuestionRepository.school_id == sid, QuestionRepository.school_id == None))
    if subj: q = q.filter(QuestionRepository.subject.ilike(f'%{subj}%'))
    if cls: q = q.filter_by(class_number=cls)
    return f"📚 **{q.count()} questions** in the repository."


def h_pending_requests(ent, sid, user):
    q = StudentRequest.query.filter_by(status='pending')
    if user.role == 'school_admin': q = q.filter_by(school_id=user.school_id)
    elif sid: q = q.filter_by(school_id=sid)
    reqs = q.order_by(StudentRequest.created_at.desc()).limit(10).all()
    if not reqs: return "✅ **No pending requests.** All caught up!"
    lines = [f"🔔 **{len(reqs)} Pending:**\n"]
    for r in reqs:
        u = User.query.get(r.student_user_id)
        lines.append(f"• **{u.username if u else '?'}** — {r.request_type.replace('_',' ')}")
    return '\n'.join(lines)


def h_school_count(ent, sid, user):
    return f"🏫 **{School.query.count()} schools** on the platform."


def h_dashboard_summary(ent, sid, user):
    if user.role == 'school_admin':
        sid = user.school_id
    sch = School.query.get(sid) if sid else None
    label = sch.name if sch else "Platform"
    sc = Student.query.filter_by(school_id=sid).count() if sid else Student.query.count()
    ec = Exam.query.filter_by(school_id=sid).count() if sid else Exam.query.count()
    qc = QuestionRepository.query.filter(or_(QuestionRepository.school_id == sid, QuestionRepository.school_id == None)).count() if sid else QuestionRepository.query.count()
    pend = StudentRequest.query.filter_by(school_id=sid, status='pending').count() if sid else StudentRequest.query.filter_by(status='pending').count()
    schools = School.query.count() if user.role == 'admin' else None
    lines = [f"📋 **{label} — Quick Summary**\n"]
    if schools is not None: lines.append(f"• 🏫 Schools: **{schools}**")
    lines.append(f"• 👨‍🎓 Students: **{sc}**")
    lines.append(f"• 📝 Exams: **{ec}**")
    lines.append(f"• 📚 Questions: **{qc}**")
    lines.append(f"• 🔔 Pending Requests: **{pend}**")
    return '\n'.join(lines)


def h_validate_questions(ent, sid, user):
    subj, cls = ent.get('subject'), ent.get('class_number')
    q = QuestionRepository.query
    if user.role == 'school_admin':
        q = q.filter(or_(QuestionRepository.school_id == user.school_id, QuestionRepository.school_id == None))
    elif sid:
        q = q.filter(or_(QuestionRepository.school_id == sid, QuestionRepository.school_id == None))
    if subj: q = q.filter(QuestionRepository.subject.ilike(f'%{subj}%'))
    if cls: q = q.filter_by(class_number=cls)
    questions = q.all()
    if not questions: return "📋 No questions to validate."
    issues, seen = [], {}
    for qn in questions:
        qid = qn.custom_id or f"ID-{qn.id}"
        if not qn.text or len(qn.text.strip()) < 10:
            issues.append(f"⚠️ **{qid}** — Text too short ({len((qn.text or '').strip())} chars)")
        for on, ov in [('A',qn.option_a),('B',qn.option_b),('C',qn.option_c),('D',qn.option_d)]:
            if not ov or not ov.strip():
                issues.append(f"⚠️ **{qid}** — Option {on} empty")
        opts = [o.strip().lower() for o in [qn.option_a or '',qn.option_b or '',qn.option_c or '',qn.option_d or ''] if o and o.strip()]
        if len(opts) != len(set(opts)):
            issues.append(f"⚠️ **{qid}** — Duplicate options")
        if not qn.correct_answer or qn.correct_answer.upper() not in ('A','B','C','D'):
            issues.append(f"🔴 **{qid}** — Invalid answer: \"{qn.correct_answer}\"")
        tk = (qn.text or '').strip().lower()[:80]
        if tk and len(tk) > 15:
            if tk in seen: issues.append(f"🔁 **{qid}** — Duplicate of **{seen[tk]}**")
            else: seen[tk] = qid
    if not issues:
        return f"✅ Scanned **{len(questions)} questions** — **No issues!** 🎉"
    return f"🔍 Scanned **{len(questions)}** — **{len(issues)} issues:**\n\n" + '\n'.join(issues[:30])


def h_compare(ent, sid, user):
    cls = ent.get('class_number')
    if not cls: return "📊 Please specify what to compare. Example: \"Compare class 10 and class 12\""
    # Find all class numbers mentioned
    classes = re.findall(r'class\s*(\d+)', ent.get('_raw', ''), re.I)
    if len(classes) < 2:
        classes_in_msg = re.findall(r'\b(\d{1,2})\b', ent.get('_raw', ''))
        classes = list(set(classes_in_msg))[:4]
    eff_sid = sid or (user.school_id if user.role == 'school_admin' else None)
    lines = ["📊 **Class Comparison:**\n"]
    for c in sorted(classes):
        q = Student.query.filter_by(class_number=c)
        if eff_sid: q = q.filter_by(school_id=eff_sid)
        lines.append(f"• **Class {c}:** {q.count()} students")
    return '\n'.join(lines)


def h_my_rank(ent, sid, user):
    if user.role != 'student': return "This is only available for students."
    attempts = StudentExamAttempt.query.filter_by(student_id=user.id).order_by(StudentExamAttempt.submitted_time.desc()).limit(5).all()
    if not attempts: return "You haven't completed any exams yet."
    lines = ["🏆 **Your Recent Ranks:**\n"]
    for a in attempts:
        exam = Exam.query.get(a.exam_id)
        peer_scores = [s[0] for s in db.session.query(StudentExamAttempt.score).filter_by(exam_id=exam.id).filter(StudentExamAttempt.submitted_time.isnot(None)).all() if s[0] is not None]
        rank = competition_rank(a.score, peer_scores)
        total = len(peer_scores)
        lines.append(f"• **{exam.title}:** Rank #{rank} (out of {total} students)")
    return '\n'.join(lines)

def h_my_weaknesses(ent, sid, user):
    if user.role != 'student': return "This is only available for students."
    perf_rows = (
        db.session.query(
            QuestionRepository.chapter,
            StudentAnswer.marks_awarded,
            Question.marks,
        )
        .select_from(StudentExamAttempt)
        .join(StudentAnswer, StudentAnswer.attempt_id == StudentExamAttempt.id)
        .join(Question, Question.id == StudentAnswer.question_id)
        .outerjoin(QuestionRepository, Question.repo_question_id == QuestionRepository.id)
        .filter(StudentExamAttempt.student_id == user.id)
        .filter(StudentExamAttempt.submitted_time.isnot(None))
        .all()
    )
    if not perf_rows: return "You haven't completed any exams yet."
    cmap = {}
    for chapter, awarded, qmarks in perf_rows:
        c = (chapter or 'General').strip() or 'General'
        m = qmarks or 1
        e = awarded or 0
        if c not in cmap: cmap[c] = {'earned': 0, 'total': 0}
        cmap[c]['earned'] += e
        cmap[c]['total'] += m
    weak = []
    for c, data in cmap.items():
        pct = (data['earned'] / data['total']) * 100 if data['total'] else 0
        if pct < 50: weak.append((c, pct))
    weak.sort(key=lambda x: x[1])
    if not weak: return "You don't have any weak subjects! Keep up the good work! 🌟"
    lines = ["📚 **Areas to Improve (Score < 50%):**\n"]
    for c, pct in weak[:5]:
        lines.append(f"• **{c}** ({round(pct)}%)")
    return '\n'.join(lines)


HANDLERS = {
    'student_count': h_student_count, 'list_students': h_list_students,
    'find_student': h_find_student, 'student_performance': h_student_performance,
    'school_info': h_school_info, 'school_count': h_school_count,
    'exam_count': h_exam_count, 'recent_exams': h_recent_exams, 'exam_avg': h_exam_avg,
    'question_count': h_question_count, 'pending_requests': h_pending_requests,
    'dashboard_summary': h_dashboard_summary, 'validate_questions': h_validate_questions,
    'compare': h_compare, 'my_rank': h_my_rank, 'my_weaknesses': h_my_weaknesses,
}

LINK_MAP = {
    'school_info': 'schools', 'school_count': 'schools',
    'student_count': 'students', 'list_students': 'students', 'find_student': 'students',
    'student_performance': 'students',
    'exam_count': 'exams', 'recent_exams': 'exams', 'exam_avg': 'exams',
    'question_count': 'repository/questions', 'validate_questions': 'repository/questions',
    'pending_requests': 'requests',
}


ALLOWED_INTENTS = {
    'admin': 'all',
    'school_admin': 'all',
    'student': ['greeting', 'my_rank', 'my_weaknesses', 'student_performance', 'kb_profile'],
    'subject_specialist': ['greeting', 'question_count', 'validate_questions', 'dashboard_summary', 'kb_question_repo', 'kb_profile']
}

ROLE_GREETINGS = {
    'student': "Hello! 👋 I'm your **Student Assistant**.\n\n• 🏆 **Rankings** — \"What is my rank in the last exam?\"\n• 📚 **Weaknesses** — \"What are my weak subjects?\"\n• 📈 **Performance** — \"Show my recent scores\"\n\nJust ask!",
    'subject_specialist': "Hello! 👋 I'm your **Repository Assistant**.\n\n• ✅ **Validate** — \"Check my questions for errors\"\n• 📊 **Status** — \"Give me a repo summary\"\n• 📚 **Count** — \"How many questions do we have?\"\n\nJust ask!",
}

ROLE_SUGGESTIONS = {
    'student': ["What is my rank?", "What are my weak subjects?", "Show my recent scores"],
    'subject_specialist': ["Check questions for errors", "Give me a repo summary", "How many questions do we have?"],
}


def register_bot_routes(app, role_required):

    @app.post('/bot/chat')
    @role_required('admin', 'school_admin', 'student', 'subject_specialist', 'public_user')
    def bot_chat(current_user):
        data = request.get_json(silent=True) or {}
        message = (data.get('message') or '').strip()
        mode = data.get('mode', 'dashboard')

        if not message:
            return jsonify({'message': 'Please type a message'}), 400

        if mode == 'study':
            add_to_memory(current_user.id, 'user', message, {})
            school_name = None
            if current_user.role == 'school_admin':
                sch = School.query.get(current_user.school_id)
                school_name = sch.name if sch else None
            
            rag_answer = _ask_rag(message, school_name)
            if rag_answer:
                resp, intent = rag_answer, "rag"
            else:
                resp = "⚠️ I'm having trouble reaching the study database right now. Please try again later."
                intent = "error"
            
            add_to_memory(current_user.id, 'bot', resp)
            return jsonify({'response': resp, 'suggestions': [], 'link': None, 'intent': intent}), 200

        intent = classify_intent(message)
        entities = extract_entities(message)
        entities['_raw'] = message
        memory_ctx = get_context(current_user.id)
        role = current_user.role

        allowed = ALLOWED_INTENTS.get(role, [])
        if allowed != 'all' and intent not in allowed and intent != 'unknown':
            return jsonify({
                'response': "🔒 **Access Denied:** I am restricted from answering that based on your role.",
                'suggestions': ROLE_SUGGESTIONS.get(role, SUGGESTIONS),
                'link': None, 'intent': intent
            }), 200

        # Inherit context from memory for follow-ups
        for key in ('school_hint', 'class_number', 'subject'):
            if key not in entities and key in memory_ctx:
                entities[key] = memory_ctx[key]

        sid = get_effective_school(entities, current_user, memory_ctx)
        add_to_memory(current_user.id, 'user', message, entities)

        suggs = ROLE_SUGGESTIONS.get(role, SUGGESTIONS)
        resp, link = "", None

        if intent == "greeting":
            resp = ROLE_GREETINGS.get(role, GREETING)
        elif intent in KB:
            resp, link = KB[intent]
        elif intent in HANDLERS:
            try:
                resp = HANDLERS[intent](entities, sid, current_user)
            except Exception as e:
                resp = f"⚠️ Error: {str(e)}"
            link = LINK_MAP.get(intent)
        else:
            if role == 'student':
                resp = "🤔 I didn't quite get that. Try:\n\n• \"What is my rank?\"\n• \"What are my weak subjects?\"\n• \"Show my recent scores\""
            elif role == 'subject_specialist':
                resp = "🤔 I didn't quite get that. Try:\n\n• \"Check questions for errors\"\n• \"Give me a repo summary\""
            else:
                resp = "🤔 I didn't quite get that. Try:\n\n• \"Dashboard summary\"\n• \"Tell me about school [name]\"\n• \"Find student [name]\"\n• \"Show Rahul's scores\"\n• \"Check questions for errors\""

        add_to_memory(current_user.id, 'bot', resp)
        return jsonify({'response': resp, 'suggestions': suggs, 'link': link, 'intent': intent}), 200

    @app.get('/bot/suggestions')
    @role_required('admin', 'school_admin', 'student', 'subject_specialist', 'public_user')
    def bot_suggestions(current_user):
        return jsonify({'suggestions': ROLE_SUGGESTIONS.get(current_user.role, SUGGESTIONS)}), 200
