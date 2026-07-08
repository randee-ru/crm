#!/usr/bin/env bash
# Prepare bare Ubuntu 24.04 for CRM Kit production.
set -euo pipefail

DOMAIN="${DOMAIN:-crm.sportmax.fit}"
APP_DIR="${APP_DIR:-/opt/crm-kit}"

export DEBIAN_FRONTEND=noninteractive

echo "[1/6] swap (2G)..."
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=20 || true

echo "[2/6] apt update + packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw fail2ban rsync nano htop unzip

echo "[3/6] docker..."
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "[4/6] firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

echo "[5/6] app dir..."
mkdir -p "$APP_DIR" /opt/crm-kit-uploads
chmod 755 "$APP_DIR"

echo "[6/6] done"
docker --version
docker compose version
free -h
df -h /
echo "Ready for deploy to $DOMAIN at $APP_DIR"
