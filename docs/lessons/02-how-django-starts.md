# Lesson 02 - How Django Starts

## Simple explanation

Django starts from `manage.py`.
That file tells Python which settings module to load and then hands control to Django's command-line runner.

## Start flow

1. `manage.py` sets `DJANGO_SETTINGS_MODULE`
2. Django loads settings from `backend/config/settings/dev.py`
3. Django reads installed apps, middleware, database settings, and URLs
4. Django runs the command you asked for

## Why this matters

When something breaks, start by checking the boot path.
Most startup problems are caused by:

- missing environment variables
- wrong import paths
- broken settings
- missing dependencies

## Beginner rule

If Django does not start, do not guess.
Read the error, identify the file, and fix the smallest broken piece first.

