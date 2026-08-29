# Known Limitations

## Overview

The Khidmati Iraq backend has been implemented and tested against the current project requirements. The following limitations are known and documented honestly.

## 1. Deprecation Warnings

The automated test suite currently reports deprecation warnings from FastAPI event handling and dependency components. These warnings do not cause test failures, but they should be addressed in a future maintenance update.

## 2. API Documentation

Swagger/OpenAPI documentation is generated automatically by FastAPI. Any future changes to request or response models should be reviewed to ensure that the generated documentation remains consistent with the implementation.

## 3. Production Deployment

The project is currently developed and tested in a local Android/Termux environment with PostgreSQL. Production deployment, monitoring, HTTPS configuration, and production infrastructure are outside the scope of this student assignment.

## 4. Future Improvements

Possible future improvements include:

- Replacing deprecated FastAPI startup event handling with lifespan handlers.
- Updating deprecated dependency code to use timezone-aware UTC datetimes.
- Adding more edge-case and integration tests.
- Improving API error messages and validation details.
- Adding production monitoring and logging.

## Conclusion

These limitations do not prevent the current automated test suite from passing. They are documented as areas for future improvement rather than unresolved test failures.
