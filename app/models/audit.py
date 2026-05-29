"""
app/models/audit.py — DPDPA 2023 Compliance Access Audit Logs

Represents immutable logs storing all personal data access actions by users.
Used to compile safety and consent verification audits.
"""

import uuid
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class DPDPAAuditLog(UUIDMixin, TimestampMixin, Base):
    """
    Immutable ledger of personal data access, modification, and export events.
    """
    __tablename__ = "dpdpa_audit_logs"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    # e.g., "VIEW_HEALTH_RECORD", "UPDATE_ACADEMIC_MARKS", "EXPORT_STUDENT_DATA"

    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    # ID of the student or user record affected

    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[str | None] = mapped_column(Text)

    # Relationships
    institution: Mapped["Institution"] = relationship()
    actor: Mapped["User"] = relationship(foreign_keys=[actor_id])

    def __repr__(self) -> str:
        return f"<DPDPAAuditLog actor={self.actor_id} action={self.action} target={self.target_id}>"
