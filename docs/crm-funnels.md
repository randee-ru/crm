# Воронки CRM для фитнес-клуба

Модуль реализует две воронки продаж на базе существующих моделей `Deal`, `DealPipeline`, `DealStage`, `Task` и `Membership`.

## Воронка 1: Продажа абонемента (`membership-sales`)

| Этап | Код | Описание |
|------|-----|----------|
| Новая заявка | `new_lead` | Лид с сайта, звонка, мессенджеров, рекламы |
| Назначен визит | `visit_scheduled` | Запланирован визит в клуб |
| Визит состоялся | `visit_done` | Клиент пришёл, но не купил сразу |
| Повторный контакт | `follow_up` | Дожим после визита |
| Оформление договора | `contract` | Оформление и оплата |
| Продано | `won` | Успешная продажа |
| Потеряно | `lost` | Отказ (обязательна причина) |

**Тип визита** — поле сделки (`visit_type`), не этап: экскурсия, презентация, пробная тренировка, консультация, сразу покупка.

### Автоматизации

1. **visit_done → follow_up** — если прошло 2+ часа после `visit_done_at` и сделка не закрыта.
2. **Задачи follow_up** — при входе в `follow_up` создаются задачи на дни 1, 3, 7, 14, 21.
3. **Причина отказа** — обязательна при переводе на `lost` (API и UI).

## Воронка 2: Продление абонемента (`membership-renewal`)

| Этап | Код | Условие |
|------|-----|---------|
| До окончания 30 дней | `renewal_30` | > 15 дней |
| До окончания 15 дней | `renewal_15` | 8–15 дней |
| До окончания 7 дней | `renewal_7` | 4–7 дней |
| До окончания 3 дня | `renewal_3` | 1–3 дня |
| Заканчивается сегодня | `renewal_today` | 0 дней |
| Просрочено | `renewal_overdue` | < 0 дней |
| Продлил | `renewal_won` | Успех |
| Не продлил | `renewal_lost` | Отказ |

### Автоматизации

1. **Создание сделки** — за 30 дней до `membership.ends_at` для активных абонементов.
2. **Смена этапа** — по вычисленным `days_remaining`.
3. **Задачи** — при входе на каждый этап продления.
4. **Уведомление менеджеру** — при просроченной задаче на этапе `renewal_3`.

## Cron

```bash
# Все компании
python manage.py run_funnel_automation --all-companies

# Одна компания
python manage.py run_funnel_automation --company=sportmax
```

Рекомендуемый интервал: каждые 15–30 минут.

## API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/v1/analytics/sales-funnel/?company=` | Метрики воронки продаж |
| GET | `/api/v1/analytics/renewal-funnel/?company=` | Метрики воронки продления |
| GET/PATCH | `/api/v1/deals/` | Сделки с расширенными полями |

## Поля сделки

**Продажа:** `contact_name`, `contact_phone`, `contact_email`, `lead_source`, `client_interest`, `visit_type`, `visit_at`, `desired_tariff`, `amount`, `next_contact_at`, `manager_comment`, `loss_reason`.

**Продление:** `membership`, `renewal_amount`, `proposed_tariff`, `days_remaining` (вычисляемое), плюс контактные поля.

## История

- `DealStageHistory` — смены этапов
- `DealContactHistory` — контакты с клиентом

## Телефония

Входящие звонки без клиента создают сделку в `new_lead` воронки `membership-sales` с `lead_source=call`.

## Демо-данные

```bash
python manage.py seed_demo
```

Создаёт сделки в обеих воронках для компаний `sportmax` и `fitpro`.
