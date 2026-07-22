from .analysis_routes import register_analysis_routes
from .repository_routes import register_repository_routes
from .student_routes import register_student_routes
from .public_routes import register_public_routes
from .quick_routes import register_quick_routes
from .bot_routes import register_bot_routes
from .game_routes import register_game_routes

__all__ = [
    'register_analysis_routes',
    'register_repository_routes',
    'register_student_routes',
    'register_public_routes',
    'register_quick_routes',
    'register_bot_routes',
    'register_game_routes',
]
