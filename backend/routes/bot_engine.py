# routes/bot_engine.py
# Level 2 Bot Engine — Fuzzy Matching + Conversation Memory
import re
from difflib import SequenceMatcher
from collections import defaultdict
from datetime import datetime
from sqlalchemy import func, or_
from models import (
    db, User, School, Student, Exam, ExamStudent,
    StudentExamAttempt, QuestionRepository, StudentRequest,
)

# ── Conversation Memory (in-process, per user) ──
_memory = defaultdict(lambda: {"messages": [], "context": {}})

def get_memory(user_id):
    return _memory[user_id]

def add_to_memory(user_id, role, text, entities=None):
    mem = _memory[user_id]
    mem["messages"].append({"role": role, "text": text, "ts": datetime.utcnow().isoformat()})
    if len(mem["messages"]) > 20:
        mem["messages"] = mem["messages"][-20:]
    if entities:
        mem["context"].update({k: v for k, v in entities.items() if v})

def get_context(user_id):
    return _memory[user_id].get("context", {})

# ── Fuzzy Matching ──
def fuzzy_score(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def fuzzy_find_school(hint):
    if not hint or len(hint) < 2:
        return None
    schools = School.query.all()
    best, best_score = None, 0.0
    for s in schools:
        for field in [s.name, s.code]:
            score = fuzzy_score(hint, field)
            if hint.lower() in field.lower():
                score = max(score, 0.85)
            if score > best_score:
                best_score = score
                best = s
    return best if best_score >= 0.45 else None

def fuzzy_find_students(hint, school_id=None, limit=10):
    if not hint or len(hint) < 2:
        return []
    q = Student.query.join(User, Student.user_id == User.id)
    if school_id:
        q = q.filter(Student.school_id == school_id)
    all_students = q.all()
    scored = []
    for s in all_students:
        name = s.user.username if s.user else ""
        score = max(fuzzy_score(hint, name),
                    fuzzy_score(hint, s.student_id or ""))
        if hint.lower() in name.lower():
            score = max(score, 0.85)
        if score >= 0.4:
            scored.append((score, s))
    scored.sort(key=lambda x: -x[0])
    return [s for _, s in scored[:limit]]

# ── Entity Extraction ──
SUBJECTS = ['physics','chemistry','biology','math','maths','mathematics',
            'english','hindi','science','social','history','geography',
            'computer','economics','accounts','business','tamil','telugu',
            'sanskrit','kannada','malayalam','civics','political']

def extract_entities(msg):
    ent = {}
    m = re.search(r'class\s*(\d+)', msg, re.I)
    if m: ent['class_number'] = m.group(1)
    # School hint - try multiple patterns
    for pat in [
        r'\bschool\s+([A-Za-z][\w\s]{1,25}?)(?:\s*[\?\.]|$|\s+(?:has|have|student|exam|how|what|count|show|find|check|is|are|list|total))',
        r'\b(?:in|of|for|from|at)\s+(?:school\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'\b(?:about|details?\s+(?:of|for))\s+(?:school\s+)?([A-Z][a-z]+)',
    ]:
        m = re.search(pat, msg, re.I)
        if m:
            val = m.group(1).strip()
            if val.lower() not in ('the','a','my','this','all','class','exam','student','question'):
                ent['school_hint'] = val
                break
    for s in SUBJECTS:
        if s in msg.lower():
            ent['subject'] = s.title() if s != 'maths' else 'Mathematics'
            break
    # Student name hint
    for pat in [
        r"\b(?:student|find|search|about)\s+(?:named?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"\b([A-Z][a-z]+)'s\s+(?:score|result|exam|performance|mark)",
    ]:
        m = re.search(pat, msg, re.I)
        if m:
            val = m.group(1).strip()
            if val.lower() not in ('school','exam','class','the','question','all','my','recent','pending','new'):
                ent['student_hint'] = val
                break
    return ent

# ── Resolve effective school ──
def get_effective_school(entities, current_user, memory_ctx=None):
    if current_user.role == 'school_admin':
        return current_user.school_id
    hint = entities.get('school_hint')
    if not hint and memory_ctx:
        hint = memory_ctx.get('school_hint')
    if hint:
        sch = fuzzy_find_school(hint)
        if sch: return sch.id
    return None

# ── Intent Classification ──
def classify_intent(msg):
    m = msg.lower().strip().rstrip('?!.')
    if m in ("hi","hello","hey","help","good morning","good evening") or m.startswith("hi ") or m.startswith("hello "):
        return "greeting"
    rules = [
        (r'(my|what is my|did i).*(rank|position|place)', 'my_rank'),
        (r'(my|what are my|which).*(weak|weakness|study|improve|lose marks)', 'my_weaknesses'),
        (r'(check|validate|audit|scan|review|find error|find mistake|verify).*(question|repo|bank)', 'validate_questions'),
        (r'(summary|overview|dashboard|status|give me.*summary)', 'dashboard_summary'),
        (r"(\w+)'s\s+(score|result|exam|performance|mark)", 'student_performance'),
        (r'(score|result|performance|mark).*(student|of)', 'student_performance'),
        (r'(how many|total|count|number of)\s+\w*\s*(student|pupil)', 'student_count'),
        (r'(list|show|all)\s+\w*\s*(student|pupil)', 'list_students'),
        (r'(find|search|look|about|detail)\s+\w*\s*(student|pupil)', 'find_student'),
        (r'(how many|total|count)\s+\w*\s*(exam|test)', 'exam_count'),
        (r'(recent|latest|last|show|list)\s+\w*\s*(exam|test)', 'recent_exams'),
        (r'(average|avg|mean)\s+\w*\s*(score|mark|result)', 'exam_avg'),
        (r'(how many|total|count)\s+\w*\s*(question)', 'question_count'),
        (r'(tell|about|detail|info|show)\s+\w*\s*(school)', 'school_info'),
        (r'(how many|total|count)\s+\w*\s*(school)', 'school_count'),
        (r'(pending|open|student)\s+\w*\s*(request)', 'pending_requests'),
        (r'(compare|comparison|vs|versus)', 'compare'),
        (r'(how|create|make|add|set)\s+\w*\s*(exam)', 'kb_create_exam'),
        (r'(how|create|add|register|enroll)\s+\w*\s*(student)', 'kb_add_students'),
        (r'(what|how)\s+\w*\s*(question|repo)', 'kb_question_repo'),
        (r'(how|assign)\s+\w*\s*(assign)', 'kb_assign'),
        (r'(how|view|check|release)\s+\w*\s*(result|score)', 'kb_results'),
        (r'(csv|import|upload|format)', 'kb_csv'),
        (r'(quick|link|share)\s+\w*\s*(exam|test)', 'kb_quick_exam'),
        (r'(profile|password|email|account)', 'kb_profile'),
    ]
    for pattern, intent in rules:
        if re.search(pattern, m): return intent
    # Fallback — check if any entity is present
    ent = extract_entities(msg)
    if ent.get('student_hint'): return 'find_student'
    if ent.get('school_hint'): return 'school_info'
    return "unknown"
