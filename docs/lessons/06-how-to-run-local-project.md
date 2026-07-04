# Lesson 06 - How to Run the Project Locally

## Simple explanation

This lesson explains the safest first run for CRM Kit.

## What to do

1. copy `.env.example` to `.env`
2. start Docker Compose
3. open the healthcheck endpoint

## Why this order matters

The database and Redis should be available before Django starts.
That makes startup errors easier to understand.

## What success looks like

- PostgreSQL is running
- Redis is running
- Django responds at `/health/`

