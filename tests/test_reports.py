"""
tests/test_reports.py
Report management tests.
TODO (TASK-09): Add tests for all project requirements.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.area import Area
from app.models.category import ServiceCategory
from app.models.governorate import Governorate
from app.models.user import User
from tests.conftest import auth_header, get_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_report_payload(
    category_id: int,
    governorate_id: int,
    area_id: int,
    title: str = "Test report title here",
    description: str = "Test report description with enough detail.",
) -> dict:
    return {
        "category_id": category_id,
        "governorate_id": governorate_id,
        "area_id": area_id,
        "title": title,
        "description": description,
        "address_details": "Some street, block 1",
    }


def post_report(
    client: TestClient,
    token: str,
    category: ServiceCategory,
    governorate: Governorate,
    area: Area,
) -> dict:
    resp = client.post(
        "/api/v1/reports",
        json=create_report_payload(category.id, governorate.id, area.id),
        headers=auth_header(token),
    )
    assert resp.status_code == 201, resp.json()
    return resp.json()


# ---------------------------------------------------------------------------
# Citizen creates a report
# ---------------------------------------------------------------------------

class TestCreateReport:
    def test_citizen_creates_report(
        self,
        client: TestClient,
        citizen: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        token = get_token(client, citizen.email)
        report = post_report(client, token, category, governorate, area)

        assert report["status"] == "submitted"
        assert report["citizen_id"] == citizen.id
        assert report["reference_number"].startswith("IRQ-")


# ---------------------------------------------------------------------------
# Citizen views reports
# ---------------------------------------------------------------------------

class TestViewReport:
    def test_citizen_views_report(
        self,
        client: TestClient,
        citizen: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        token = get_token(client, citizen.email)
        created = post_report(client, token, category, governorate, area)
        report_id = created["id"]

        resp = client.get(f"/api/v1/reports/{report_id}", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["id"] == report_id

# ---------------------------------------------------------------------------
# TASK-06 — Internal note protection
# ---------------------------------------------------------------------------

class TestInternalNotes:

    def test_citizen_sees_public_comments_but_not_internal_notes(
        self,
        client: TestClient,
        citizen: User,
        employee: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        employee_token = get_token(client, employee.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )
        report_id = report["id"]

        # Employee creates a public comment.
        public_resp = client.post(
            f"/api/v1/employee/reports/{report_id}/comments",
            json={"content": "Public update"},
            headers=auth_header(employee_token),
        )
        assert public_resp.status_code == 201

        # Employee creates an internal note.
        internal_resp = client.post(
            f"/api/v1/employee/reports/{report_id}/internal-notes",
            json={"content": "Private staff note"},
            headers=auth_header(employee_token),
        )
        assert internal_resp.status_code == 201

        # Citizen must only receive the public comment.
        comments_resp = client.get(
            f"/api/v1/reports/{report_id}/comments",
            headers=auth_header(citizen_token),
        )
        assert comments_resp.status_code == 200

        comments = comments_resp.json()
        assert len(comments) == 1
        assert comments[0]["content"] == "Public update"
        assert comments[0]["is_internal"] is False

    def test_employee_can_view_internal_notes_in_their_governorate(
        self,
        client: TestClient,
        citizen: User,
        employee: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        employee_token = get_token(client, employee.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )
        report_id = report["id"]

        create_resp = client.post(
            f"/api/v1/employee/reports/{report_id}/internal-notes",
            json={"content": "Employee private note"},
            headers=auth_header(employee_token),
        )
        assert create_resp.status_code == 201

        notes_resp = client.get(
            f"/api/v1/employee/reports/{report_id}/internal-notes",
            headers=auth_header(employee_token),
        )
        assert notes_resp.status_code == 200

        notes = notes_resp.json()
        assert len(notes) == 1
        assert notes[0]["content"] == "Employee private note"
        assert notes[0]["is_internal"] is True

    def test_employee_cannot_view_internal_notes_outside_governorate(
        self,
        client: TestClient,
        citizen: User,
        employee2: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        employee2_token = get_token(client, employee2.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )
        report_id = report["id"]

        resp = client.get(
            f"/api/v1/employee/reports/{report_id}/internal-notes",
            headers=auth_header(employee2_token),
        )

        assert resp.status_code == 403

    def test_citizen_cannot_create_internal_note(
        self,
        client: TestClient,
        citizen: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )
        report_id = report["id"]

        # The citizen endpoint only creates public comments.
        resp = client.post(
            f"/api/v1/reports/{report_id}/comments",
            json={
                "content": "Attempted internal note",
                "is_internal": True,
            },
            headers=auth_header(citizen_token),
        )

        # Extra fields are ignored by the Pydantic request schema,
        # so the resulting comment must remain public.
        assert resp.status_code == 201
        assert resp.json()["is_internal"] is False

    def test_admin_can_view_internal_notes(
        self,
        client: TestClient,
        citizen: User,
        employee: User,
        admin: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        employee_token = get_token(client, employee.email)
        admin_token = get_token(client, admin.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )
        report_id = report["id"]

        create_resp = client.post(
            f"/api/v1/employee/reports/{report_id}/internal-notes",
            json={"content": "Admin-visible private note"},
            headers=auth_header(employee_token),
        )
        assert create_resp.status_code == 201

        notes_resp = client.get(
            f"/api/v1/employee/reports/{report_id}/internal-notes",
            headers=auth_header(admin_token),
        )
        assert notes_resp.status_code == 200
        assert notes_resp.json()[0]["content"] == "Admin-visible private note"
        assert notes_resp.json()[0]["is_internal"] is True

    def test_public_comments_remain_visible_to_citizen(
        self,
        client: TestClient,
        citizen: User,
        employee: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        employee_token = get_token(client, employee.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )
        report_id = report["id"]

        resp = client.post(
            f"/api/v1/employee/reports/{report_id}/comments",
            json={"content": "Visible public comment"},
            headers=auth_header(employee_token),
        )
        assert resp.status_code == 201

        comments_resp = client.get(
            f"/api/v1/reports/{report_id}/comments",
            headers=auth_header(citizen_token),
        )
        assert comments_resp.status_code == 200

        comments = comments_resp.json()
        assert any(
            c["content"] == "Visible public comment"
            and c["is_internal"] is False
            for c in comments
        )



# ---------------------------------------------------------------------------
# CHANGE REQUEST — Urgent Reports
# ---------------------------------------------------------------------------

class TestUrgentReports:

    def test_citizen_cannot_set_urgent_priority_on_create(
        self,
        client: TestClient,
        citizen: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        token = get_token(client, citizen.email)

        payload = create_report_payload(
            category.id,
            governorate.id,
            area.id,
        )
        payload["priority"] = "urgent"

        resp = client.post(
            "/api/v1/reports",
            json=payload,
            headers=auth_header(token),
        )

        assert resp.status_code == 201, resp.json()
        assert resp.json()["priority"] == "medium"

    def test_admin_urgent_only_filter(
        self,
        client: TestClient,
        db: Session,
        citizen: User,
        admin: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        admin_token = get_token(client, admin.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )

        priority_resp = client.patch(
            f"/api/v1/admin/reports/{report['id']}/priority",
            json={"priority": "urgent"},
            headers=auth_header(admin_token),
        )
        assert priority_resp.status_code == 200, priority_resp.json()

        resp = client.get(
            "/api/v1/admin/reports",
            params={"urgent_only": True},
            headers=auth_header(admin_token),
        )

        assert resp.status_code == 200, resp.json()

        data = resp.json()
        items = data["items"]

        assert len(items) >= 1
        assert all(item["priority"] == "urgent" for item in items)
        assert any(item["id"] == report["id"] for item in items)

    def test_employee_urgent_only_filter(
        self,
        client: TestClient,
        citizen: User,
        employee: User,
        admin: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        admin_token = get_token(client, admin.email)
        employee_token = get_token(client, employee.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )

        priority_resp = client.patch(
            f"/api/v1/admin/reports/{report['id']}/priority",
            json={"priority": "urgent"},
            headers=auth_header(admin_token),
        )
        assert priority_resp.status_code == 200, priority_resp.json()

        resp = client.get(
            "/api/v1/employee/reports",
            params={"urgent_only": True},
            headers=auth_header(employee_token),
        )

        assert resp.status_code == 200, resp.json()

        items = resp.json()
        assert all(item["priority"] == "urgent" for item in items)
        assert any(item["id"] == report["id"] for item in items)

    def test_admin_dashboard_counts_urgent_reports(
        self,
        client: TestClient,
        citizen: User,
        admin: User,
        category: ServiceCategory,
        governorate: Governorate,
        area: Area,
    ):
        citizen_token = get_token(client, citizen.email)
        admin_token = get_token(client, admin.email)

        report = post_report(
            client, citizen_token, category, governorate, area
        )

        priority_resp = client.patch(
            f"/api/v1/admin/reports/{report['id']}/priority",
            json={"priority": "urgent"},
            headers=auth_header(admin_token),
        )
        assert priority_resp.status_code == 200, priority_resp.json()

        resp = client.get(
            "/api/v1/admin/dashboard",
            headers=auth_header(admin_token),
        )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["urgent_reports"] >= 1
