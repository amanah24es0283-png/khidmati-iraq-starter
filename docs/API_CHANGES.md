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

When `urgent_only=true`, only reports with `urgent` priority are returned.

### Employee
`GET /api/v1/employee/reports`

Supports the optional `urgent_only` filter.

When `urgent_only=true`, only urgent reports are returned.

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

## Authorization

- Admin endpoints require an authenticated administrator.
- Employee endpoints require an authenticated employee.
- Citizens cannot access employee/admin report management endpoints.

## Priority Rules

Citizens cannot set the `urgent` priority when creating or updating reports.

Employees and administrators follow the existing priority permissions.

## Status Workflow

Allowed status transitions are validated centrally by the report service.

Successful status changes create a status-history record containing the previous status, new status, user, and timestamp.

## Error Responses

Unauthorized requests return an authorization error.

Invalid status transitions, invalid report ownership, invalid locations, and other validation failures return the appropriate API error response.

## Backward Compatibility

The `urgent_only` filter is optional. Existing API clients that omit the parameter continue to receive the normal report list behavior.
