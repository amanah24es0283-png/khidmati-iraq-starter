# Testing Report

## Test Environment

- Test framework: pytest
- Database: PostgreSQL
- Test database: khidmati_iraq_test
- Test database is separate from the application database.

## Test Command

pytest -q

Result: 11 passed, 6 warnings in 4.88s

## Notes

All automated tests passed successfully. The warnings are deprecation warnings and do not cause test failures.
