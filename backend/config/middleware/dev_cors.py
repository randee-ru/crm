from __future__ import annotations

from django.http import HttpRequest, HttpResponse


class DevCorsMiddleware:
    """Разрешает локальные запросы frontend -> backend без отдельного CORS-пакета."""

    allowed_origins = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        origin = request.headers.get("Origin", "")

        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if request.path.startswith("/api/v1/public/"):
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Accept, Content-Type"
            return response

        if origin in self.allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Accept, Authorization, Content-Type"
            response["Vary"] = "Origin"

        return response
