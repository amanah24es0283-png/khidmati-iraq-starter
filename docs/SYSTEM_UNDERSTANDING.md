# System Understanding

## 1. Application Structure

Khidmati Iraq is a FastAPI backend application organized into several main layers.

### Main Folders

- `app/api/` contains API routers and HTTP endpoints.
- `app/core/` contains security, authentication dependencies, and common exceptions.
- `app/models/` contains SQLAlchemy database models.
- `app/schemas/` contains Pydantic request and response schemas.
- `app/services/` contains business logic, especially report-related operations.

Other important files and folders include:

- `app/main.py` - FastAPI application entry point.
- `app/config.py` - application configuration and environment variables.
- `app/database.py` - database engine and session configuration.
- `tests/` - automated API tests.
- `alembic/` - database migration files.
- `scripts/` - utility and seed scripts.

## 2. FastAPI Application

The FastAPI application starts in:

`app/main.py`

This file creates the FastAPI application and registers the application's startup behavior and API router.

## 3. API Router Registration

The main API router is defined in:

`app/api/router.py`

Version 1 endpoints are organized under:

`app/api/v1/`

The main API modules are:

- `auth.py` - authentication endpoints.
- `reports.py` - citizen report endpoints.
- `employee.py` - employee operations.
- `admin.py` - administrator operations.
- `reference_data.py` - reference data endpoints.

## 4. Environment Configuration

Application configuration and environment variables are handled through:

`app/config.py`

The application uses environment-based configuration so that database connection information and other settings are not hard-coded into the application.

## 5. Database Configuration

The SQLAlchemy database engine and session are configured in:

`app/database.py`

The application uses PostgreSQL as its database.

The test environment uses a separate PostgreSQL test database to avoid affecting application data.

## 6. SQLAlchemy Models

Database models are located in:

`app/models/`

The main entities include:

- `User`
- `Report`
- `Comment`
- `StatusHistory`
- `Governorate`
- `Area`
- `Category`

These models represent the main database tables and their relationships.

## 7. Pydantic Schemas

Request and response validation schemas are located in:

`app/schemas/`

Important schema files include:

- `auth.py`
- `user.py`
- `report.py`
- `comment.py`
- `category.py`
- `location.py`

Pydantic schemas validate API input and define the structure of API responses.

## 8. Authentication and JWT

Authentication logic is implemented through:

- `app/services/auth_service.py`
- `app/core/security.py`
- `app/core/dependencies.py`

JWT tokens are generated during successful authentication and validated when protected endpoints are accessed.

Current-user and role-based access checks are implemented through authentication dependencies.

## 9. User Roles and Permissions

The system contains three main roles:

### Citizen

Citizens can:

- Register and log in.
- Create reports.
- View their own reports.
- Add and view permitted public comments.
- Cancel reports when allowed by the report workflow.

Citizens must not access another citizen's reports or internal employee notes.

### Employee

Employees can work with reports within their authorized governorate.

They can perform permitted report operations according to the report status workflow and can access internal notes only for authorized reports.

### Administrator

Administrators have administrative access to system management operations.


cat > docs/SYSTEM_UNDERSTANDING.md <<'EOF'
# System Understanding

## 1. Application Structure

Khidmati Iraq is a FastAPI backend application organized into several main layers.

### Main Folders

- `app/api/` contains API routers and HTTP endpoints.
- `app/core/` contains security, authentication dependencies, and common exceptions.
- `app/models/` contains SQLAlchemy database models.
- `app/schemas/` contains Pydantic request and response schemas.
- `app/services/` contains business logic, especially report-related operations.

Other important files and folders include:

- `app/main.py` - FastAPI application entry point.
- `app/config.py` - application configuration and environment variables.
- `app/database.py` - database engine and session configuration.
- `tests/` - automated API tests.
- `alembic/` - database migration files.
- `scripts/` - utility and seed scripts.

## 2. FastAPI Application

The FastAPI application starts in:

`app/main.py`

This file creates the FastAPI application and registers the application's startup behavior and API router.

## 3. API Router Registration

The main API router is defined in:

`app/api/router.py`

Version 1 endpoints are organized under:

`app/api/v1/`

The main API modules are:

- `auth.py` - authentication endpoints.
- `reports.py` - citizen report endpoints.
- `employee.py` - employee operations.
- `admin.py` - administrator operations.
- `reference_data.py` - reference data endpoints.

## 4. Environment Configuration

Application configuration and environment variables are handled through:

`app/config.py`

The application uses environment-based configuration so that database connection information and other settings are not hard-coded into the application.

## 5. Database Configuration

The SQLAlchemy database engine and session are configured in:

`app/database.py`

The application uses PostgreSQL as its database.

The test environment uses a separate PostgreSQL test database to avoid affecting application data.

## 6. SQLAlchemy Models

Database models are located in:

`app/models/`

The main entities include:

- `User`
- `Report`
- `Comment`
- `StatusHistory`
- `Governorate`
- `Area`
- `Category`

These models represent the main database tables and their relationships.

## 7. Pydantic Schemas

Request and response validation schemas are located in:

`app/schemas/`

Important schema files include:

- `auth.py`
- `user.py`
- `report.py`
- `comment.py`
- `category.py`
- `location.py`

Pydantic schemas validate API input and define the structure of API responses.

## 8. Authentication and JWT

Authentication logic is implemented through:

- `app/services/auth_service.py`
- `app/core/security.py`
- `app/core/dependencies.py`

JWT tokens are generated during successful authentication and validated when protected endpoints are accessed.

Current-user and role-based access checks are implemented through authentication dependencies.

## 9. User Roles and Permissions

The system contains three main roles:

### Citizen

Citizens can:

- Register and log in.
- Create reports.
- View their own reports.
- Add and view permitted public comments.
- Cancel reports when allowed by the report workflow.

Citizens must not access another citizen's reports or internal employee notes.

### Employee

Employees can work with reports within their authorized governorate.

They can perform permitted report operations according to the report status workflow and can access internal notes only for authorized reports.

### Administrator

Administrators have administrative access to system management operations.

They can access administrative report filtering, assignment, dashboard information, and authorized internal report information.

## 10. Report Business Logic

The main report business logic is implemented in:

`app/services/report_service.py`

This service contains reusable rules for report operations, including:

- Report creation.
- Authorization checks.
- Report status transitions.
- Status history.
- Assignment.
- Resolution.
- Internal-note handling.

Centralizing these rules helps prevent different API endpoints from implementing conflicting business rules.

## 11. Report Status Workflow

Allowed employee report transitions are defined centrally using:

`EMPLOYEE_TRANSITIONS`

in `app/services/report_service.py`

The workflow includes transitions such as:

- `submitted -> under_review`
- `submitted -> rejected`
- `submitted -> cancelled`
- `under_review -> assigned`
- `under_review -> rejected`
- `assigned -> in_progress`
- `assigned -> under_review`
- `in_progress -> resolved`
- `in_progress -> assigned`

Successful status changes are recorded in status history.

## 12. Report Assignment

Report assignment is handled through the administrative/report service logic.

An assignment must follow authorization and employee validation rules. The employee must be an appropriate active employee and must be authorized for the report's governorate.

The assigned employee ID is stored on the report and the status workflow is updated accordingly.

## 13. Report Resolution

Resolution logic is implemented in:

`app/services/report_service.py`

A resolution requires a valid resolution summary.

The report stores:

- Resolution summary.
- Resolution timestamp.
- Resolved status.

A status-history entry is also created.

## 14. Internal Notes

Internal notes are protected at the backend level.

Citizens cannot create internal notes and cannot receive internal notes in their report responses.

Employees can access internal notes only when they are authorized to access the related report.

Administrators have authorized access to internal notes.

Public comments remain available to citizens.

## 15. Urgent Reports

The system supports urgent report handling.

The admin and employee report-list endpoints support an `urgent_only` filter.

Citizens cannot directly set urgent priority when creating a report.

The administrator dashboard also counts urgent reports.

Automated tests cover these behaviors.

## 16. Tests

Automated tests are located in:

`tests/`

The main test files include:

- `tests/test_auth.py`
- `tests/test_reports.py`

The current test suite contains 21 tests.

The latest test execution completed successfully:

- Total tests: 21
- Passed: 21
- Failed: 0

The tests use a separate PostgreSQL test database.

