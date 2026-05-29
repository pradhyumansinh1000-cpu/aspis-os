"""
app/core/middleware.py — CORS, Request Logging, Rate Limiting

Middleware order matters in FastAPI/Starlette:
  Added LAST → executed FIRST (stack model)
  So: CORS → Logging → Rate Limiting → Route Handler
"""

import time
import uuid
from typing import Callable

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = structlog.get_logger()


# ─── Rate Limiter ─────────────────────────────────────────────────────────────
# Uses Redis as the backend for distributed rate limiting across workers
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
)


# ─── Request Logging Middleware ───────────────────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every request with: method, path, status code, duration.
    Assigns a unique request_id for distributed tracing.
    The request_id is returned in response headers for client-side correlation.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.perf_counter()

        # Bind request context to all log lines within this request
        with structlog.contextvars.bound_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        ):
            logger.info("Request started")
            
            try:
                response = await call_next(request)
            except Exception as exc:
                logger.error("Request failed with exception", error=str(exc))
                raise

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            logger.info(
                "Request completed",
                status_code=response.status_code,
                duration_ms=duration_ms,
            )

        # Add tracing headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        return response


# ─── Security Headers Middleware ──────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to every response.
    These don't stop server-side attacks but protect browser clients.
    """

    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        for header, value in self.SECURITY_HEADERS.items():
            response.headers[header] = value
        return response


# ─── Registration ─────────────────────────────────────────────────────────────
def register_middleware(app: FastAPI) -> None:
    """
    Register all middleware on the FastAPI application.
    Order here is reverse of execution order.
    """
    # 1. CORS — must be first (outermost) to handle preflight requests
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-Response-Time"],
    )

    # 2. Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. Request logging
    app.add_middleware(RequestLoggingMiddleware)

    # 4. Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
