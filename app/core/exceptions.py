"""
app/core/exceptions.py — Custom HTTP Exceptions & Global Handler

Centralizing exceptions means:
  - Consistent error response format across all endpoints
  - Easy to add logging/monitoring to specific error types
  - Frontend can reliably parse error shapes
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError


# ─── Custom Exception Classes ─────────────────────────────────────────────────
class AppException(Exception):
    """Base class for all application-level exceptions."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        code: str = "INTERNAL_ERROR",
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: str | int):
        super().__init__(
            message=f"{resource} with id '{identifier}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
        )


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
        )


class ValidationError_(AppException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
        )


class AIServiceError(AppException):
    """Raised when Ollama/Nemotron/Whisper service is unavailable."""
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"AI service '{service}' error: {message}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="AI_SERVICE_ERROR",
        )


class FileProcessingError(AppException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="FILE_PROCESSING_ERROR",
        )


# ─── Standard Error Response Shape ────────────────────────────────────────────
def error_response(
    status_code: int,
    message: str,
    code: str = "ERROR",
    details: list | None = None,
) -> JSONResponse:
    """
    Standardized error envelope:
    {
      "success": false,
      "error": {
        "code": "NOT_FOUND",
        "message": "Student with id '...' not found",
        "details": [...]
      }
    }
    """
    body: dict = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


# ─── Global Exception Handlers ────────────────────────────────────────────────
def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return error_response(exc.status_code, exc.message, exc.code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Pydantic validation errors → readable messages."""
        details = [
            {
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Request validation failed",
            code="VALIDATION_ERROR",
            details=details,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all: never expose internal error details in production."""
        import structlog
        logger = structlog.get_logger()
        logger.error("Unhandled exception", error=str(exc), path=request.url.path)
        return error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An internal error occurred. Please try again.",
            code="INTERNAL_ERROR",
        )
