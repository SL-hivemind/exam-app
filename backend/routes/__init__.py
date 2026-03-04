from .analysis_routes import register_analysis_routes
from .repository_routes import register_repository_routes
from .student_routes import register_student_routes
from .pdf_extraction_routes import register_pdf_extraction_routes

__all__ = [
    'register_analysis_routes',
    'register_repository_routes',
    'register_student_routes',
    'register_pdf_extraction_routes',
]
