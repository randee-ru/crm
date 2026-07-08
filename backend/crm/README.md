# CRM Funnels Module

Документация по воронкам продаж и продления: [docs/crm-funnels.md](../../docs/crm-funnels.md)

Ключевые файлы:

- `models.py` — Deal, Task, DealStageHistory, DealContactHistory
- `pipelines.py` — определения воронок и этапов
- `funnel_services.py` — автоматизации
- `analytics_views.py` — API метрик
- `choices.py` — перечисления полей

Cron: `python manage.py run_funnel_automation --all-companies`
