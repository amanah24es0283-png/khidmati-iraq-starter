"""
app/services/report_service.py
Core business logic for report management.
All status-transition rules live in this file.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestError,
    InvalidStatusTransitionError,
    NotFoundError,
    PermissionDeniedError,
)
from app.models.area import Area
from app.models.category import ServiceCategory
from app.models.comment import ReportComment
from app.models.governorate import Governorate
from app.models.report import Report, ReportPriority, ReportStatus, generate_reference_number
from app.models.status_history import ReportStatusHistory
from app.models.user import User, UserRole
from app.schemas.report import (
    AssignRequest,
    PriorityUpdateRequest,
    ReportCreate,
    ReportUpdate,
    ResolveRequest,
    StatusUpdateRequest,
)

# ---------------------------------------------------------------------------
# Valid status transitions
# ---------------------------------------------------------------------------

EMPLOYEE_TRANSITIONS: dict[ReportStatus, list[ReportStatus]] = {
    ReportStatus.submitted: [ReportStatus.under_review, ReportStatus.rejected],
    ReportStatus.under_review: [ReportStatus.assigned, ReportStatus.rejected],
    ReportStatus.assigned: [ReportStatus.in_progress, ReportStatus.under_review],
    ReportStatus.in_progress: [ReportStatus.resolved, ReportStatus.assigned],
    ReportStatus.resolved: [],
    ReportStatus.rejected: [],
    ReportStatus.cancelled: [],
}


def validate_transition(from_status: ReportStatus, to_status: ReportStatus) -> None:
    allowed = EMPLOYEE_TRANSITIONS.get(from_status, [])
    if to_status not in allowed:
        raise InvalidStatusTransitionError(from_status.value, to_status.value)


# Helper: record a status change in history
# ---------------------------------------------------------------------------

def record_status_change(
    db: Session,
    report: Report,
    new_status: ReportStatus,
    changed_by: User,
    note: str | None = None,
) -> None:
    """
    Update report.status and append a ReportStatusHistory row.
    Does NOT commit – the caller is responsible for the transaction.
    """
    history = ReportStatusHistory(
        report_id=report.id,
        previous_status=report.status.value if report.status else None,
        new_status=new_status.value,
        changed_by_id=changed_by.id,
        note=note,
    )
    report.status = new_status
    db.add(history)


# ---------------------------------------------------------------------------
# Helper: validate location consistency
# ---------------------------------------------------------------------------

def validate_location(
    db: Session,
    governorate_id: int,
    area_id: int,
    category_id: int,
) -> tuple[Governorate, Area, ServiceCategory]:
    """
    Ensure the governorate, area, and category exist, are active,
    and that the area belongs to the governorate.
    """
    governorate = db.get(Governorate, governorate_id)
    if not governorate or not governorate.is_active:
        raise BadRequestError("INVALID_GOVERNORATE", "Governorate not found or inactive.")

    area = db.get(Area, area_id)
    if not area or not area.is_active:
        raise BadRequestError("INVALID_AREA", "Area not found or inactive.")
    if area.governorate_id != governorate_id:
        raise BadRequestError(
        "INVALID_AREA",
        "The selected area does not belong to the selected governorate.",
    )
    category = db.get(ServiceCategory, category_id)
    if not category or not category.is_active:
        raise BadRequestError("INVALID_CATEGORY", "Category not found or inactive.")

    return governorate, area, category


# ---------------------------------------------------------------------------
# Citizen actions
# ---------------------------------------------------------------------------

def create_report(db: Session, citizen: User, data: ReportCreate) -> Report:
    """Create a new report submitted by a citizen."""
    validate_location(db, data.governorate_id, data.area_id, data.category_id)

    year = datetime.now(timezone.utc).year
    ref = generate_reference_number(db, year)

    report = Report(
        reference_number=ref,
        citizen_id=citizen.id,
        category_id=data.category_id,
        governorate_id=data.governorate_id,
        area_id=data.area_id,
        title=data.title,
        description=data.description,
        address_details=data.address_details,
        status=ReportStatus.submitted,
        priority=ReportPriority.medium,
    )
    db.add(report)
    db.flush()  # Get report.id before recording history.

    record_status_change(
    db,
    report,
    ReportStatus.submitted,
    citizen,
    note="Report submitted.",
)
    db.commit()
    db.refresh(report)
    return report


def get_citizen_report(db: Session, citizen: User, report_id: int) -> Report:
    """
    Return a report.
    Citizens can only view their own reports.
    """
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report")

    if report.citizen_id != citizen.id:
        raise PermissionDeniedError("You can only access your own reports.")
    return report


def update_citizen_report(db: Session, citizen: User, report_id: int, data: ReportUpdate) -> Report:
    """
    Citizens can update a report only while it is in 'submitted' status.
    They cannot change status, priority, or assigned employee.
    """
    report = get_citizen_report(db, citizen, report_id)

    if report.status != ReportStatus.submitted:
        raise BadRequestError(
            "REPORT_NOT_EDITABLE",
            "You can only edit a report while it is in 'submitted' status.",
        )

    if data.category_id is not None or data.area_id is not None:
        # Re-validate location if either location field changed.
        new_cat = data.category_id if data.category_id else report.category_id
        new_area = data.area_id if data.area_id else report.area_id
        validate_location(db, report.governorate_id, new_area, new_cat)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(report, field, value)

    db.commit()
    db.refresh(report)
    return report


def cancel_report(db: Session, citizen: User, report_id: int) -> Report:
    """
    A citizen can cancel their own report only when it is in a cancellable state.
    Creates a status-history entry.
    """
    report = get_citizen_report(db, citizen, report_id)

    cancellable_statuses = {ReportStatus.submitted, ReportStatus.under_review}
    if report.status not in cancellable_statuses:
        raise BadRequestError(
            "CANNOT_CANCEL",
            "You can only cancel a report that is in 'submitted' or 'under_review' status.",
        )

    record_status_change(
    db,
    report,
    ReportStatus.cancelled,
    citizen,
    note="Report cancelled by citizen.",
)
    db.commit()
    db.refresh(report)
    return report


# ---------------------------------------------------------------------------
# Employee actions
# ---------------------------------------------------------------------------

def get_report_for_employee(db: Session, employee: User, report_id: int) -> Report:
    """Return a report only if it belongs to the employee's governorate."""
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report")
    # Employees can only access reports from their governorate.
    if report.governorate_id != employee.governorate_id:
        raise PermissionDeniedError("This report is outside your governorate.")
    return report


def employee_update_status(
    db: Session, employee: User, report_id: int, data: StatusUpdateRequest
) -> Report:
    """Employee changes a report status."""
    report = get_report_for_employee(db, employee, report_id)

    validate_transition(report.status, data.new_status)

    record_status_change(
        db,
        report,
        data.new_status,
        employee,
        note=data.note,
    )

    db.commit()
    db.refresh(report)
    return report


def employee_resolve_report(
    db: Session, employee: User, report_id: int, data: ResolveRequest
) -> Report:
    """Resolve a report with a mandatory resolution summary."""
    report = get_report_for_employee(db, employee, report_id)

    if report.status != ReportStatus.in_progress:
        raise BadRequestError(
            "REPORT_NOT_RESOLVABLE",
            "Only reports that are in progress can be resolved.",
        )

    report.resolution_summary = data.resolution_summary
    report.resolved_at = datetime.now(timezone.utc)

    record_status_change(
        db,
        report,
        ReportStatus.resolved,
        employee,
        note=data.resolution_summary,
    )

    db.commit()
    db.refresh(report)
    return report


def add_comment(
    db: Session,
    author: User,
    report_id: int,
    content: str,
    is_internal: bool = False,
) -> ReportComment:
    """Add a comment to a report with backend-level visibility protection."""

    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report")

    # Internal notes are restricted to employees and admins.
    if is_internal and author.role not in (UserRole.employee, UserRole.admin):
        raise PermissionDeniedError(
            "Only employees and admins can create internal notes."
        )

    # Employees may only add internal notes to reports in their governorate.
    if is_internal and author.role == UserRole.employee:
        if report.governorate_id != author.governorate_id:
            raise PermissionDeniedError(
                "This report is outside your governorate."
            )

    comment = ReportComment(
        report_id=report_id,
        author_id=author.id,
        content=content,
        is_internal=is_internal,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


# ---------------------------------------------------------------------------
# Admin actions
# ---------------------------------------------------------------------------

def admin_assign_report(
    db: Session, admin: User, report_id: int, data: AssignRequest
) -> Report:
    """
    Admin assigns an employee to a report.
    Validates that the employee is active and in the same governorate.
    """
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report")

    employee = db.get(User, data.employee_id)
    if employee is None:
        raise NotFoundError("Employee")

    if employee.role != UserRole.employee:
        raise BadRequestError("NOT_EMPLOYEE", "The selected user is not an employee.")

    if not employee.is_active:
        raise BadRequestError("INACTIVE_EMPLOYEE", "The selected employee is inactive.")

    if employee.governorate_id != report.governorate_id:
        raise BadRequestError(
        "EMPLOYEE_GOVERNORATE_MISMATCH",
        "The employee must belong to the same governorate as the report.",
    )
    
    report.assigned_employee_id = employee.id

    record_status_change(
        db,
        report,
        ReportStatus.assigned,
        admin,
        note="Report assigned to employee.",
    )
    
    
    db.commit()
    db.refresh(report)
    return report


def admin_update_priority(
    db: Session, report_id: int, data: PriorityUpdateRequest
) -> Report:
    """Admin updates the priority of a report."""
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report")

    report.priority = data.priority
    db.commit()
    db.refresh(report)
    return report

