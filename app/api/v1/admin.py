"""
app/api/v1/admin.py
Admin-only endpoints for user management, report oversight, and dashboard.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.database import get_db
from app.models.category import ServiceCategory
from app.models.report import Report, ReportPriority, ReportStatus
from app.models.user import User, UserRole
from app.schemas.report import (
    AssignRequest,
    PaginatedResponse,
    PriorityUpdateRequest,
    ReportDetailResponse,
    ReportResponse,
)
from app.schemas.user import CreateEmployeeRequest, UserPublic
from app.services import report_service

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Employee management
# ---------------------------------------------------------------------------

@router.post("/employees", response_model=UserPublic, status_code=201)
def create_employee(
    data: CreateEmployeeRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin creates a new employee account."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise ConflictError("An account with this email already exists.")

    from app.models.governorate import Governorate
    governorate = db.get(Governorate, data.governorate_id)
    if not governorate or not governorate.is_active:
        from app.core.exceptions import BadRequestError
        raise BadRequestError("INVALID_GOVERNORATE", "Governorate not found or inactive.")

    employee = User(
        full_name=data.full_name,
        email=data.email,
        phone_number=data.phone_number,
        hashed_password=hash_password(data.password),
        role=UserRole.employee,
        governorate_id=data.governorate_id,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return UserPublic.model_validate(employee)


# ---------------------------------------------------------------------------
# User listing
# ---------------------------------------------------------------------------

@router.get("/users", response_model=list[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return all users."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/status", response_model=UserPublic)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Activate or deactivate a user account."""
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


# ---------------------------------------------------------------------------
# Report management
# ---------------------------------------------------------------------------

@router.get("/reports", response_model=PaginatedResponse)
def list_reports(
    status: ReportStatus | None = Query(default=None),
    priority: ReportPriority | None = Query(default=None),
    category_id: int | None = Query(default=None),
    governorate_id: int | None = Query(default=None),
    assigned_employee_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    urgent_only: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List reports with filtering, search, and pagination."""
    query = db.query(Report)

    if status is not None:
        query = query.filter(Report.status == status)
    if priority is not None:
        query = query.filter(Report.priority == priority)
    if category_id is not None:
        query = query.filter(Report.category_id == category_id)
    if governorate_id is not None:
        query = query.filter(Report.governorate_id == governorate_id)
    if assigned_employee_id is not None:
        query = query.filter(Report.assigned_employee_id == assigned_employee_id)
    if urgent_only:
        query = query.filter(Report.priority == ReportPriority.urgent)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            Report.reference_number.ilike(search_term)
            | Report.title.ilike(search_term)
            | Report.description.ilike(search_term)
        )

    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    items = (
        query.order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        items=[ReportResponse.model_validate(r) for r in items],
    )


@router.patch("/reports/{report_id}/assign", response_model=ReportResponse)
def assign_report(
    report_id: int,
    data: AssignRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Assign an employee to a report."""
    return report_service.admin_assign_report(db, admin, report_id, data)


@router.patch("/reports/{report_id}/priority", response_model=ReportResponse)
def update_priority(
    report_id: int,
    data: PriorityUpdateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update the priority of a report."""
    return report_service.admin_update_priority(db, report_id, data)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return high-level statistics for the admin dashboard."""
    total_reports = db.query(func.count(Report.id)).scalar() or 0

    resolved_reports = (
        db.query(func.count(Report.id))
        .filter(Report.status == ReportStatus.resolved)
        .scalar()
        or 0
    )

    open_reports = total_reports - resolved_reports

    status_rows = (
        db.query(Report.status, func.count(Report.id))
        .group_by(Report.status)
        .all()
    )
    priority_rows = (
        db.query(Report.priority, func.count(Report.id))
        .group_by(Report.priority)
        .all()
    )
    category_rows = (
        db.query(ServiceCategory.name_ar, func.count(Report.id))
        .join(ServiceCategory, Report.category_id == ServiceCategory.id)
        .group_by(ServiceCategory.id, ServiceCategory.name_ar)
        .all()
    )

    return {
        "total_reports": total_reports,
        "open_reports": open_reports,
        "resolved_reports": resolved_reports,
        "urgent_reports": db.query(func.count(Report.id)).filter(Report.priority == ReportPriority.urgent).scalar() or 0,
        "reports_by_status": {status.value: count for status, count in status_rows},
        "reports_by_priority": {priority.value: count for priority, count in priority_rows},
        "reports_by_category": {name: count for name, count in category_rows},
    }
