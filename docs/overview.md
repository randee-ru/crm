# CRM Kit Overview

## Product

CRM Kit is a cloud CRM/ERP platform designed for service businesses.
The first target market is fitness clubs, but the architecture must support future expansion into:

- beauty salons
- medical clinics
- spa
- education centers
- hotels
- other service businesses

## Architectural approach

- modular monolith
- clean boundaries between modules
- explicit configuration
- simple local development
- Docker-based deployment

## Why this structure

This product is intended to grow for years, so the codebase must stay understandable for a beginner while still being strong enough for commercial scale.
The structure should make it easy to answer three questions at any time:

1. What does this file do?
2. Why does it exist?
3. How do I safely change it?

