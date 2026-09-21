from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int | None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime
