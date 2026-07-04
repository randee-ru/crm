from __future__ import annotations

from django.contrib import admin


# Эти настройки делают внутреннюю админку узнаваемой для команды CRM Kit.
admin.site.site_header = "CRM Kit Admin"
admin.site.site_title = "CRM Kit"
admin.site.index_title = "Управление CRM Kit"

