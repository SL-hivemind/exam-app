"""
Seed script: Creates sample public courses, content (exam + material),
and a sample PDF for testing the public portal features.
Run from backend directory: python seed_public_data.py
"""
import os
import sys
import json

# Ensure we can import from the backend root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, PublicCourse, CourseContent

# ── Sample PDF creation (a minimal valid PDF) ──
def create_sample_pdf(filename, title="Sample Exam Paper"):
    """Creates a minimal valid PDF with some text."""
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'portal')
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    if os.path.exists(filepath):
        print(f"  [skip] {filename} already exists")
        return filename

    # Minimal PDF with text
    content_lines = [
        f"  {title}",
        "  ─────────────────────────────",
        "  Q1. What is 2 + 2?",
        "      A) 3   B) 4   C) 5   D) 6",
        "",
        "  Q2. Capital of India?",
        "      A) Mumbai   B) Delhi   C) Chennai   D) Kolkata",
        "",
        "  Q3. Which planet is closest to the Sun?",
        "      A) Venus   B) Mars   C) Mercury   D) Earth",
        "",
        "  Q4. What is H2O?",
        "      A) Oxygen   B) Water   C) Hydrogen   D) Helium",
        "",
        "  Q5. Who wrote 'Hamlet'?",
        "      A) Dickens   B) Shakespeare   C) Tolstoy   D) Austen",
    ]
    text = "\\n".join(content_lines)
    text_length = len(text)

    # Build a minimal PDF manually
    pdf_bytes = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj\n"
    )

    # Build page content stream
    stream_lines = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"]
    for line in content_lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_lines.append(f"({escaped}) '")
    stream_lines.append("ET")
    stream_content = "\n".join(stream_lines)
    stream_bytes = stream_content.encode('utf-8')

    pdf_bytes += f"4 0 obj<</Length {len(stream_bytes)}>>stream\n".encode()
    pdf_bytes += stream_bytes
    pdf_bytes += b"\nendstream\nendobj\n"

    # Cross reference table (simplified)
    pdf_bytes += b"xref\n0 6\n"
    pdf_bytes += b"0000000000 65535 f \n"
    pdf_bytes += b"0000000009 00000 n \n"
    pdf_bytes += b"0000000058 00000 n \n"
    pdf_bytes += b"0000000115 00000 n \n"
    pdf_bytes += b"0000000300 00000 n \n"
    pdf_bytes += b"0000000250 00000 n \n"

    pdf_bytes += b"trailer<</Size 6/Root 1 0 R>>\n"
    pdf_bytes += b"startxref\n0\n%%EOF\n"

    with open(filepath, 'wb') as f:
        f.write(pdf_bytes)
    print(f"  [created] {filename}")
    return filename


with app.app_context():
    print("\n--- Seeding Public Portal Sample Data ---\n")

    # ── 1. Create sample courses ──
    courses_data = [
        {
            'title': 'UPSC Civil Services Prelims 2026',
            'description': 'Complete preparation for UPSC CSE Preliminary Examination. Includes previous year papers, mock tests, and study materials covering GS Paper I & CSAT.',
            'price': 499,
            'status': 'published',
        },
        {
            'title': 'SSC CGL Tier-1 Practice Series',
            'description': 'Staff Selection Commission CGL Tier-1 mock test series with detailed solutions. Covers Quantitative Aptitude, English, GK, and Reasoning.',
            'price': 299,
            'status': 'published',
        },
        {
            'title': 'IBPS PO Banking Exam Prep',
            'description': 'Comprehensive preparation for IBPS PO Prelims & Mains. Banking awareness, numerical ability, reasoning, and English language practice sets.',
            'price': 0,
            'status': 'published',
        },
    ]

    from models import User
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        admin = User(username='admin', role='admin', email='admin@example.com')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print(f"  [created] Admin user 'admin' (password: 'admin123')")
    admin_id = admin.id

    created_courses = []
    for cd in courses_data:
        existing = PublicCourse.query.filter_by(title=cd['title']).first()
        if existing:
            print(f"  [skip] Course '{cd['title']}' already exists (id={existing.id})")
            created_courses.append(existing)
            continue
        course = PublicCourse(
            title=cd['title'],
            description=cd['description'],
            price=cd['price'],
            status=cd['status'],
            created_by=admin_id,
        )
        db.session.add(course)
        db.session.flush()
        created_courses.append(course)
        print(f"  [created] Course '{cd['title']}' (id={course.id})")

    db.session.commit()

    # ── 2. Create sample PDFs and content for each course ──
    answer_key_5q = json.dumps({"1": "B", "2": "B", "3": "C", "4": "B", "5": "B"})

    contents_map = {
        0: [  # UPSC
            {'title': 'GS Paper I - Sample Paper 2025', 'type': 'pdf_exam', 'is_free': True, 'total_q': 5, 'duration': 10},
            {'title': 'CSAT Practice Paper - Set 1', 'type': 'pdf_exam', 'is_free': False, 'total_q': 5, 'duration': 10},
            {'title': 'Indian Polity Quick Notes', 'type': 'pdf_material', 'is_free': True},
            {'title': 'Economy & Budget Summary 2026', 'type': 'pdf_material', 'is_free': False},
        ],
        1: [  # SSC CGL
            {'title': 'Quantitative Aptitude Mock Test 1', 'type': 'pdf_exam', 'is_free': True, 'total_q': 5, 'duration': 10},
            {'title': 'English Comprehension Practice', 'type': 'pdf_exam', 'is_free': False, 'total_q': 5, 'duration': 10},
            {'title': 'Reasoning Shortcuts PDF', 'type': 'pdf_material', 'is_free': True},
        ],
        2: [  # IBPS PO (Free course)
            {'title': 'Banking Awareness Quiz', 'type': 'pdf_exam', 'is_free': True, 'total_q': 5, 'duration': 10},
            {'title': 'Numerical Ability Practice Set', 'type': 'pdf_exam', 'is_free': True, 'total_q': 5, 'duration': 10},
            {'title': 'Banking Terms Glossary', 'type': 'pdf_material', 'is_free': True},
        ],
    }

    for idx, course in enumerate(created_courses):
        contents = contents_map.get(idx, [])
        for order, ct in enumerate(contents):
            existing = CourseContent.query.filter_by(course_id=course.id, title=ct['title']).first()
            if existing:
                print(f"  [skip] Content '{ct['title']}' already exists")
                continue

            # Create a sample PDF file
            safe_name = ct['title'].replace(' ', '_').replace('-', '').replace("'", "")[:40]
            pdf_filename = f"{course.id}_{safe_name}.pdf"
            create_sample_pdf(pdf_filename, ct['title'])

            content = CourseContent(
                course_id=course.id,
                title=ct['title'],
                content_type=ct['type'],
                file_url=pdf_filename,
                is_free=ct.get('is_free', False),
                total_questions=ct.get('total_q'),
                answer_key_json=answer_key_5q if ct['type'] == 'pdf_exam' else None,
                duration_minutes=ct.get('duration', 60),
                order_index=order,
            )
            db.session.add(content)
            print(f"  [created] Content '{ct['title']}' ({ct['type']}, {'free' if ct.get('is_free') else 'premium'})")

    db.session.commit()
    print("\n--- Seeding Complete! ---\n")
    print("Sample answer key for all exams: Q1=B, Q2=B, Q3=C, Q4=B, Q5=B")
    print("You can now browse courses at /public and test the exam interface.\n")
