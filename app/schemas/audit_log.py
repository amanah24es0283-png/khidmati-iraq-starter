"""
app/schemas/audit_log.py
Pydantic schemas for audit logs.
"""

from datetime import datetime

from pydantic import BaseModel


class AuditUserInfo(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    full_name: str
    role: str


class AuditReportInfo(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    reference_number: str


class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int | None
    report_id: int | None
    action: str
    details: str | None
    created_at: datetime
    user: AuditUserInfo | None = None
    report: AuditReportInfo | None = None
