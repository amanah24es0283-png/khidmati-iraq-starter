# Testing Report

## Test Environment

- Test framework: pytest
- Python: 3.13.13
- Database: PostgreSQL
- Test database: khidmati_iraq_test
- Test database is separate from the application database.
- Platform: Android / Termux

## Test Command

```bash
pytest -v
```

## Result

- Total tests: 21
- Passed: 21
- Failed: 0
- Warnings: 33

## Tested Areas

### Authentication
- Citizen registration
- Duplicate email rejection
- Invalid email validation
- Successful login
- Wrong password rejection
- Unknown email rejection
- Inactive user rejection
- Current-user endpoint authentication

### Reports
- Citizen report creation
- Citizen report ownership protection
- Internal note protection
- Public comments visibility
- Employee governorate authorization
- Admin access to internal notes

### Urgent Reports
- Citizens cannot set urgent priority when creating reports
- Admin urgent-only filtering
- Employee urgent-only filtering
- Admin dashboard urgent-report count

## Notes

All 21 automated tests passed successfully.

The test suite uses a separate PostgreSQL test database
(`khidmati_iraq_test`) to avoid affecting the application database.

The warnings are deprecation warnings from dependencies/framework
components and do not cause test failures.
