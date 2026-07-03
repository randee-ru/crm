# Lesson 01 - What Backend Bootstrap Means

## Simple explanation

Bootstrap is the first working skeleton of a backend project.
It is not the full product yet.
It is the minimal structure that lets us start the application in a predictable way.

## Why we do this first

If the project starts with no structure, every next feature becomes harder to place.
Bootstrap gives us:

- a clear project layout
- a place for settings
- a place for apps
- a path to run the server
- a path to add tests

## What exists in this repository now

- `backend/manage.py` - command entry point
- `backend/config/` - Django project configuration
- `backend/core/` - shared code for the whole project
- `backend/accounts/`, `backend/companies/`, and other domain apps - empty shells for future work

## What to remember

Bootstrap is not business logic.
It is the foundation that makes business logic easy to add later.

