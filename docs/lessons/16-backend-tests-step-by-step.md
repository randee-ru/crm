# Урок 16 — Тесты backend: пошагово

## Зачем тесты

Тесты — это страховка: вы меняете код, запускаете тесты, и за секунды видите, не сломали ли tenant-изоляцию, валидацию или API.

В CRM Kit тесты запускаются **без PostgreSQL** — используется SQLite in-memory (`config.settings.test`).

## Где лежат тесты

```
backend/<module>/tests/
  test_models.py   — бизнес-правила модели
  test_api.py      — HTTP-эндпоинты
```

Примеры: `backend/clients/tests/`, `backend/accounts/tests/`.

## Шаблон теста API

Скопируйте структуру из `backend/clients/tests/test_api.py`:

```python
from django.contrib.auth import get_user_model
from django.test import Client as DjangoClient, TestCase

from accounts.models import CompanyMembership
from companies.models import Company
from employees.models import Trainer


class TrainerApiTest(TestCase):
    def setUp(self) -> None:
        self.http = DjangoClient()
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="admin12345",
        )
        self.company = Company.objects.create(name="Sportmax", slug="sportmax")
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyMembership.Role.ADMIN,
        )
        login = self.http.post(
            "/api/v1/auth/login/",
            data={"username": "admin", "password": "admin12345"},
            content_type="application/json",
        )
        self.token = login.json()["token"]

    def test_list_requires_auth(self) -> None:
        response = self.http.get("/api/v1/trainers/?company=sportmax")
        self.assertEqual(response.status_code, 401)

    def test_create_trainer(self) -> None:
        response = self.http.post(
            "/api/v1/trainers/?company=sportmax",
            data={"first_name": "Анна", "last_name": "Смирнова"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Token {self.token}",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Trainer.objects.count(), 1)
        self.assertEqual(Trainer.objects.first().company, self.company)
```

## Что обязательно проверять

| Сценарий | Зачем |
|----------|-------|
| 401 без токена | API закрыт |
| 403 / 404 чужая компания | tenant-изоляция |
| 201 при создании | happy path |
| 400 при невалидных данных | валидация serializer |
| Данные привязаны к `company` | нет утечки между клубами |

## Запуск

```bash
cd backend

# Все тесты модуля
../.venv/bin/python manage.py test employees.tests --settings=config.settings.test -v 2

# Один файл
../.venv/bin/python manage.py test employees.tests.test_api --settings=config.settings.test

# Весь проект
../.venv/bin/python manage.py test --settings=config.settings.test
```

## Тест модели с валидацией

```python
from django.core.exceptions import ValidationError
from django.test import TestCase

from branches.models import Branch
from clients.models import Client
from companies.models import Company


class ClientValidationTest(TestCase):
    def test_branch_must_belong_to_same_company(self) -> None:
        company_a = Company.objects.create(name="A", slug="a")
        company_b = Company.objects.create(name="B", slug="b")
        branch_b = Branch.objects.create(company=company_b, name="Main")

        client = Client(
            company=company_a,
            branch=branch_b,
            first_name="Test",
            last_name="User",
            phone="+79990001122",
        )
        with self.assertRaises(ValidationError):
            client.full_clean()
```

## Привычка

**Пишите тест сразу после API**, не «потом». «Потом» не наступает.

## Следующий шаг

→ [Урок 17 — Frontend](./17-new-frontend-screen-step-by-step.md)
