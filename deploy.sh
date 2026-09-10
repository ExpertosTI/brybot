#!/bin/bash
# ==============================================================================
# BRYBOT - Automated Deployment Script (RENACE Standards)
# ==============================================================================
# Usage: ./deploy.sh
# Safely deploys or updates the brybot Docker Swarm stack on RenaceNet.

set -e

STACK_NAME="brybot"
PROJECT_DIR="/opt/brybot"

echo "========================================================"
echo "🚀 Starting BRYBOT Deployment..."
echo "========================================================"

cd "$PROJECT_DIR"

# 1. Verify and sanitize .env (RENACE unique host standard: brybot_db)
if [ ! -f .env ]; then
  echo "❌ Error: .env file missing in $PROJECT_DIR."
  exit 1
fi

sed -i 's|@db:5432|@brybot_db:5432|g' .env 2>/dev/null || true

set -a
. ./.env
set +a

: "${APP_DOMAIN:=trade.adderlymarte.com}"

# 2. Check Swarm & Network
docker info --format '{{.Swarm.LocalNodeState}}' | grep -qx active || {
  echo "❌ Error: Docker node is not in active Swarm mode."
  exit 1
}

docker network inspect RenaceNet >/dev/null 2>&1 || {
  echo "❌ Error: External overlay network RenaceNet not found."
  exit 1
}

# 3. Disk space check & deep clean if high (standard www.renace.tech)
DISK_USE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USE" -gt 85 ]; then
  echo "⚠️  Disk usage at ${DISK_USE}%. Running deep Docker cleanup..."
  # Stopped Swarm task containers keep old images referenced, so remove them first.
  docker container prune -f 2>/dev/null || true
  docker builder prune -af 2>/dev/null || true
  docker image prune -af --filter "until=72h" 2>/dev/null || true
fi

# 4. Build images
echo "🐳 Building Docker images..."
docker compose build

# 5. Deploy stack to Swarm
echo "🚀 Deploying stack '$STACK_NAME'..."
docker stack deploy --with-registry-auth -c docker-compose.yml "$STACK_NAME"

# 6. Cleanup builder cache
docker container prune -f 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# 7. Verify health
echo "⏳ Waiting for services to reach 1/1 replicas..."
RETRIES=0
MAX_RETRIES=35
while [ $RETRIES -lt $MAX_RETRIES ]; do
  services="$(docker stack services "$STACK_NAME" --format '{{.Replicas}}' 2>/dev/null || true)"
  if [ -n "$services" ] && ! printf '%s\n' "$services" | grep -qE '(^|[[:space:]])0/[0-9]+'; then
    echo "========================================================"
    echo "✅ All services running successfully (1/1 replicas)!"
    docker stack services "$STACK_NAME"
    echo "🌐 App URL: https://${APP_DOMAIN}"
    echo "========================================================"
    exit 0
  fi
  printf "  Waiting for replicas... (%d/%d)\r" "$((RETRIES + 1))" "$MAX_RETRIES"
  sleep 5
  RETRIES=$((RETRIES + 1))
done

echo ""
echo "⚠️  Checking service status:"
docker stack services "$STACK_NAME"
echo ""
echo "📜 Recent backend logs:"
docker service logs --tail 30 "${STACK_NAME}_backend" || true
exit 0