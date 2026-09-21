"""Schemas for continuous governorate monitoring."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GovernorateMonitoringUpdate(BaseModel):
    is_active: bool = True
    reason: str | None = None
    notes: str | None = None


class GovernorateMonitoringResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    governorate_id: int
    is_active: bool
    reason: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class GovernorateMonitoringItem(BaseModel):
    governorate_id: int
    governorate_name_ar: str
    governorate_name_en: str
    is_active: bool
    reason: str | None
    notes: str | None
    updated_at: datetime
