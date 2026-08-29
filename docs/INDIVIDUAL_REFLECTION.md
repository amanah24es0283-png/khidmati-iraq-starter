# Individual Reflection

## 1. What part of the existing codebase was hardest to understand?

The report workflow and the relationship between API routers, services, database models, and status history were the hardest parts to understand. I needed to trace how a request moves from the API endpoint to the service layer and then to the database.

## 2. What was the most important bug or problem you fixed?

The most important problems were related to authorization and report privacy. Citizens must only access their own reports, employees must only access reports within their authorized governorate, and internal notes must remain private.

## 3. Which business rule required the most thinking?

The report status workflow required the most thinking because each status transition has specific rules depending on the user's role. The transition must also create a matching status-history record.

## 4. Which test gave you the most confidence?

The internal-notes tests gave me the most confidence because they verify that citizens cannot view or create internal notes while authorized employees and administrators can access them appropriately.

## 5. How did you respond to the urgent-reports change request?

I implemented support for urgent reports by adding urgent-only filtering for administrators and employees, preventing citizens from setting urgent priority during report creation, and adding dashboard coverage for urgent reports. I also added automated tests for these behaviors.

## 6. What would you improve with one more week?

With one more week, I would add more edge-case and integration tests, improve API error messages, review deprecated framework usage, and perform additional manual testing through Swagger.

## 7. How did AI tools help you?

AI tools helped me understand unfamiliar parts of the existing backend, identify suitable implementation approaches, troubleshoot errors, organize documentation, and design additional tests. I verified the resulting changes by running the project tests, checking Git changes, and reviewing the implementation.

## 8. Which submitted code can you explain without AI assistance?

I can explain the report authorization logic, internal-note protection, urgent-report filtering, status-transition logic, test cases, and the main project architecture. I can also explain how the API, service layer, models, schemas, database, and tests work together.
