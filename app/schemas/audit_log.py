"""
app/schemas/audit_log.py
Pydantic schemas for audit logs.
"""

from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int | None
    report_id: int | None
    action: str
    details: str | None
    created_at: datetime
