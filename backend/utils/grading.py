"""Format-aware answer grading.

MCQ answers are single letters compared against `correct_answer`. Primary
(class 1-5) interactive formats store their structure and answer key in
`content_json` and receive JSON answers:

    tap_select / count_tap  content: {"options": [...], "answer": <value>}
                            answer:  {"answer": <value>}
    match_line              content: {"left": [...], "right": [...],
                                      "pairs": {left: right, ...}}
                            answer:  {"pairs": {left: right, ...}}
    drag_drop_bucket        content: {"buckets": [...],
                                      "items": [{"label": x, "bucket": b}, ...]}
                            answer:  {"placements": {label: bucket, ...}}

match_line and drag_drop_bucket award partial credit proportional to the
number of correct pairs/placements (rounded to whole marks).
"""
import json

PRIMARY_FORMATS = ('tap_select', 'count_tap', 'match_line', 'drag_drop_bucket')


def _loads(value, default):
    if isinstance(value, (dict, list)):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return default
    return parsed if isinstance(parsed, type(default)) else default


def grade_answer(question, raw_answer):
    """Return (is_correct, marks_awarded) for a student's saved answer.

    `question` is the exam Question row; format, answer key and content
    resolve through the linked repository question when present.
    """
    src = question.source
    fmt = (getattr(src, 'question_format', None) or 'mcq').lower()
    marks = int(question.marks or 0)

    if fmt not in PRIMARY_FORMATS:
        correct = getattr(src, 'correct_answer', None) or question.correct_answer
        if correct and raw_answer is not None and \
           str(raw_answer).strip().upper() == str(correct).strip().upper():
            return True, marks
        return False, 0

    content = _loads(getattr(src, 'content_json', None), {})
    answer = _loads(raw_answer, {})
    if not content:
        return False, 0

    if fmt in ('tap_select', 'count_tap'):
        expected = content.get('answer')
        got = answer.get('answer') if isinstance(answer, dict) else answer
        ok = expected is not None and got is not None and \
            str(got).strip() == str(expected).strip()
        return ok, marks if ok else 0

    if fmt == 'match_line':
        pairs = content.get('pairs') or {}
        got = answer.get('pairs') or {}
        if not pairs:
            return False, 0
        correct_count = sum(
            1 for left, right in pairs.items()
            if str(got.get(str(left))) == str(right)
        )
        fraction = correct_count / len(pairs)
        return fraction == 1.0, round(fraction * marks)

    if fmt == 'drag_drop_bucket':
        items = [it for it in (content.get('items') or []) if isinstance(it, dict)]
        got = answer.get('placements') or {}
        if not items:
            return False, 0
        correct_count = sum(
            1 for it in items
            if str(got.get(str(it.get('label')))) == str(it.get('bucket'))
        )
        fraction = correct_count / len(items)
        return fraction == 1.0, round(fraction * marks)

    return False, 0


def sanitize_content(question_format, content_json):
    """Strip answer keys from content before sending questions to students."""
    fmt = (question_format or 'mcq').lower()
    if fmt not in PRIMARY_FORMATS or not content_json:
        return None
    content = _loads(content_json, {})
    if not content:
        return None
    content.pop('answer', None)
    content.pop('pairs', None)
    for it in content.get('items') or []:
        if isinstance(it, dict):
            it.pop('bucket', None)
    return content
