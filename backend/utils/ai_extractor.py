"""
Local PDF MCQ extraction helpers (no external AI dependency).
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

QUESTION_START_RE = re.compile(r"^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[\)\.\-:]\s*(.+)?\s*$", re.IGNORECASE)
OPTION_START_RE = re.compile(r"^\s*[\(\[]?([A-Da-d])[\)\]\.\-:]\s*(.+)?\s*$")
INLINE_OPTION_SPLIT_RE = re.compile(r"(?:^|\s)([A-Da-d])[\)\.\-:]\s*")
ANSWER_RE = re.compile(r"\b(?:answer|ans|correct(?:\s*answer)?)\s*[:\-]?\s*\(?([A-Da-d])\)?\b", re.IGNORECASE)
MARKS_RE = re.compile(r"[\(\[]?\s*(\d{1,2})\s*marks?\s*[\)\]]?", re.IGNORECASE)
SUBJECT_RE = re.compile(r"\bsubject\s*[:\-]\s*([^\n\r]+)", re.IGNORECASE)
CLASS_RE = re.compile(r"\b(?:class|grade|std(?:andard)?)\s*[:\-]?\s*([0-9]{1,2}|[ivx]{1,5})\b", re.IGNORECASE)
CHAPTER_RE = re.compile(r"\b(?:chapter|unit|lesson|topic)\s*[:\-]\s*([^\n\r]+)", re.IGNORECASE)

IMAGE_KEYWORDS = (
    "figure",
    "diagram",
    "graph",
    "table",
    "map",
    "flowchart",
    "match the following",
    "refer to the image",
)

KNOWN_SUBJECTS = (
    "mathematics",
    "physics",
    "chemistry",
    "biology",
    "science",
    "social science",
    "history",
    "geography",
    "english",
    "hindi",
    "computer science",
)


def _compact_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _extract_marks(text: str) -> int:
    match = MARKS_RE.search(text or "")
    if not match:
        return 1
    marks = _safe_int(match.group(1), 1)
    return marks if marks > 0 else 1


def _extract_correct_answer(text: str) -> Optional[str]:
    match = ANSWER_RE.search(text or "")
    if not match:
        return None
    return match.group(1).upper()


def _strip_answer_marker(text: str) -> str:
    return _compact_spaces(ANSWER_RE.sub("", text or ""))


def _has_image_requirement(text: str) -> bool:
    content = (text or "").lower()
    return any(keyword in content for keyword in IMAGE_KEYWORDS)


def _pdf_to_text_pages(pdf_bytes: bytes) -> List[Dict]:
    pages: List[Dict] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page_num in range(len(doc)):
        page = doc[page_num]
        pages.append({
            "page_number": page_num + 1,
            "text": page.get_text("text") or "",
        })
    doc.close()
    return pages


def _split_inline_options(line: str) -> List[Tuple[str, str]]:
    """
    Parse lines like: "A) x B) y C) z D) w"
    """
    matches = list(INLINE_OPTION_SPLIT_RE.finditer(line or ""))
    if len(matches) < 2:
        return []

    options: List[Tuple[str, str]] = []
    for idx, match in enumerate(matches):
        letter = match.group(1).upper()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(line)
        value = _compact_spaces(line[start:end])
        if value:
            options.append((letter, value))
    return options


def _finalize_question(current: Dict, page_number: int, questions: List[Dict]) -> None:
    text = _compact_spaces(" ".join(current.get("text_lines", [])))
    options = current.get("options", {})

    if not text:
        return
    if not any(options.get(k) for k in ("A", "B", "C", "D")):
        # Keep only MCQs; skip non-option blocks.
        return

    correct_answer = _extract_correct_answer(text)
    marks = _extract_marks(text)
    text = _strip_answer_marker(text)

    has_image = _has_image_requirement(text)
    if has_image:
        text = f"{text} [IMAGE_REQUIRED]"

    questions.append({
        "question_number": current.get("question_number"),
        "text": text,
        "option_a": options.get("A") or None,
        "option_b": options.get("B") or None,
        "option_c": options.get("C") or None,
        "option_d": options.get("D") or None,
        "correct_answer": correct_answer,
        "has_image": has_image,
        "marks": marks,
        "source_page": page_number,
    })


def _extract_questions_from_text(page_text: str, page_number: int) -> List[Dict]:
    questions: List[Dict] = []
    current: Optional[Dict] = None

    for raw_line in (page_text or "").splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue

        q_match = QUESTION_START_RE.match(line)
        if q_match:
            if current:
                _finalize_question(current, page_number, questions)

            q_number = _safe_int(q_match.group(1), 0) or None
            q_text = q_match.group(2) or ""
            current = {
                "question_number": q_number,
                "text_lines": [q_text] if q_text else [],
                "options": {"A": "", "B": "", "C": "", "D": ""},
                "last_option": None,
            }
            continue

        if current is None:
            continue

        opt_match = OPTION_START_RE.match(line)
        if opt_match:
            letter = opt_match.group(1).upper()
            option_text = _compact_spaces(opt_match.group(2) or "")
            current["options"][letter] = option_text
            current["last_option"] = letter
            continue

        inline_options = _split_inline_options(line)
        if inline_options:
            for letter, option_text in inline_options:
                current["options"][letter] = option_text
                current["last_option"] = letter
            continue

        # Continuation line: append to last option if one started, else to question text.
        last_option = current.get("last_option")
        if last_option and current["options"].get(last_option):
            current["options"][last_option] = _compact_spaces(f"{current['options'][last_option]} {line}")
        else:
            current["text_lines"].append(line)

    if current:
        _finalize_question(current, page_number, questions)

    return questions


def _dedupe_questions(questions: List[Dict]) -> List[Dict]:
    seen_numbers = set()
    seen_texts = set()
    unique_questions = []

    for q in questions:
        qn = q.get("question_number")
        text_key = (q.get("text") or "").strip().lower()

        if qn and qn in seen_numbers:
            continue
        if (not qn) and text_key and text_key in seen_texts:
            continue

        if qn:
            seen_numbers.add(qn)
        if text_key:
            seen_texts.add(text_key)

        unique_questions.append(q)

    return unique_questions


def _extract_metadata_from_text(first_page_text: str, questions: List[Dict]) -> Dict:
    content = first_page_text or ""
    subject = None
    class_number = None
    chapter = None

    subject_match = SUBJECT_RE.search(content)
    class_match = CLASS_RE.search(content)
    chapter_match = CHAPTER_RE.search(content)

    if subject_match:
        subject = _compact_spaces(subject_match.group(1))
    else:
        lowered = content.lower()
        for candidate in KNOWN_SUBJECTS:
            if candidate in lowered:
                subject = candidate.title()
                break

    if class_match:
        class_number = _compact_spaces(class_match.group(1)).upper()

    if chapter_match:
        chapter = _compact_spaces(chapter_match.group(1))

    numbered = [q.get("question_number") for q in questions if q.get("question_number")]
    total_questions = max(numbered) if numbered else len(questions)

    return {
        "subject": subject,
        "class_number": class_number,
        "chapter": chapter,
        "total_questions": total_questions or None,
    }


def extract_pdf(pdf_bytes: bytes) -> Dict:
    """
    Extract MCQ-like questions from a PDF using local text parsing only.
    """
    pages = _pdf_to_text_pages(pdf_bytes)
    if not pages:
        return {"engine": "local", "metadata": {}, "questions": [], "total_pages": 0}

    all_questions = []
    for page in pages:
        all_questions.extend(_extract_questions_from_text(page["text"], page["page_number"]))

    unique_questions = _dedupe_questions(all_questions)
    metadata = _extract_metadata_from_text(pages[0]["text"], unique_questions)

    return {
        "engine": "local",
        "metadata": metadata,
        "questions": unique_questions,
        "total_pages": len(pages),
    }
