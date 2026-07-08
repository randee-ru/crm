# Этап 5 - MVP для фитнес-клубов

## Цель

Собрать первую реальную рабочую часть продукта для фитнес-клубов.
Этап закрывает базовые бизнес-потоки первой вертикали:

- абонементы
- бронирования
- посещаемость
- продажи
- платежи
- тренеры

## Что сделано

- модель `Client`
- модель `Membership`
- модель `Trainer`
- модель `Booking`
- модель `AttendanceRecord`
- модель `Sale`
- модель `Payment`
- связь тренера с расписанием
- админ-регистрация для клиентских и операционных сущностей
- REST API для всех новых сущностей
- рабочие экраны для абонементов, бронирований, посещаемости и тренеров
- журналы продаж и платежей в frontend + CRUD API на backend
- тесты моделей и API
- демо-наполнение для локальной проверки

## Почему это важно

Фитнес-клубу нужно не только хранить компании и филиалы, но и вести реальных клиентов с абонементами.
Это первая бизнес-польза, которую уже можно показать пользователю.

## Что нужно помнить новичку

- клиент всегда принадлежит компании
- абонемент всегда связан с клиентом
- бронирование, посещение, продажа и платёж тоже принадлежат компании
- тренер не должен попадать в другую компанию
- данные разных фитнес-клубов не должны смешиваться
- тесты защищают эти правила от случайных поломок
- UI уже не ограничивается списками: есть карточки, формы редактирования и быстрые действия на ключевых сущностях

## Как проверить

1. создать компанию и филиал
2. создать клиента
3. создать абонемент для этого клиента
4. создать тренера
5. создать бронирование с привязкой к клиенту, абонементу и тренеру
6. создать факт посещения по бронированию
7. создать продажу и платёж
8. проверить, что валидация отклоняет сущности из другой компании
9. запустить тесты:

```bash
cd backend
DJANGO_SETTINGS_MODULE=config.settings.test ../.venv/bin/python manage.py test \
  employees.tests bookings.tests attendance.tests sales.tests payments.tests schedule.tests
```

## Пример для будущих этапов

Когда появится новая бизнес-сущность, придерживайся этого же шаблона:

1. модель с tenant-проверками
2. админка для внутренней поддержки
3. serializer + API view + URL
4. тест модели
5. тест API
6. демо-данные
7. обновление `handoff.md` и roadmap

## Связанные файлы

- `backend/clients/models.py`
- `backend/memberships/models.py`
- `backend/employees/models.py`
- `backend/bookings/models.py`
- `backend/attendance/models.py`
- `backend/sales/models.py`
- `backend/payments/models.py`
- `backend/schedule/models.py`
- `backend/clients/admin.py`
- `backend/memberships/admin.py`
- `backend/employees/admin.py`
- `backend/bookings/admin.py`
- `backend/attendance/admin.py`
- `backend/sales/admin.py`
- `backend/payments/admin.py`
- `backend/clients/tests/test_models.py`
- `backend/memberships/tests/test_models.py`
- `backend/employees/tests/test_models.py`
- `backend/bookings/tests/test_models.py`
- `backend/attendance/tests/test_models.py`
- `backend/sales/tests/test_models.py`
- `backend/payments/tests/test_models.py`

## Следующий шаг

Этап 5 закрыт. Дальше можно переходить к более глубокой проработке интерфейса и автоматизаций, не возвращаясь к базовым доменным сущностям.
