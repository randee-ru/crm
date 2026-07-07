# API-документация CRM Kit

Этот раздел нужен как будущая справка по HTTP API.
Здесь мы показываем не только описание endpoint'ов, но и:

- пример запроса
- пример ответа
- тест, который подтверждает, что контракт действительно работает
- шаблон, по которому можно документировать новые endpoint'ы

## Что уже есть сейчас

- [`healthcheck`](./healthcheck.md) - первый простой endpoint для проверки работоспособности backend
- [`auth-login`](./auth-login.md) - token-авторизация и tenant-контекст пользователя
- [`clients-list`](./clients-list.md) - список клиентов компании для CRM-интерфейса
- [`clients-crud`](./clients-crud.md) - создание, просмотр и редактирование клиента
- [`tasks-and-schedule`](./tasks-and-schedule.md) - задачи сотрудников и события расписания
- [`deals-and-pipelines`](./deals-and-pipelines.md) - воронки продаж, этапы канбана и сделки CRM
- [`notifications`](./notifications.md) - список уведомлений и отметка прочитанными
- [`automation`](./automation.md) - правила автоматизации и журнал событий
- [`reports`](./reports.md) - дневной отчет и analytics overview
- [`integrations`](./integrations.md) - реестр подключений и webhook log
- [`template`](./template.md) - шаблон для будущих API-страниц

## Принцип документации

Каждый endpoint должен отвечать на четыре вопроса:

1. что делает endpoint
2. какой у него URL
3. какой пример запроса и ответа
4. каким тестом это подтверждается
