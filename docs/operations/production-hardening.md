# Production hardening checklist

## Deployment
- [ ] Deploy backend and frontend separately
- [ ] Keep `POSTGRES_HOST`, `REDIS_URL`, `DJANGO_SECRET_KEY` in secret storage
- [ ] Use HTTPS termination at the edge

## Monitoring
- [ ] Error tracking
- [ ] Healthcheck monitoring
- [ ] Basic uptime alerting

## Backups
- [ ] Daily PostgreSQL backups
- [ ] Media backups
- [ ] Restore test at least once per month

## Security
- [ ] `SESSION_COOKIE_SECURE`
- [ ] `CSRF_COOKIE_SECURE`
- [ ] `SECURE_SSL_REDIRECT`
- [ ] `SECURE_HSTS_SECONDS`
- [ ] Restrict allowed hosts

## CI
- [ ] Run backend tests on every push
- [ ] Run frontend typecheck on every push
- [ ] Keep linting/type coverage from regressing
