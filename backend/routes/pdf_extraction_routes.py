"""Routes for AI-powered PDF question extraction."""

from flask import jsonify, request
from models import QuestionRepository, db, generate_short_id
from utils.files import save_image_file, ALLOWED_IMG, allowed_file


def register_pdf_extraction_routes(app, token_required):
    """Register PDF extraction routes on the Flask app."""

    @app.route('/admin/repository/extract-pdf', methods=['POST', 'OPTIONS'])
    @token_required
    def extract_pdf_questions(current_user):
        """
        Accept a PDF file, extract questions using Gemini AI,
        and return structured JSON for frontend review.
        """
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        if current_user.role not in ('admin', 'subject_specialist', 'school_admin'):
            return jsonify({'message': 'forbidden'}), 403

        if 'file' not in request.files:
            return jsonify({'message': 'No PDF file uploaded'}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({'message': 'No selected file'}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'message': 'Only PDF files are accepted'}), 400

        try:
            pdf_bytes = file.read()
            if len(pdf_bytes) > 20 * 1024 * 1024:  # 20MB limit
                return jsonify({'message': 'PDF file too large (max 20MB)'}), 400

            # Import here to avoid startup errors if GEMINI_API_KEY not set
            from utils.ai_extractor import extract_pdf

            result = extract_pdf(pdf_bytes)

            return jsonify({
                'message': f"Extracted {len(result['questions'])} questions from {result['total_pages']} pages",
                'metadata': result['metadata'],
                'questions': result['questions'],
                'total_pages': result['total_pages']
            }), 200

        except ValueError as ve:
            # Gemini API key not set
            return jsonify({
                'message': str(ve),
                'detail': 'Please set GEMINI_API_KEY in your .env file'
            }), 500
        except Exception as e:
            app.logger.exception('PDF extraction failed')
            return jsonify({
                'message': 'PDF extraction failed',
                'detail': str(e)
            }), 500

    @app.route('/admin/repository/bulk-save-ai', methods=['POST', 'OPTIONS'])
    @token_required
    def bulk_save_ai_questions(current_user):
        """
        Accept the reviewed/approved questions from the frontend
        and save them to the QuestionRepository.
        Expects JSON body:
        {
            "metadata": { "subject": "...", "class_number": "...", "chapter": "..." },
            "questions": [
                {
                    "text": "...",
                    "option_a": "...", "option_b": "...",
                    "option_c": "...", "option_d": "...",
                    "correct_answer": "A",
                    "marks": 1,
                    "image_url": "https://..." or null
                }, ...
            ]
        }
        """
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        if current_user.role not in ('admin', 'subject_specialist', 'school_admin'):
            return jsonify({'message': 'forbidden'}), 403

        data = request.get_json(silent=True) or {}
        metadata = data.get('metadata', {})
        questions = data.get('questions', [])

        if not questions:
            return jsonify({'message': 'No questions to save'}), 400

        subject = metadata.get('subject', '').strip()
        class_number = metadata.get('class_number', '').strip()
        chapter = metadata.get('chapter', '').strip() or 'GEN'

        if not subject:
            if current_user.role == 'subject_specialist' and current_user.specialist_subject:
                subject = current_user.specialist_subject
            else:
                return jsonify({'message': 'Subject is required'}), 400

        inserted = 0
        skipped = 0

        try:
            for q_data in questions:
                text = (q_data.get('text') or '').strip()
                if not text:
                    skipped += 1
                    continue

                # Clean up [IMAGE_REQUIRED] tags if image was provided
                image_url = q_data.get('image_url')
                if image_url and '[IMAGE_REQUIRED]' in text:
                    text = text.replace('[IMAGE_REQUIRED]', '').strip()

                q = QuestionRepository(
                    text=text,
                    option_a=q_data.get('option_a'),
                    option_b=q_data.get('option_b'),
                    option_c=q_data.get('option_c'),
                    option_d=q_data.get('option_d'),
                    correct_answer=(q_data.get('correct_answer') or '').strip() or None,
                    marks=int(q_data.get('marks') or 1),
                    subject=subject,
                    class_number=class_number or None,
                    chapter=chapter,
                    image_path=image_url,
                    created_by=current_user.id
                )
                db.session.add(q)
                db.session.flush()  # triggers auto ID generation
                inserted += 1

            db.session.commit()

            return jsonify({
                'message': f'Successfully saved {inserted} questions',
                'inserted': inserted,
                'skipped': skipped
            }), 201

        except Exception as e:
            db.session.rollback()
            app.logger.exception('Bulk save AI questions failed')
            return jsonify({
                'message': 'Save failed',
                'detail': str(e)
            }), 500

    @app.route('/admin/repository/upload-question-image', methods=['POST', 'OPTIONS'])
    @token_required
    def upload_question_image(current_user):
        """
        Upload a question image (snipped diagram) during PDF review.
        Returns the S3 URL for the image.
        """
        if request.method == 'OPTIONS':
            return jsonify({'message': 'ok'}), 200

        if current_user.role not in ('admin', 'subject_specialist', 'school_admin'):
            return jsonify({'message': 'forbidden'}), 403

        if 'file' not in request.files:
            return jsonify({'message': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({'message': 'No selected file'}), 400

        if not allowed_file(file.filename, ALLOWED_IMG):
            return jsonify({'message': 'Invalid image type. Allowed: png, jpg, jpeg, webp'}), 400

        url = save_image_file(file, prefix='pdf_extract')
        if url:
            return jsonify({'message': 'Image uploaded', 'url': url}), 201
        else:
            return jsonify({'message': 'Image upload failed'}), 500
