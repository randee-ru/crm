#!/bin/sh
set -eu

echo "[backend] waiting for postgres..."
python - <<'PY'
import os, time, sys
import psycopg

host = os.environ.get("POSTGRES_HOST", "postgres")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
db = os.environ.get("POSTGRES_DB", "crm_kit")
user = os.environ.get("POSTGRES_USER", "crm_kit")
password = os.environ.get("POSTGRES_PASSWORD", "crm_kit")

for i in range(60):
    try:
        with psycopg.connect(host=host, port=port, dbname=db, user=user, password=password, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        print("[backend] postgres is ready")
        sys.exit(0)
    except Exception as exc:
        print(f"[backend] postgres not ready ({i+1}/60): {exc}")
        time.sleep(2)
print("[backend] postgres wait timeout", file=sys.stderr)
sys.exit(1)
PY

echo "[backend] migrate..."
python manage.py migrate --noinput

echo "[backend] collectstatic..."
python manage.py collectstatic --noinput

echo "[backend] bootstrap schedule sms..."
python manage.py bootstrap_schedule_sms || true

echo "[backend] starting: $*"
exec "$@"
