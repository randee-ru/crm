# CRM Kit Roadmap

This roadmap is the development map for CRM Kit.
It is written in a simple order so a beginner can understand what we are building, why we are building it, and what must be ready before moving to the next stage.

## Product direction

CRM Kit is a modular SaaS CRM/ERP platform.
The first vertical is fitness clubs.
Later the same platform must support:

- beauty salons
- medical clinics
- spa
- education centers
- hotels
- other service businesses

## Architecture direction

- modular monolith at the start
- no microservices at the beginning
- no Kubernetes at the beginning
- each business module should stay as independent as possible
- every important entity must belong to a company or branch

## Roadmap Stages

### Stage 1 - Foundation

Goal:
- create the repository structure
- define the project direction
- prepare documentation and handoff files

Deliverables:
- root README
- `handoff.md`
- `docs/overview.md`
- `docs/stages/01-foundation.md`
- initial backend and frontend folders

Exit criteria:
- the repository is readable
- a new contributor can understand the project goal
- another AI session can continue from `handoff.md`

### Stage 2 - Backend Bootstrap

Goal:
- make the Django backend start in a predictable way
- prepare the project for real development

Deliverables:
- Django project settings split by environment
- `.env.example` files
- Docker Compose for PostgreSQL and Redis
- healthcheck endpoint
- base shared model utilities

Exit criteria:
- Django starts locally
- configuration is clear
- the backend can be tested without guessing where files belong

### Stage 3 - SaaS Core

Goal:
- build the base of multitenancy and shared business rules

Deliverables:
- `core` module with common base classes
- `companies` module
- `branches` module
- `accounts` module
- user and role structure
- company ownership rules

Exit criteria:
- every core business entity is tied to a company or branch
- there is no data mixing between tenants
- the project has a clear foundation for SaaS behavior

### Stage 4 - Admin Foundation with Unfold

Goal:
- use Unfold as the modern Django admin interface
- give employees a useful internal control panel early

Deliverables:
- Unfold integration in Django admin
- consistent admin theme and navigation
- first admin pages for core entities
- improved filters, actions, and forms where needed

Exit criteria:
- staff can manage core data from the admin interface
- the admin is readable and not visually broken
- the admin structure matches CRM Kit business modules

### Stage 5 - Fitness Club MVP

Goal:
- build the first real product version for fitness clubs

Deliverables:
- clients
- memberships
- schedule
- bookings
- attendance
- sales
- payments

Exit criteria:
- a fitness club can be onboarded
- clients can be registered
- bookings and memberships can be tracked
- basic business flow works end to end

### Stage 6 - Frontend Bootstrap

Goal:
- prepare the Next.js frontend for real product screens

Deliverables:
- app shell
- auth screens
- dashboard layout
- API connection layer
- shared UI conventions

Exit criteria:
- frontend can talk to backend
- pages are structured consistently
- the UI is ready for product work, not just mockups

### Stage 7 - Automation and Notifications

Goal:
- add business automation around customer communication and internal tasks

Deliverables:
- notifications module
- automation module
- Celery tasks
- Redis queue usage
- email and message triggers

Exit criteria:
- the system can react to business events
- task execution is separated from request handling
- communication flows are extendable

### Stage 8 - Reporting and Analytics

Goal:
- give business owners useful data about operations and revenue

Deliverables:
- reports module
- analytics module
- key business dashboards
- aggregated metrics

Exit criteria:
- users can see business performance
- reports are based on reliable data
- dashboards support decision making

### Stage 9 - Integrations

Goal:
- connect CRM Kit with external business systems

Planned integrations:
- Mango Office
- Sigur
- RFID
- access gates and turnstiles
- payment services
- messaging services
- future partner systems

Exit criteria:
- external systems can talk to CRM Kit through clear adapters
- integrations stay isolated from core business logic

### Stage 10 - Production Hardening

Goal:
- prepare the product for stable commercial use

Deliverables:
- deployment setup
- logging
- monitoring hooks
- security review
- backup and recovery plan
- CI checks

Exit criteria:
- the platform is safe to deploy
- failures are easier to detect
- support and maintenance are manageable

## Recommended order of work

1. backend bootstrap
2. SaaS core
3. Unfold admin integration
4. fitness club MVP
5. frontend bootstrap
6. automation and notifications
7. reporting and analytics
8. integrations
9. production hardening

## How to use this roadmap

- If you are a beginner, read the roadmap before changing code.
- If you are an architect, use it to keep the project order stable.
- If you are another AI session, read `handoff.md` first and then this file.

