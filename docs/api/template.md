# Шаблон API-страницы

Используйте этот файл как образец для новых endpoint'ов.

## Назначение

Кратко объясните, зачем существует endpoint.

## URL

```text
METHOD /api/v1/example/
```

## Пример запроса

```bash
curl -X METHOD http://localhost:8000/api/v1/example/
```

## Пример ответа

```json
{
  "status": "ok"
}
```

## Тест

Опишите тест, который подтверждает контракт endpoint'а.

```python
from django.test import Client, TestCase


class ExampleApiTest(TestCase):
    def test_example_endpoint_returns_ok(self) -> None:
        response = Client().get("/api/v1/example/")
        self.assertEqual(response.status_code, 200)
```

## Пример на будущее

Добавляйте сюда реальные примеры из продукта, чтобы документация росла вместе с кодом.

