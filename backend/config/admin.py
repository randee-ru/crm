from __future__ import annotations

from django.contrib import admin


# /admin/ — панель платформы для разработчиков и системных администраторов.
# Рабочий CRM для сотрудников клубов живёт во frontend (Next.js).
admin.site.site_header = "CRM Kit Platform"
admin.site.site_title = "CRM Kit Platform"
admin.site.index_title = "Администрирование системы"
