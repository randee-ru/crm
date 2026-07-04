# API: healthcheck

## Назначение

`healthcheck` нужен для простой проверки, что backend запущен и отвечает на HTTP-запросы.
Его удобно использовать:

- локально
- в Docker Compose
- в балансировщике нагрузки
- в мониторинге

## URL

```text
GET /health/
```

## Пример запроса

```bash
curl http://localhost:8000/health/
```

## Пример ответа

```json
{
  "status": "ok",
  "service": "crm-kit"
}
```

## Тест

Проверка этого contract-like поведения уже есть в:

`backend/core/tests/test_healthcheck.py`

### Что проверяет тест

- endpoint возвращает HTTP 200
- в JSON есть поле `status`
- значение `status` равно `ok`
- в JSON есть поле `service`
- значение `service` равно `crm-kit`

## Как использовать этот пример в будущем

Для каждого нового endpoint делаем такую же страницу:

- назначение
- URL
- пример запроса
- пример ответа
- тест
- заметки для расширения
