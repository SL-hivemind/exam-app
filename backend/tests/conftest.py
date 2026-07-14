"""Safety net for the whole test suite: force every test onto an isolated
in-memory sqlite engine so tests can NEVER touch the real database.

Importing `app` creates the real MySQL engine immediately (app.py calls
db.create_all() at import time), so setting SQLALCHEMY_DATABASE_URI inside a
test fixture has no effect — the engine is already bound. Without the swap
below, tests would read/write the production database, and db.drop_all() in
a teardown would erase every production table.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app import app
from models import db


@pytest.fixture(scope="session", autouse=True)
def isolate_database():
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite://"

    with app.app_context():
        real_engine = db.engines.get(None)
        # StaticPool keeps one shared connection so every session sees the
        # same :memory: database for the lifetime of the test run.
        db.engines[None] = create_engine(
            "sqlite://",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        if real_engine is not None:
            real_engine.dispose()

        # Hard guard: abort the entire run if anything but sqlite is bound.
        if db.engine.url.drivername != "sqlite":
            pytest.exit(
                "SAFETY ABORT: tests are not running on the isolated sqlite "
                "engine — refusing to touch a real database.",
                returncode=1,
            )

    yield
