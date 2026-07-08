#!/usr/bin/env bash
set -euo pipefail
cd /opt/crm-kit

cp -f deploy/nginx/http.conf deploy/nginx/default.conf
mkdir -p deploy/certbot/www deploy/certbot/conf deploy/backups
chmod +x deploy/backend-entrypoint.sh

if [ -f /opt/crm-kit/crm_kit.dump ]; then
  cp -f /opt/crm-kit/crm_kit.dump /opt/crm-kit/deploy/backups/crm_kit.dump
fi

echo "[1] start postgres+redis"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres redis
echo "[wait] postgres"
for i in $(seq 1 90); do
  if docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres pg_isready -U crm_kit -d crm_kit >/dev/null 2>&1; then
    echo "postgres ready ($i)"
    break
  fi
  sleep 2
done

if [ -f deploy/backups/crm_kit.dump ]; then
  echo "[2] restore database"
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
    psql -U crm_kit -d crm_kit -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO crm_kit; GRANT ALL ON SCHEMA public TO public;"
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
    pg_restore -U crm_kit -d crm_kit --no-owner --role=crm_kit /backups/crm_kit.dump
  echo "restore finished"
fi

echo "[3] build+start full stack (long)"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "[4] restore media"
if [ -f /opt/crm-kit/media_latest.tgz ]; then
  BID=$(docker compose -f docker-compose.prod.yml --env-file .env.prod ps -q backend)
  docker cp /opt/crm-kit/media_latest.tgz "$BID":/tmp/media.tgz
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T backend \
    sh -c 'mkdir -p /app/media && tar -xzf /tmp/media.tgz -C /app && rm -f /tmp/media.tgz && du -sh /app/media'
fi

if [ -f /opt/crm-kit/gateway_data_latest.tgz ]; then
  GID=$(docker compose -f docker-compose.prod.yml --env-file .env.prod ps -q messenger-gateway)
  if [ -n "$GID" ]; then
    docker cp /opt/crm-kit/gateway_data_latest.tgz "$GID":/tmp/gw.tgz
    docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T messenger-gateway \
      sh -c 'mkdir -p /app/data && tar -xzf /tmp/gw.tgz -C /app && rm -f /tmp/gw.tgz && du -sh /app/data'
  fi
fi

echo "[5] TLS cert"
if [ ! -f deploy/certbot/conf/live/crm.sportmax.fit/fullchain.pem ]; then
  docker run --rm \
    -v /opt/crm-kit/deploy/certbot/www:/var/www/certbot \
    -v /opt/crm-kit/deploy/certbot/conf:/etc/letsencrypt \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d crm.sportmax.fit --email admin@sportmax.fit --agree-tos --non-interactive || true
fi

if [ -f deploy/certbot/conf/live/crm.sportmax.fit/fullchain.pem ]; then
  cp -f deploy/nginx/https.conf deploy/nginx/default.conf
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T nginx nginx -s reload || true
fi

echo "[6] status"
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -fsS -H 'Host: crm.sportmax.fit' http://127.0.0.1/health/ || true
echo
df -h /
free -h
echo DONE
