# Backend

This directory will contain the Django-based backend for CRM Kit.

## Planned contents

- Django project configuration
- domain apps
- API layer
- Celery tasks
- integration adapters
- Docker bootstrap for local development
- environment-based settings
- test configuration

## How to start thinking about this folder

The backend is not just "Django code".
It is the runtime foundation for the whole product:

- it loads settings
- it connects to PostgreSQL
- it serves the API
- it will later run background jobs

## Important rule

Keep business logic inside domain modules, not scattered across views or settings.
