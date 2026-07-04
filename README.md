# CRM Kit

CRM Kit is a modular SaaS CRM/ERP platform for service businesses.

## What is in this repository

- `backend/` - Django backend for the modular monolith.
- `frontend/` - Next.js frontend for the public and admin UI.
- `docs/` - project documentation, stage notes, and handoff context.
- `handoff.md` - a compact context file that another AI or engineer can read and continue from.

## Current state

This repository contains the base project scaffold only.
The goal of this stage is to establish a stable structure before business logic is added.

## Local development

The runtime dependencies are declared, but the environment still needs to be created.
The planned local workflow is:

- Python 3.13+
- Django 5.x
- PostgreSQL 17
- Redis
- Node.js for the frontend
- Docker / Docker Compose

## Backend start order

1. create a Python virtual environment
2. install dependencies from `pyproject.toml`
3. run PostgreSQL and Redis with Docker Compose
4. start Django from `backend/manage.py`

## Important note

The repository currently contains scaffolding only.
No migrations, API endpoints, or frontend pages exist yet.

## Documentation map

- `docs/overview.md` - product and architecture overview
- `docs/stages/01-foundation.md` - the first implementation stage
- `docs/stages/02-backend-bootstrap.md` - backend bootstrap stage
- `docs/lessons/` - short beginner-friendly lessons
- `docs/roadmap.md` - planned stages
- `handoff.md` - the continuity file for future AI sessions

## Local setup files

- `.env.example` - root environment template
- `backend/.env.example` - backend environment template
