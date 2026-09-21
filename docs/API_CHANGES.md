# API Changes

## Report List

### Admin
`GET /api/v1/admin/reports`

Supported filters:
- `status`
- `priority`
- `category_id`
- `governorate_id`
- `assigned_employee_id`
- `search`
- `urgent_only`
- `page`
- `page_size`

### Employee
`GET /api/v1/employee/reports`

Supports the optional `urgent_only` filter.

## Admin Dashboard

`GET /api/v1/admin/dashboard`

Returns:
- total reports
- open reports
- resolved reports
- reports by status
- reports by priority
- reports by category
- urgent reports count

## Notifications

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/{notification_id}/read`

Status changes automatically create citizen notifications.

## Authorization

- Admin endpoints require an authenticated administrator.
- Employee endpoints require an authenticated employee.
- Citizens can access only their own reports.
- Internal notes are restricted to employees and administrators.

## Priority Rules

Citizens cannot set `urgent` priority when creating or updating reports.

Employees and administrators follow the existing priority permissions.

## Validation Rules

- Governorate and area relationships are validated.
- Employee assignment is validated.
- Citizens cannot access administrative operations.

## Status Workflow

Status transitions are validated according to the defined workflow.

Successful status changes create status-history records and citizen notifications.

## Backward Compatibility

The `urgent_only` filter is optional. Existing clients remain compatible when it is omitted.
