#!/bin/sh
set -eu

REPO_URL="https://github.com/ExpertosTI/brybot.git"
DEPLOY_DIR="/opt/brybot"

echo "=== BRYBOT First-Time Setup ==="

# 1. Clone
if [ -d "$DEPLOY_DIR" ]; then
  echo "Directory $DEPLOY_DIR already exists. Pulling latest..."
  cd "$DEPLOY_DIR"
  git pull
else
  echo "Cloning repo..."
  git clone "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

# 2. Generate .env if it doesn't exist
if [ ! -f .env ]; then
  echo "Generating .env with secure secrets..."
  PG_PASS=$(openssl rand -hex 24)
  SECRET=$(openssl rand -hex 32)
  ENC_KEY=$(openssl rand -base64 32)

  cat > .env << EOF
APP_DOMAIN=trade.adderlymarte.com
STACK_NAME=brybot
ACME_EMAIL=admin@adderlymarte.com
POSTGRES_DB=brybot_db
POSTGRES_USER=brybot
POSTGRES_PASSWORD=${PG_PASS}
DATABASE_URL=postgresql://brybot:${PG_PASS}@db:5432/brybot_db
SECRET_KEY=${SECRET}
CREDENTIALS_ENCRYPTION_KEY=${ENC_KEY}
CORS_ORIGINS=https://trade.adderlymarte.com
TOPSTEP_USER=
TOPSTEP_API_KEY=
TOPSTEP_ACCOUNT_ID=
TRADINGVIEW_API_KEY=
TRADINGVIEW_BASE_URL=https://api.tradingview.com
EOF


  echo "✅ .env created with auto-generated passwords."
  echo "   (Edit later to add TOPSTEP_USER / TOPSTEP_API_KEY)"
else
  echo ".env already exists, keeping it."
fi

# 3. Build & Deploy
echo "Building images..."
docker compose build

echo "Deploying stack..."
set -a
. ./.env
set +a
docker stack deploy --with-registry-auth -c docker-compose.yml brybot

echo ""


echo "=== Waiting for services to start ==="
attempt=1
while [ "$attempt" -le 30 ]; do
  services="$(docker stack services brybot --format '{{.Replicas}}' 2>/dev/null || true)"
  if [ -n "$services" ] && ! printf '%s\n' "$services" | grep -qE '(^|[[:space:]])0/[0-9]+'; then
    echo "✅ All services running!"
    docker stack services brybot
    echo ""
    echo "🌐 https://trade.adderlymarte.com"
    exit 0
  fi
  printf "  Attempt %d/30 — waiting...\r" "$attempt"
  sleep 5
  attempt=$((attempt + 1))
done

echo ""
echo "⚠️  Services may still be starting. Current status:"
docker stack services brybot
