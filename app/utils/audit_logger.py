"""
app/utils/audit_logger.py — DPDPA 2023 Audit Logging Helper

Helper functions to record data access events in the database audit log.
"""

from typing import Optional
import uuid
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import DPDPAAuditLog

logger = structlog.get_logger()

async def log_dpdpa_action(
    db: AsyncSession,
    institution_id: uuid.UUID,
    actor_id: uuid.UUID,
    action: str,
    target_id: uuid.UUID,
    ip_address: str,
    user_agent: str,
    details: Optional[str] = None
) -> None:
    """
    Log an entry to the DPDPA audit logs table.
    Fails silently on errors but logs them to logging system to prevent request crashes.
    """
    try:
        entry = DPDPAAuditLog(
            institution_id=institution_id,
            actor_id=actor_id,
            action=action,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        db.add(entry)
        await db.flush()  # Write to DB inside the current transaction
        
        logger.info(
            "DPDPA Audit Event Logged",
            action=action,
            actor_id=str(actor_id),
            target_id=str(target_id),
            client_ip=ip_address
        )
    except Exception as e:
        logger.error(
            "Failed to write DPDPA audit log entry to database",
            action=action,
            actor_id=str(actor_id),
            error=str(e)
        )
