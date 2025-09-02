#!/usr/bin/env python3
"""
Utility script to generate secure secret keys for Flask and JWT
"""

import secrets
import string

def generate_secret_key(length=32):
    """Generate a cryptographically secure random secret key"""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*()_+-='
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_jwt_secret_key(length=64):
    """Generate a cryptographically secure JWT secret key"""
    return secrets.token_urlsafe(length)

if __name__ == "__main__":
    print("Generated Secret Keys:")
    print("=" * 50)
    print(f"SECRET_KEY: {generate_secret_key()}")
    print(f"JWT_SECRET_KEY: {generate_jwt_secret_key()}")
    print("\nCopy these values to your environment variables or config file.")
    print("Example usage:")
    print("export SECRET_KEY='your-generated-secret-key'")
    print("export JWT_SECRET_KEY='your-generated-jwt-secret-key'")
