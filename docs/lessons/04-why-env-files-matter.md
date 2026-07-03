# Lesson 04 - Why .env Files Matter

## Simple explanation

`.env` files store configuration outside source code.
That keeps secrets and machine-specific values out of Git history.

## Why this matters

We do not want passwords or secret keys hardcoded in Python files.
Instead, the code reads them from the environment.

## Current files

- `.env.example` - template for the whole project
- `backend/.env.example` - backend template for local work

## Beginner rule

Check in examples, not real secrets.
Real `.env` files should stay on your machine and stay out of Git.

