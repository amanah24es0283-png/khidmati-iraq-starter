"""
tests/test_dashboard.py
API tests for dashboard analytics.
"""

from fastapi.testclient import TestClient

from app.models.user import User
from tests.conftest import auth_header, get_token


class TestDashboardAPI:

    def test_admin_can_get_dashboard_trends(
        self,
        client: TestClient,
        admin: User,
    ):
        admin_token = get_token(client, admin.email)

        response = client.get(
            "/api/v1/admin/dashboard/trends?days=7",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200, response.json()

        data = response.json()
        assert data["days"] == 7
        assert len(data["data"]) == 7

        for item in data["data"]:
            assert "date" in item
            assert "count" in item
            assert isinstance(item["count"], int)

    def test_citizen_cannot_get_dashboard_trends(
        self,
        client: TestClient,
        citizen: User,
    ):
        citizen_token = get_token(client, citizen.email)

        response = client.get(
            "/api/v1/admin/dashboard/trends?days=7",
            headers=auth_header(citizen_token),
        )

        assert response.status_code == 403

    def test_dashboard_trends_rejects_invalid_days(
        self,
        client: TestClient,
        admin: User,
    ):
        admin_token = get_token(client, admin.email)

        response = client.get(
            "/api/v1/admin/dashboard/trends?days=32",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 422

    def test_admin_can_get_dashboard_status_trends(
        self,
        client: TestClient,
        admin: User,
    ):
        admin_token = get_token(client, admin.email)

        response = client.get(
            "/api/v1/admin/dashboard/status-trends?days=7",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200, response.json()

        data = response.json()
        assert data["days"] == 7
        assert len(data["data"]) == 7

        expected_statuses = {
            "submitted",
            "under_review",
            "assigned",
            "in_progress",
            "resolved",
            "rejected",
            "cancelled",
        }

        for item in data["data"]:
            assert "date" in item
            assert set(item) == {"date", *expected_statuses}
            assert all(
                isinstance(item[status], int)
                for status in expected_statuses
            )

    def test_citizen_cannot_get_dashboard_status_trends(
        self,
        client: TestClient,
        citizen: User,
    ):
        citizen_token = get_token(client, citizen.email)

        response = client.get(
            "/api/v1/admin/dashboard/status-trends?days=7",
            headers=auth_header(citizen_token),
        )

        assert response.status_code == 403
