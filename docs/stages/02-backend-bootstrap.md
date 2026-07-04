# Stage 2 - Backend Bootstrap

## Goal

Make the Django backend start in a predictable and documented way.

## What this stage adds

- Django project settings split by environment
- `.env.example` files
- PostgreSQL and Redis through Docker Compose
- a Dockerfile for the backend
- a test settings module
- a healthcheck endpoint
- local settings as the default boot target

## Why this stage matters

This stage turns the repository from a structure into a runnable backend foundation.
Without it, every next feature would be built on guesswork.

## Files that matter most

- `Dockerfile`
- `docker-compose.yml`
- `backend/manage.py`
- `backend/config/settings/base.py`
- `backend/config/settings/dev.py`
- `backend/config/settings/local.py`
- `backend/config/settings/prod.py`
- `backend/config/settings/test.py`
- `backend/core/tests/test_healthcheck.py`

## How to verify

1. copy `.env.example` to `.env`
2. run `docker compose up --build`
3. open `http://localhost:8000/health/`

## Beginner lesson

Backend bootstrap is the process of making the backend start cleanly before business logic appears.
That means settings, dependencies, containers, and a healthcheck come before features.
