#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v lsof >/dev/null 2>&1 && lsof -ti:3000 >/dev/null 2>&1; then
  echo "Ошибка: на порту 3000 уже запущен dev-сервер."
  echo "Сначала остановите его (Ctrl+C в терминале с npm run dev),"
  echo "или запустите: pkill -f 'next dev'"
  echo ""
  echo "npm run build во время работы dev ломает кэш .next (ошибка ./218.js)."
  exit 1
fi

echo "→ Сборка production..."
exec npx next build
