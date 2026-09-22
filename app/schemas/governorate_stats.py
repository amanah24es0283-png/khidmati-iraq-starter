from pydantic import BaseModel


class GovernorateStatsResponse(BaseModel):
    id: int
    name_ar: str
    name_en: str
    areas_count: int
    total_reports: int
    submitted_reports: int
    under_review_reports: int
    assigned_reports: int
    in_progress_reports: int
    resolved_reports: int
    rejected_reports: int
    cancelled_reports: int
    urgent_reports: int
