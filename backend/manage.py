#!/usr/bin/env python3
"""Django management entry point.

This file exists so the project can be started and managed with standard
Django commands such as `runserver`, `migrate`, and `createsuperuser`.
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    """Run Django's command-line utility."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
