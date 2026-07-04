# Lesson 05 - PostgreSQL and Docker

## Simple explanation

PostgreSQL is the main database for CRM Kit.
Docker lets us run PostgreSQL and Redis the same way on every machine.

## Why we use Docker here

If everyone installs databases manually, the project becomes harder to support.
Docker gives us a repeatable local environment.

## Current infrastructure services

- `postgres` - stores business data
- `redis` - will later support background jobs and caching
- `backend` - runs Django inside a container

## Beginner rule

If the backend cannot connect to PostgreSQL, check:

1. the host name
2. the port
3. the username and password
4. whether the database container is healthy

