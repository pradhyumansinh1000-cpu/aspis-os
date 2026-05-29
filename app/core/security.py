"""
app/core/security.py — JWT Authentication & Password Security

Security decisions:
  - Argon2 (not bcrypt): More memory-hard → harder to GPU-brute-force
  - Short-lived access tokens (15min): Limits damage if stolen
  - Long-lived refresh tokens (7d) + Redis blacklist: Balance UX with security
  - JTI (JWT ID) in every token: Enables precise revocation
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# ─── Password Hashing ─────────────────────────────────────────────────────────
# schemes=["argon2"]: Use Argon2id (the winner of the Password Hashing Competition)
# deprecated="auto": Automatically re-hash old bcrypt passwords if encountered
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its Argon2 hash. Constant-time comparison."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT Token Generation ─────────────────────────────────────────────────────
def create_access_token(
    subject: str,
    role: str,
    institution_id: str,
    extra_data: dict[str, Any] | None = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Payload includes:
      - sub: User UUID (standard JWT claim)
      - role: User role (for RBAC without DB lookup on every request)
      - institution_id: Tenant isolation
      - jti: Unique token ID (for blacklisting)
      - exp/iat: Expiry and issuance times
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "institution_id": institution_id,
        "jti": str(uuid.uuid4()),  # Unique token ID
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_data:
        payload.update(extra_data)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> tuple[str, str]:
    """
    Create a long-lived refresh token.
    Returns: (token_string, jti) — caller must store jti for revocation.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())

    payload = {
        "sub": subject,
        "jti": jti,
        "iat": now,
        "exp": expire,
        "type": "refresh",
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.
    Raises JWTError if invalid, expired, or tampered.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise JWTError(f"Token validation failed: {e}") from e


# ─── Token Data Extraction ────────────────────────────────────────────────────
def get_token_subject(payload: dict[str, Any]) -> str:
    """Extract user UUID from token payload."""
    sub = payload.get("sub")
    if not sub:
        raise ValueError("Token missing 'sub' claim")
    return sub


def get_token_jti(payload: dict[str, Any]) -> str:
    """Extract JTI for blacklist checking."""
    jti = payload.get("jti")
    if not jti:
        raise ValueError("Token missing 'jti' claim")
    return jti
