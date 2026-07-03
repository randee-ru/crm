# Lesson 03 - Settings by Environment

## Simple explanation

Different environments need different settings.

- development settings are for local work
- production settings are for deployed servers
- local settings can be used for machine-specific tweaks

## Why we split settings

The project must be safe and easy to run in more than one place.
If we keep one giant settings file, we later mix development behavior with production behavior.

## Current structure

- `backend/config/settings/base.py` - shared settings
- `backend/config/settings/dev.py` - development settings
- `backend/config/settings/prod.py` - production settings
- `backend/config/settings/local.py` - optional local overrides

## Beginner rule

Shared settings should contain common logic.
Environment-specific files should contain only what is special for that environment.

