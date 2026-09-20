from app.models.audit_log import AuditLog


def test_audit_log_model_import():
    """AuditLog model is available and mapped correctly."""
    assert AuditLog.__tablename__ == "audit_logs"


def test_audit_log_has_required_columns():
    """AuditLog contains the fields required for auditing."""
    columns = set(AuditLog.__table__.columns.keys())

    assert {
        "id",
        "user_id",
        "report_id",
        "action",
        "details",
        "created_at",
    }.issubset(columns)
