#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Останавливаем все процессы Next.js на порту 3000..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi
sleep 1

if command -v lsof >/dev/null 2>&1 && lsof -ti:3000 >/dev/null 2>&1; then
  echo "Ошибка: порт 3000 всё ещё занят. Закройте процесс вручную:"
  echo "  lsof -ti:3000 | xargs kill -9"
  exit 1
fi

echo "→ Очищаем кэш .next и webpack..."
rm -rf .next node_modules/.cache

echo "→ Запускаем dev-сервер на http://localhost:3000"
echo "  После перезапуска обновите страницу: Cmd+Shift+R (жёсткое обновление)"
exec npx next dev
