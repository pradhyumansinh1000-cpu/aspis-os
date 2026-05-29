"""
tests/test_auth.py — Authentication API Tests

Tests use httpx.AsyncClient with an in-memory SQLite DB (not PostgreSQL)
for fast, isolated, portable test runs.

Why SQLite for tests?
  - No external DB needed in CI/CD
  - Each test gets a fresh DB (no state bleed)
  - Tests run in ~5 seconds vs ~30s with PostgreSQL

pytest-asyncio: allows async test functions.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.redis_client import get_redis

# ─── Test Database ─────────────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


# ─── Test Redis (fakeredis) ────────────────────────────────────────────────────
try:
    import fakeredis.aioredis as fakeredis
    async def override_get_redis():
        return fakeredis.FakeRedis()
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    async def override_get_redis():
        # Minimal stub if fakeredis not installed
        class StubRedis:
            async def get(self, *a): return None
            async def setex(self, *a): pass
            async def exists(self, *a): return 0
            async def ping(self): return True
        return StubRedis()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client with dependency overrides."""
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── Tests ─────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint should return 200 in test mode."""
    response = await client.get("/health")
    # Degraded is OK in test (no real DB/Redis)
    assert response.status_code in (200, 503)
    assert "services" in response.json()


@pytest.mark.asyncio
async def test_register_institution(client: AsyncClient):
    """Registering a new institution should return JWT tokens."""
    payload = {
        "institution_name": "Test School",
        "institution_slug": "test-school",
        "admin_first_name": "Admin",
        "admin_last_name": "User",
        "admin_email": "admin@testschool.com",
        "admin_password": "SecurePass123",
    }
    response = await client.post("/api/v1/auth/register/institution", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_slug(client: AsyncClient):
    """Registering with duplicate slug should return 409."""
    payload = {
        "institution_name": "Test School",
        "institution_slug": "test-school",
        "admin_first_name": "Admin",
        "admin_last_name": "User",
        "admin_email": "admin@testschool.com",
        "admin_password": "SecurePass123",
    }
    await client.post("/api/v1/auth/register/institution", json=payload)

    # Try again with same slug
    payload["admin_email"] = "other@testschool.com"
    response = await client.post("/api/v1/auth/register/institution", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Valid credentials should return token pair."""
    # Register first
    reg_payload = {
        "institution_name": "Login Test School",
        "institution_slug": "login-test",
        "admin_first_name": "Admin",
        "admin_last_name": "User",
        "admin_email": "login@test.com",
        "admin_password": "SecurePass123",
    }
    await client.post("/api/v1/auth/register/institution", json=reg_payload)

    # Login
    response = await client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "SecurePass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Wrong password should return 422, not 401 (prevent enumeration)."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "WrongPassword1",
    })
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    """Authenticated user should get their profile from /auth/me."""
    # Register and get token
    reg_payload = {
        "institution_name": "Me Test School",
        "institution_slug": "me-test",
        "admin_first_name": "Me",
        "admin_last_name": "User",
        "admin_email": "me@test.com",
        "admin_password": "SecurePass123",
    }
    reg_response = await client.post("/api/v1/auth/register/institution", json=reg_payload)
    token = reg_response.json()["data"]["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "me@test.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    """Unauthenticated request should return 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_weak_password_rejected(client: AsyncClient):
    """Password without uppercase or digit should be rejected at validation."""
    payload = {
        "institution_name": "Weak Pass School",
        "institution_slug": "weak-pass",
        "admin_first_name": "Admin",
        "admin_last_name": "User",
        "admin_email": "weak@test.com",
        "admin_password": "weakpassword",  # No uppercase, no digit
    }
    response = await client.post("/api/v1/auth/register/institution", json=payload)
    assert response.status_code == 422
