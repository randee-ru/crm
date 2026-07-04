#!/usr/bin/env python3
"""Точка входа для Django management-команд.

Этот файл нужен, чтобы проект можно было запускать и обслуживать стандартными
командами Django, такими как `runserver`, `migrate` и `createsuperuser`.
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    """Запустить командную утилиту Django."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
