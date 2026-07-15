#!/usr/bin/env bash
# Add an IP to the nginx scanner blocklist and reload nginx.
# Usage: ./deploy/nginx/block-scanner-ip.sh 1.2.3.4 [note]
set -euo pipefail

IP="${1:-}"
NOTE="${2:-manual}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT/deploy/nginx/scanner-blocked-ips.conf"

if [[ -z "$IP" ]]; then
  echo "Usage: $0 <ip> [note]" >&2
  exit 1
fi

if grep -Eq "^[[:space:]]*${IP//./\\.}[[:space:]]+1;" "$FILE"; then
  echo "Already blocked: $IP"
  exit 0
fi

printf '%s 1; # %s %s\n' "$IP" "$(date -u +%Y-%m-%d)" "$NOTE" >> "$FILE"
echo "Added $IP to $FILE"

if [[ -f /opt/crm-kit/docker-compose.prod.yml ]]; then
  cd /opt/crm-kit
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T nginx nginx -t
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T nginx nginx -s reload
  echo "nginx reloaded"
fi
