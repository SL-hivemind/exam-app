# backend/run_production.py
from app import app
import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')  # Support both IPv4 and IPv6

    print(f"Starting server on {host}:{port}")
    print(f"IPv4 Access: http://152.59.200.192:{port}")
    print(f"IPv6 Access: http://[2409:40f0:104:117f:b0b0:cc82:1bc3:d986]:{port}")

    app.run(
        host=host,  # Allow external connections (both IPv4 and IPv6)
        port=port,
        debug=False  # Disable debug in production
    )
