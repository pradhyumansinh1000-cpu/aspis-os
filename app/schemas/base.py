"""
app/schemas/base.py — Shared Response Envelopes & Pagination

Every API response is wrapped in a standard envelope:
  Success: {"success": true, "data": {...}}
  Paginated: {"success": true, "data": [...], "pagination": {...}}
  Error:   {"success": false, "error": {...}}

This makes frontend parsing predictable and simplifies SDK generation.
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    """
    Base for all schemas.
    model_config with from_attributes=True allows constructing
    schemas directly from SQLAlchemy ORM objects (no manual .dict() calls).
    """
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class SuccessResponse(BaseSchema, Generic[T]):
    """Generic success envelope."""
    success: bool = True
    data: T


class PaginationMeta(BaseSchema):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseSchema, Generic[T]):
    """Generic paginated envelope."""
    success: bool = True
    data: list[T]
    pagination: PaginationMeta


class MessageResponse(BaseSchema):
    """Simple message response for operations that don't return data."""
    success: bool = True
    message: str
