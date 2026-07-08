# Этап 11 - Укрепление production

Цель:
- подготовить проект к стабильной эксплуатации

Результаты:
- CI workflow
- чеклист production-настроек
- базовые security flags в Django settings
- точка входа для мониторинга, бэкапов и deployment runbooks

Что ещё нужно держать под контролем:
- мониторинг ошибок
- бэкапы PostgreSQL
- healthchecks и uptime
- безопасные cookies и HTTPS-only режим
- регулярные проверки зависимости frontend/backend
