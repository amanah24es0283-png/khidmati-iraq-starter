"""
tests/test_audit_logs.py
API tests for audit logging and admin-only audit access.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.category import ServiceCategory
from app.models.governorate import Governorate
from app.models.user import User
from tests.conftest import auth_header, get_token


def create_report(
    client: TestClient,
    token: str,
    category: ServiceCategory,
    governorate: Governorate,
    area_id: int,
) -> dict:
    response = client.post(
        "/api/v1/reports",
        json={
            "category_id": category.id,
            "governorate_id": governorate.id,
            "area_id": area_id,
            "title": "Audit test report",
            "description": "This report is created to test audit logging.",
            "address_details": "Audit test address",
        },
        headers=auth_header(token),
    )
    assert response.status_code == 201, response.json()
    return response.json()


class TestAuditLogsAPI:

    def test_report_creation_creates_audit_log(
        self,
        client: TestClient,
        citizen: User,
        admin: User,
        category: ServiceCategory,
        governorate: Governorate,
        area,
    ):
        citizen_token = get_token(client, citizen.email)
        admin_token = get_token(client, admin.email)

        report = create_report(
            client,
            citizen_token,
            category,
            governorate,
            area.id,
        )

        response = client.get(
            f"/api/v1/admin/audit-logs?report_id={report['id']}&action=REPORT_CREATED",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200, response.json()

        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["action"] == "REPORT_CREATED"
        assert data["items"][0]["report_id"] == report["id"]
        assert data["items"][0]["user_id"] == citizen.id
        assert data["items"][0]["user"]["id"] == citizen.id
        assert data["items"][0]["user"]["full_name"] == citizen.full_name
        assert data["items"][0]["report"]["id"] == report["id"]
        assert data["items"][0]["report"]["reference_number"] == report["reference_number"]

    def test_admin_can_filter_audit_logs_by_report(
        self,
        client: TestClient,
        citizen: User,
        admin: User,
        category: ServiceCategory,
        governorate: Governorate,
        area,
    ):
        citizen_token = get_token(client, citizen.email)
        admin_token = get_token(client, admin.email)

        report = create_report(
            client,
            citizen_token,
            category,
            governorate,
            area.id,
        )

        response = client.get(
            f"/api/v1/admin/audit-logs?report_id={report['id']}&page=1&page_size=10",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200, response.json()

        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total"] >= 1
        assert all(item["report_id"] == report["id"] for item in data["items"])

    def test_citizen_cannot_access_audit_logs(
        self,
        client: TestClient,
        citizen: User,
    ):
        citizen_token = get_token(client, citizen.email)

        response = client.get(
            "/api/v1/admin/audit-logs",
            headers=auth_header(citizen_token),
        )

        assert response.status_code == 403
