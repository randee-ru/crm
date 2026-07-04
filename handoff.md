# CRM Kit Handoff

This file is the shortest reliable context summary for continuing the project in another AI session.

## Project goal

Build CRM Kit as a commercial SaaS platform for service businesses.
The first vertical is fitness clubs.

## Current repository status

- Repository was empty after clone.
- A base scaffold was created.
- No business logic is implemented yet.
- Stage 2 backend bootstrap has started.
- PostgreSQL is the main database.
- Docker Compose and backend bootstrap files were added.

## Repository structure

- `backend/` - Django backend
- `frontend/` - Next.js frontend
- `docs/` - project documentation

## Architecture decisions

- Use a modular monolith, not microservices.
- Keep modules isolated by business domain.
- Prefer explicit structure over hidden framework magic.
- Optimize for readability and long-term maintainability.

## Planned backend modules

- `core`
- `accounts`
- `companies`
- `branches`
- `employees`
- `clients`
- `crm`
- `sales`
- `payments`
- `memberships`
- `schedule`
- `bookings`
- `attendance`
- `marketing`
- `automation`
- `notifications`

## Development rules

- Explain changes in simple language.
- Document every stage.
- Add comments where the logic is not obvious.
- Do not add dependencies without a reason.
- Keep the project runnable from the start.

## Next recommended step

Finish backend bootstrap and continue with the first SaaS core modules, then add:

- the first real module, likely `accounts` or `companies`
- tenant-aware entities
- admin integration with Unfold
