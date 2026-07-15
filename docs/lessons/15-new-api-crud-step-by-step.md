# Урок 15 — Новый API CRUD: пошагово

## Цель

Открыть данные модели через REST API так же, как это сделано для клиентов.

## Общая схема URL

```
GET    /api/v1/things/?company=sportmax          — список
POST   /api/v1/things/?company=sportmax          — создать
GET    /api/v1/things/5/?company=sportmax        — карточка
PATCH  /api/v1/things/5/?company=sportmax        — обновить
```

Параметр `?company=` обязателен (или подставляется из membership пользователя).

## Шаг 1. Сериализаторы

Три роли — три класса (см. `backend/clients/serializers.py`):

```python
# backend/employees/serializers.py
from rest_framework import serializers
from employees.models import Trainer


class TrainerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trainer
        fields = ["id", "first_name", "last_name", "is_active", "created_at"]


class TrainerDetailSerializer(TrainerListSerializer):
    class Meta(TrainerListSerializer.Meta):
        fields = TrainerListSerializer.Meta.fields + ["updated_at"]


class TrainerWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trainer
        fields = ["first_name", "last_name", "is_active"]

    def create(self, validated_data: dict) -> Trainer:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
```

**Почему три штуки?**

- List — только поля для таблицы (быстрее).
- Detail — всё для карточки.
- Write — только то, что пользователь может менять (без `company` в теле запроса).

## Шаг 2. Views

Скопируйте паттерн `ClientQuerysetMixin` из `backend/clients/views.py`:

```python
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from employees.models import Trainer
from employees.serializers import (
    TrainerDetailSerializer,
    TrainerListSerializer,
    TrainerWriteSerializer,
)


class TrainerQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_trainers(self):
        slug = resolve_company_slug(self.request, required=True)
        if not slug:
            return Trainer.objects.none()
        return Trainer.objects.filter(company__slug=slug, company__is_active=True)


class TrainerListCreateView(TrainerQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        return TrainerWriteSerializer if self.request.method == "POST" else TrainerListSerializer

    def get_queryset(self):
        return self.get_company_trainers().order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        from clients.views import get_company_from_request
        ctx["company"] = get_company_from_request(self.request)
        return ctx

    def perform_create(self, serializer):
        serializer.save(company=self.get_serializer_context()["company"])


class TrainerDetailView(TrainerQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "trainer_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return TrainerWriteSerializer
        return TrainerDetailSerializer

    def get_queryset(self):
        return self.get_company_trainers()
```

Ключевые моменты:

- `TokenAuthentication` + `IsAuthenticated` — нужен заголовок `Authorization: Token ...`.
- `HasCompanyAccess` — пользователь должен иметь membership в компании.
- Queryset **всегда** фильтруется по `company__slug`.

## Шаг 3. URLs

```python
# backend/employees/urls.py
from django.urls import path
from employees.views import TrainerDetailView, TrainerListCreateView

urlpatterns = [
    path("trainers/", TrainerListCreateView.as_view(), name="trainer-list"),
    path("trainers/<int:trainer_id>/", TrainerDetailView.as_view(), name="trainer-detail"),
]
```

Подключение в корневой роутер:

```python
# backend/config/urls.py
path("api/v1/", include("employees.urls")),
```

## Шаг 4. Проверка через curl

```bash
# Логин
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<demo-password>"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Список
curl -s "http://127.0.0.1:8000/api/v1/trainers/?company=sportmax" \
  -H "Authorization: Token $TOKEN"

# Создать
curl -s -X POST "http://127.0.0.1:8000/api/v1/trainers/?company=sportmax" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Анна","last_name":"Смирнова"}'
```

## Шаг 5. Документация API

Скопируйте `docs/api/template.md` → `docs/api/trainers-crud.md` и заполните примерами curl.

## Особые случаи

### Загрузка файлов (аватар, документ)

- Используйте `ImageField` + `Pillow`.
- В view принимайте `multipart/form-data` (как `PATCH /api/v1/auth/me/`).
- На frontend отправляйте `FormData` без `Content-Type` в заголовке.

### Фильтры в списке

Смотрите `ClientListCreateView.get_queryset()` — параметры `search`, `is_active` из query string.

## Следующий шаг

→ [Урок 16 — Тесты](./16-backend-tests-step-by-step.md)  
→ [Урок 17 — Frontend](./17-new-frontend-screen-step-by-step.md)
