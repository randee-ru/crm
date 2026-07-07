# Урок 14 — Новая модель Django: пошагово

## Цель

Научиться добавлять новую сущность в базу данных так, чтобы она вписывалась в архитектуру CRM Kit.

## Шаг 1. Выберите модуль

Каждая бизнес-область — отдельное Django-приложение в `backend/`:

| Модуль | Для чего |
|--------|----------|
| `clients` | Клиенты клуба |
| `memberships` | Абонементы |
| `schedule` | Расписание занятий |
| `crm` | Задачи, сделки |
| `accounts` | Пользователи, профиль, доступы |

Если модуля ещё нет:

```bash
cd backend
../.venv/bin/python manage.py startapp mymodule
```

Добавьте `mymodule.apps.MymoduleConfig` в `INSTALLED_APPS` в `config/settings/base.py`.

## Шаг 2. Опишите модель

Минимальный шаблон (на примере вымышленного «Тренера»):

```python
# backend/employees/models.py
from django.db import models
from companies.models import Company
from core.models import TimeStampedModel


class Trainer(TimeStampedModel):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="trainers",
        verbose_name="Компания",
    )
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Тренер"
        verbose_name_plural = "Тренеры"
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"
```

### Обязательные привычки

1. Наследуйтесь от `TimeStampedModel` — получите `created_at` / `updated_at` бесплатно.
2. Добавьте `company = ForeignKey(Company, ...)` для tenant-данных.
3. Напишите `verbose_name` на русском — пригодится в admin.
4. Добавьте `__str__` — удобно в shell и логах.

### Если есть связь с филиалом

Смотрите `Client` в `backend/clients/models.py`: поле `branch` + метод `clean()`, который проверяет, что филиал принадлежит той же компании.

## Шаг 3. Миграция

```bash
cd backend
../.venv/bin/python manage.py makemigrations employees --settings=config.settings.dev
../.venv/bin/python manage.py migrate --settings=config.settings.dev
```

Проверка в shell:

```bash
../.venv/bin/python manage.py shell --settings=config.settings.dev
```

```python
from companies.models import Company
from employees.models import Trainer

company = Company.objects.first()
Trainer.objects.create(company=company, first_name="Анна", last_name="Смирнова")
```

## Шаг 4. Admin (для отладки)

```python
# backend/employees/admin.py
from unfold.admin import ModelAdmin
from django.contrib import admin
from employees.models import Trainer


@admin.register(Trainer)
class TrainerAdmin(ModelAdmin):
    list_display = ["last_name", "first_name", "company", "is_active"]
    list_filter = ["is_active", "company"]
    search_fields = ["first_name", "last_name"]
```

В dev откройте `http://127.0.0.1:8000/admin/` и убедитесь, что запись видна.

## Шаг 5. Тест модели

```python
# backend/employees/tests/test_models.py
from django.test import TestCase
from companies.models import Company
from employees.models import Trainer


class TrainerModelTest(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="Test", slug="test")

    def test_trainer_belongs_to_company(self) -> None:
        trainer = Trainer.objects.create(
            company=self.company,
            first_name="Иван",
            last_name="Петров",
        )
        self.assertEqual(trainer.company, self.company)
```

Запуск:

```bash
../.venv/bin/python manage.py test employees.tests.test_models --settings=config.settings.test
```

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `No module named 'Pillow'` | `pip install Pillow` (нужен для `ImageField`) |
| Забыли `migrate` | Таблицы в БД нет — API упадёт |
| Нет `company` в модели | Данные разных клубов смешаются |
| Модуль не в `INSTALLED_APPS` | Django не видит модель |

## Следующий шаг

Модель готова → [Урок 15 — API CRUD](./15-new-api-crud-step-by-step.md).
