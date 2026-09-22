"""
app/api/v1/admin.py
Admin-only endpoints for user management, report oversight, and dashboard.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.database import get_db
from app.models.category import ServiceCategory
from app.models.audit_log import AuditLog
from app.models.report import Report, ReportPriority, ReportStatus
from app.models.user import User, UserRole
from app.schemas.governorate_stats import GovernorateStatsResponse
from app.schemas.audit_log import AuditLogResponse
from app.schemas.report import (
    AssignRequest,
    PaginatedResponse,
    PriorityUpdateRequest,
    ReportDetailResponse,
    ReportResponse,
    StatusUpdateRequest,
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


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
def get_report_details(
    report_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return complete report details for admin dashboard."""
    report = (
        db.query(Report)
        .options(
            joinedload(Report.citizen),
            joinedload(Report.assigned_employee),
            joinedload(Report.category),
            joinedload(Report.governorate),
            joinedload(Report.area),
        )
        .filter(Report.id == report_id)
        .first()
    )

    if report is None:
        raise NotFoundError("Report")

    return ReportDetailResponse.model_validate(report)


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
    admin: User = Depends(require_admin),
):
    """Update the priority of a report."""
    return report_service.admin_update_priority(db, admin, report_id, data)



@router.patch("/reports/{report_id}/status", response_model=ReportResponse)
def update_report_status(
    report_id: int,
    data: StatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin updates the status of a report."""
    return report_service.admin_update_status(db, admin, report_id, data)

# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------

@router.get("/audit-logs")
def list_audit_logs(
    user_id: int | None = Query(default=None),
    report_id: int | None = Query(default=None),
    action: str | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return audit logs with filtering and pagination."""
    query = (
        db.query(AuditLog)
        .options(
            joinedload(AuditLog.user),
            joinedload(AuditLog.report),
        )
    )

    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)

    if report_id is not None:
        query = query.filter(AuditLog.report_id == report_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if created_from is not None:
        query = query.filter(AuditLog.created_at >= created_from)

    if created_to is not None:
        query = query.filter(AuditLog.created_at <= created_to)

    total = query.count()
    total_pages = (total + page_size - 1) // page_size

    items = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "items": [AuditLogResponse.model_validate(log) for log in items],
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/status-trends")
def dashboard_status_trends(
    days: int = Query(default=7, ge=1, le=31),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return daily report counts grouped by status."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today_start - timedelta(days=days - 1)

    data = []

    for offset in range(days):
        day_start = start_date + timedelta(days=offset)
        day_end = day_start + timedelta(days=1)

        rows = (
            db.query(Report.status, func.count(Report.id))
            .filter(
                Report.created_at >= day_start,
                Report.created_at < day_end,
            )
            .group_by(Report.status)
            .all()
        )

        counts = {status.value: count for status, count in rows}

        data.append(
            {
                "date": day_start.date().isoformat(),
                "submitted": counts.get("submitted", 0),
                "under_review": counts.get("under_review", 0),
                "assigned": counts.get("assigned", 0),
                "in_progress": counts.get("in_progress", 0),
                "resolved": counts.get("resolved", 0),
                "rejected": counts.get("rejected", 0),
                "cancelled": counts.get("cancelled", 0),
            }
        )

    return {
        "days": days,
        "start_date": start_date.date().isoformat(),
        "end_date": today_start.date().isoformat(),
        "data": data,
    }


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

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    reports_today = (
        db.query(func.count(Report.id))
        .filter(Report.created_at >= today_start)
        .scalar()
        or 0
    )

    reports_this_week = (
        db.query(func.count(Report.id))
        .filter(Report.created_at >= week_start)
        .scalar()
        or 0
    )

    reports_this_month = (
        db.query(func.count(Report.id))
        .filter(Report.created_at >= month_start)
        .scalar()
        or 0
    )

    resolution_rate = (
        round((resolved_reports / total_reports) * 100, 2)
        if total_reports
        else 0
    )

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
        "reports_today": reports_today,
        "reports_this_week": reports_this_week,
        "reports_this_month": reports_this_month,
        "resolution_rate": resolution_rate,
        "urgent_reports": db.query(func.count(Report.id)).filter(Report.priority == ReportPriority.urgent).scalar() or 0,
        "reports_by_status": {status.value: count for status, count in status_rows},
        "reports_by_priority": {priority.value: count for priority, count in priority_rows},
        "reports_by_category": {name: count for name, count in category_rows},
    }


# ---------------------------------------------------------------------------
# Dashboard trends
# ---------------------------------------------------------------------------

@router.get("/dashboard/trends")
def dashboard_trends(
    days: int = Query(default=7, ge=1, le=31),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return daily report counts for the requested number of days."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today_start - timedelta(days=days - 1)

    trends = []

    for offset in range(days):
        day_start = start_date + timedelta(days=offset)
        day_end = day_start + timedelta(days=1)

        count = (
            db.query(func.count(Report.id))
            .filter(
                Report.created_at >= day_start,
                Report.created_at < day_end,
            )
            .scalar()
            or 0
        )

        trends.append(
            {
                "date": day_start.date().isoformat(),
                "count": count,
            }
        )

    return {
        "days": days,
        "start_date": start_date.date().isoformat(),
        "end_date": today_start.date().isoformat(),
        "data": trends,
    }

# ---------------------------------------------------------------------------

# Governorate statistics for the admin dashboard
@router.get(
    "/dashboard/governorates",
    response_model=list[GovernorateStatsResponse],
)
def governorate_statistics(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    governorates = (
        db.query(Governorate)
        .filter(Governorate.is_active.is_(True))
        .order_by(Governorate.name_ar.asc())
        .all()
    )

    reports = db.query(Report).all()

    stats_by_governorate = {
        governorate.id: {
            "areas_count": sum(
                1 for area in governorate.areas if area.is_active
            ),
            "total_reports": 0,
            "submitted_reports": 0,
            "under_review_reports": 0,
            "assigned_reports": 0,
            "in_progress_reports": 0,
            "resolved_reports": 0,
            "rejected_reports": 0,
            "cancelled_reports": 0,
            "urgent_reports": 0,
        }
        for governorate in governorates
    }

    for report in reports:
        stats = stats_by_governorate.get(report.governorate_id)
        if stats is None:
            continue

        stats["total_reports"] += 1

        status_key = f"{report.status.value}_reports"
        if status_key in stats:
            stats[status_key] += 1

        if report.priority == ReportPriority.urgent:
            stats["urgent_reports"] += 1

    return [
        GovernorateStatsResponse(
            id=governorate.id,
            name_ar=governorate.name_ar,
            name_en=governorate.name_en,
            **stats_by_governorate[governorate.id],
        )
        for governorate in governorates
    ]

# Governorate continuous monitoring
# ---------------------------------------------------------------------------

from app.models.governorate import Governorate
from app.models.governorate_monitoring import GovernorateMonitoring
from app.schemas.governorate_monitoring import (
    GovernorateMonitoringItem,
    GovernorateMonitoringUpdate,
)


@router.get(
    "/governorates/monitoring",
    response_model=list[GovernorateMonitoringItem],
)
def list_governorate_monitoring(
    active_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List governorates configured for continuous monitoring."""
    query = (
        db.query(GovernorateMonitoring)
        .join(Governorate)
        .order_by(GovernorateMonitoring.updated_at.desc())
    )

    if active_only:
        query = query.filter(GovernorateMonitoring.is_active.is_(True))

    items = query.all()

    return [
        GovernorateMonitoringItem(
            governorate_id=item.governorate_id,
            governorate_name_ar=item.governorate.name_ar,
            governorate_name_en=item.governorate.name_en,
            is_active=item.is_active,
            reason=item.reason,
            notes=item.notes,
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.put(
    "/governorates/{governorate_id}/monitoring",
    response_model=GovernorateMonitoringItem,
)
def update_governorate_monitoring(
    governorate_id: int,
    data: GovernorateMonitoringUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create or update continuous monitoring for a governorate."""
    governorate = db.get(Governorate, governorate_id)

    if governorate is None:
        raise NotFoundError("Governorate")

    monitoring = (
        db.query(GovernorateMonitoring)
        .filter(GovernorateMonitoring.governorate_id == governorate_id)
        .first()
    )

    if monitoring is None:
        monitoring = GovernorateMonitoring(
            governorate_id=governorate_id,
            is_active=data.is_active,
            reason=data.reason,
            notes=data.notes,
        )
        db.add(monitoring)
    else:
        monitoring.is_active = data.is_active
        monitoring.reason = data.reason
        monitoring.notes = data.notes

    db.commit()
    db.refresh(monitoring)

    return GovernorateMonitoringItem(
        governorate_id=governorate.id,
        governorate_name_ar=governorate.name_ar,
        governorate_name_en=governorate.name_en,
        is_active=monitoring.is_active,
        reason=monitoring.reason,
        notes=monitoring.notes,
        updated_at=monitoring.updated_at,
    )


@router.delete(
    "/governorates/{governorate_id}/monitoring",
    status_code=204,
)
def disable_governorate_monitoring(
    governorate_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Disable continuous monitoring for a governorate."""
    monitoring = (
        db.query(GovernorateMonitoring)
        .filter(GovernorateMonitoring.governorate_id == governorate_id)
        .first()
    )

    if monitoring is None:
        raise NotFoundError("Governorate monitoring")

    monitoring.is_active = False
    db.commit()
