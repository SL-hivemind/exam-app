"""
AI-powered PDF question extraction using Google Gemini.
Converts PDF pages to images via PyMuPDF, sends them to Gemini Vision,
and returns structured JSON of extracted MCQ questions.
"""

import os
import json
import logging
import fitz  # PyMuPDF
import google.generativeai as genai

logger = logging.getLogger(__name__)

# --------------- CONFIG ---------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

EXTRACTION_PROMPT = """You are an expert exam question extractor. Analyze this exam paper image and extract ALL multiple-choice questions (MCQs) from it.

**CRITICAL RULES:**
1. Return ONLY a valid JSON array — no extra text, no markdown fences, no explanation.
2. Each question object MUST have these fields:
   - "question_number": integer (the question number as it appears)
   - "text": the full question text. Use LaTeX notation for ALL mathematical expressions (e.g., \\sqrt{x}, x^2, \\frac{a}{b}, \\pi, \\int, \\sum, etc.)
   - "option_a": text of option A (with LaTeX for math)
   - "option_b": text of option B (with LaTeX for math)
   - "option_c": text of option C (with LaTeX for math)
   - "option_d": text of option D (with LaTeX for math)
   - "correct_answer": one of "A", "B", "C", "D" if marked/visible, otherwise null
   - "has_image": boolean — set to true ONLY if the question contains a diagram, graph, figure, table, or "Match the Following" format that CANNOT be represented as plain text + LaTeX
   - "marks": integer marks for the question if visible, otherwise 1

3. For "Match the Following" or table-based questions: if the table is simple enough, represent it in the "text" field as structured text. If it's too complex, set "has_image" to true.
4. For Statement & Reason questions: include both statements in the "text" field clearly labeled.
5. If the image is a continuation of a previous page, still extract whatever questions are visible.
6. If NO questions are found on this page, return an empty array: []

**IMPORTANT:** Return ONLY the JSON array. No other text."""

METADATA_PROMPT = """You are an expert exam question analyst. Look at this exam paper image and extract the following metadata if visible:

Return ONLY a valid JSON object with these fields:
- "subject": the subject name (e.g., "Mathematics", "Physics") or null if not visible
- "class_number": the class/grade (e.g., "10", "12") or null if not visible
- "chapter": the chapter name or topic area if visible, otherwise null
- "total_questions": estimated total number of questions if visible, otherwise null

Return ONLY the JSON object. No other text."""


def configure_gemini():
    """Configure the Gemini API with the stored key."""
    key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("GEMINI_API_KEY not set in environment variables")
    genai.configure(api_key=key)


def pdf_to_images(pdf_bytes):
    """
    Convert PDF bytes to a list of PNG image byte arrays (one per page).
    Uses PyMuPDF (fitz) — no external system deps needed.
    """
    images = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at 2x resolution for better OCR accuracy
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        images.append({
            "page_number": page_num + 1,
            "image_bytes": img_bytes,
            "width": pix.width,
            "height": pix.height
        })
    doc.close()
    return images


def extract_questions_from_image(image_bytes):
    """
    Send a single page image to Gemini and get structured questions back.
    Returns a list of question dicts.
    """
    configure_gemini()
    model = genai.GenerativeModel("gemini-1.5-flash")

    response = model.generate_content(
        [
            EXTRACTION_PROMPT,
            {"mime_type": "image/png", "data": image_bytes}
        ],
        generation_config=genai.GenerationConfig(
            temperature=0.1,  # Low temp for accuracy
            max_output_tokens=8192,
        )
    )

    raw_text = response.text.strip()

    # Clean up common AI formatting issues
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()

    try:
        questions = json.loads(raw_text)
        if not isinstance(questions, list):
            questions = [questions]
        return questions
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        logger.error(f"Raw response: {raw_text[:500]}")
        return []


def extract_metadata_from_image(image_bytes):
    """
    Extract paper metadata (subject, class, chapter) from the first page.
    """
    configure_gemini()
    model = genai.GenerativeModel("gemini-1.5-flash")

    response = model.generate_content(
        [
            METADATA_PROMPT,
            {"mime_type": "image/png", "data": image_bytes}
        ],
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=1024,
        )
    )

    raw_text = response.text.strip()

    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"subject": None, "class_number": None, "chapter": None}


def extract_pdf(pdf_bytes):
    """
    Full pipeline: PDF bytes → page images → Gemini extraction → structured result.
    Returns dict with 'metadata' and 'questions' keys.
    """
    images = pdf_to_images(pdf_bytes)
    if not images:
        return {"metadata": {}, "questions": [], "total_pages": 0}

    # Extract metadata from first page
    metadata = extract_metadata_from_image(images[0]["image_bytes"])

    # Extract questions from all pages
    all_questions = []
    for img_data in images:
        page_questions = extract_questions_from_image(img_data["image_bytes"])
        for q in page_questions:
            q["source_page"] = img_data["page_number"]
            # Mark questions needing image upload
            if q.get("has_image"):
                q["text"] = q.get("text", "") + " [IMAGE_REQUIRED]"
        all_questions.extend(page_questions)

    # De-duplicate by question_number (in case page boundaries cause repeats)
    seen_numbers = set()
    unique_questions = []
    for q in all_questions:
        qn = q.get("question_number")
        if qn and qn in seen_numbers:
            continue
        if qn:
            seen_numbers.add(qn)
        unique_questions.append(q)

    return {
        "metadata": metadata,
        "questions": unique_questions,
        "total_pages": len(images)
    }
