# Exam-app changes to deploy (repo: slexams-slpl/exam-app)

Two small, **additive, read-only** changes to the Flask backend. They do nothing
until the env vars are set on Render, and always fall back to the original behaviour
if the RAG service is unreachable. No database, schema, frontend, or existing intent
is touched.

## 1. `backend/routes/bot_routes.py`

**a) After the `from routes.bot_engine import (...)` block, add:**

RAG_API_URL = https://chat.theslpl.in/chat
- RAG_API_KEY = 4f1679abddfe5cd0e73da877465b7febaa0bc2fc3d0cedc4479d0cad68c22d13

```python
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
```

**b) In `bot_chat`, replace the final `else:` branch** (the "I didn't quite get that" one) with:

```python
        else:
            # Rule-based bot didn't recognise the question — try the RAG service
            # (textbook Q&A). Falls back to the original message if RAG is
            # disabled, slow, or has no answer. No DB writes, read-only.
            school_name = None
            if sid:
                _school = School.query.get(sid)
                school_name = getattr(_school, "name", None) if _school else None
            rag_answer = _ask_rag(message, school_name)
            if rag_answer:
                resp, intent = rag_answer, "rag"
            else:
                resp = "🤔 I didn't quite get that. Try:\n\n• \"Dashboard summary\"\n• \"Tell me about school [name]\"\n• \"Find student [name]\"\n• \"Show Rahul's scores\"\n• \"Check questions for errors\""
```

## 2. `backend/requirements.txt`

Add one line (alphabetically, before `SQLAlchemy`):

```
requests==2.32.3
```

## 3. Render (sl-exams backend service) env vars, then redeploy

```
RAG_API_URL = https://chat.theslpl.in/chat
RAG_API_KEY = <the key from ~/server-docker/rag/.env on the server>
```

After redeploy, log in as admin and ask a textbook question the rule bot doesn't
recognise → it returns a RAG answer. Stop the rag-api container and ask again →
it falls back to the canned message with no error shown.
