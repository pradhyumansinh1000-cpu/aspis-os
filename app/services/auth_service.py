"""
app/services/auth_service.py — Authentication Business Logic

Separation of concerns:
  - API routes handle HTTP (request parsing, response formatting)
  - Services handle business logic (what to do)
  - Models handle data structure
  - Database handles persistence

This makes services independently testable without HTTP context.
"""

import uuid
from datetime import timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError_
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_jti,
    get_token_subject,
    hash_password,
    verify_password,
)
from app.models.institution import Institution
from app.models.user import User, UserRole
from app.redis_client import RedisCache, TokenBlacklist
from app.schemas.auth import (
    InstitutionRegisterRequest,
    LoginRequest,
    TokenResponse,
    UserRegisterRequest,
)

logger = structlog.get_logger()


class AuthService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Institution Registration ───────────────────────────────────────────────
    async def register_institution(
        self,
        data: InstitutionRegisterRequest,
    ) -> tuple[Institution, User, TokenResponse]:
        """
        Onboard a new institution with its first admin user.
        Both are created atomically — if user creation fails, institution rolls back.
        """
        # Check slug uniqueness
        existing = await self.db.execute(
            select(Institution).where(Institution.slug == data.institution_slug)
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Institution slug '{data.institution_slug}' is already taken")

        # Check admin email uniqueness
        existing_user = await self.db.execute(
            select(User).where(User.email == data.admin_email)
        )
        if existing_user.scalar_one_or_none():
            raise ConflictError(f"Email '{data.admin_email}' is already registered")

        # Create institution
        institution = Institution(
            name=data.institution_name,
            slug=data.institution_slug,
            email=data.admin_email,
        )
        self.db.add(institution)
        await self.db.flush()  # Get institution.id without committing

        # Create admin user
        admin = User(
            email=data.admin_email,
            hashed_password=hash_password(data.admin_password),
            first_name=data.admin_first_name,
            last_name=data.admin_last_name,
            role=UserRole.ADMIN,
            institution_id=institution.id,
            is_active=True,
            is_verified=True,  # First admin is auto-verified
        )
        self.db.add(admin)
        await self.db.flush()

        tokens = self._create_tokens(admin)
        logger.info("Institution registered", institution=data.institution_slug, admin=data.admin_email)
        return institution, admin, tokens

    # ── User Registration (by Admin) ───────────────────────────────────────────
    async def register_user(
        self,
        data: UserRegisterRequest,
        institution_id: uuid.UUID,
    ) -> User:
        """Admin creates a new user within their institution."""
        existing = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Email '{data.email}' already exists")

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            role=data.role,
            phone=data.phone,
            institution_id=institution_id,
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()
        logger.info("User registered", email=data.email, role=data.role.value)
        return user

    # ── Login ──────────────────────────────────────────────────────────────────
    async def login(
        self,
        data: LoginRequest,
    ) -> tuple[User, TokenResponse]:
        """Authenticate user and return token pair."""
        result = await self.db.execute(
            select(User).where(
                User.email == data.email,
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()

        # Always run verify_password even if user not found (prevent timing attacks)
        dummy_hash = "$argon2id$v=19$m=65536,t=3,p=4$dummy"
        password_ok = verify_password(
            data.password,
            user.hashed_password if user else dummy_hash,
        )

        if not user or not password_ok:
            raise ValidationError_("Invalid email or password")

        if not user.is_active:
            raise ValidationError_("Account is disabled. Contact your administrator.")

        tokens = self._create_tokens(user)
        logger.info("User logged in", user_id=str(user.id), role=user.role.value)
        return user, tokens

    # ── Token Refresh ──────────────────────────────────────────────────────────
    async def refresh_tokens(
        self,
        refresh_token: str,
        redis_cache: RedisCache,
    ) -> TokenResponse:
        """Issue new access token using a valid refresh token."""
        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise ValidationError_("Invalid or expired refresh token")

        if payload.get("type") != "refresh":
            raise ValidationError_("Invalid token type")

        jti = get_token_jti(payload)
        blacklist = TokenBlacklist(redis_cache._r)
        if await blacklist.is_blacklisted(jti):
            raise ValidationError_("Refresh token has been revoked")

        user_id = get_token_subject(payload)
        result = await self.db.execute(
            select(User).where(User.id == uuid.UUID(user_id))
        )
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise ValidationError_("User not found or inactive")

        # Blacklist old refresh token (rotation)
        ttl = int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds())
        await blacklist.add(jti, ttl)

        return self._create_tokens(user)

    # ── Logout ────────────────────────────────────────────────────────────────
    async def logout(
        self,
        access_jti: str,
        refresh_token: str | None,
        redis_client,
    ) -> None:
        """Revoke both access and refresh tokens."""
        blacklist = TokenBlacklist(redis_client)

        # Blacklist access token
        access_ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        await blacklist.add(access_jti, access_ttl)

        # Blacklist refresh token if provided
        if refresh_token:
            try:
                payload = decode_token(refresh_token)
                refresh_jti = get_token_jti(payload)
                refresh_ttl = int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds())
                await blacklist.add(refresh_jti, refresh_ttl)
            except Exception:
                pass  # Ignore invalid refresh tokens on logout

        logger.info("User logged out", access_jti=access_jti)

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _create_tokens(self, user: User) -> TokenResponse:
        access_token = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            institution_id=str(user.institution_id),
        )
        refresh_token, _ = create_refresh_token(subject=str(user.id))
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
