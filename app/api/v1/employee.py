"""
app/api/v1/employee.py
Employee-facing endpoints for managing reports within their governorate.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_employee, require_employee_or_admin
from app.database import get_db
from app.models.comment import ReportComment
from app.models.report import Report, ReportPriority
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.report import (
    ReportDetailResponse,
    ReportResponse,
    ResolveRequest,
    StatusUpdateRequest,
)
from app.services import report_service

router = APIRouter(prefix="/employee", tags=["Employee"])


@router.get("/reports", response_model=list[ReportResponse])
def list_governorate_reports(
    urgent_only: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    employee: User = Depends(require_employee),
):
    """List all reports in the employee's governorate."""
    return (
        db.query(Report)
        .filter(Report.governorate_id == employee.governorate_id)
        .filter(Report.priority == ReportPriority.urgent if urgent_only else True)
        .order_by(Report.created_at.desc())
        .all()
    )


@router.get("/reports/assigned", response_model=list[ReportResponse])
def list_assigned_reports(
    db: Session = Depends(get_db),
    employee: User = Depends(require_employee),
):
    """List reports assigned to the current employee."""
    return (
        db.query(Report)
        .filter(Report.assigned_employee_id == employee.id)
        .order_by(Report.created_at.desc())
        .all()
    )


@router.patch("/reports/{report_id}/status", response_model=ReportResponse)
def update_status(
    report_id: int,
    data: StatusUpdateRequest,
    db: Session = Depends(get_db),
    employee: User = Depends(require_employee),
):
    """Update the status of a report in the employee's governorate."""
    return report_service.employee_update_status(db, employee, report_id, data)


@router.post("/reports/{report_id}/comments", response_model=CommentResponse, status_code=201)
def add_public_comment(
    report_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    employee: User = Depends(require_employee),
):
    """Add a public comment to a report (visible to the citizen)."""
    report_service.get_report_for_employee(db, employee, report_id)
    return report_service.add_comment(db, employee, report_id, data.content, is_internal=False)


@router.get("/reports/{report_id}/internal-notes", response_model=list[CommentResponse])
def get_internal_notes(
    report_id: int,
    db: Session = Depends(get_db),
    staff: User = Depends(require_employee_or_admin),
):
    """Return internal notes for an authorized employee or admin."""

    report = db.get(Report, report_id)
    if report is None:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Report")

    # Employees may only access reports within their governorate.
    if staff.role == UserRole.employee:
        if report.governorate_id != staff.governorate_id:
            from app.core.exceptions import PermissionDeniedError
            raise PermissionDeniedError(
                "This report is outside your governorate."
            )

    return (
        db.query(ReportComment)
        .filter(
            ReportComment.report_id == report_id,
            ReportComment.is_internal.is_(True),
        )
        .order_by(ReportComment.created_at.asc())
        .all()
    )


@router.post("/reports/{report_id}/internal-notes", response_model=CommentResponse, status_code=201)
def add_internal_note(
    report_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    employee: User = Depends(require_employee),
):
    """Add an internal note (not visible to citizens)."""
    report_service.get_report_for_employee(db, employee, report_id)
    return report_service.add_comment(db, employee, report_id, data.content, is_internal=True)


@router.post("/reports/{report_id}/resolve", response_model=ReportResponse)
def resolve_report(
    report_id: int,
    data: ResolveRequest,
    db: Session = Depends(get_db),
    employee: User = Depends(require_employee),
):
    """Resolve a report with a mandatory resolution summary."""
    return report_service.employee_resolve_report(db, employee, report_id, data)
