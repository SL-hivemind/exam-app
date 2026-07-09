# backend/run_production.py
# Production entry point. Uses waitress (multi-threaded WSGI server) so
# concurrent students don't queue behind Flask's single-threaded dev server.
from app import app
import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    # 8 worker threads: covers a classroom burst while staying inside the
    # SQLAlchemy pool (pool_size 5 + max_overflow 5 per process).
    threads = int(os.environ.get('WAITRESS_THREADS', 8))

    print(f"Starting server on {host}:{port} ({threads} threads)")

    try:
        from waitress import serve
        serve(app, host=host, port=port, threads=threads)
    except ImportError:
        print("WARNING: waitress not installed — falling back to Flask dev server (NOT for real load). Run: pip install waitress")
        app.run(host=host, port=port, debug=False)
