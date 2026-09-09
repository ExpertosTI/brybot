#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Falta .env. Copia .env.example a .env y completa los valores reales."
  exit 1
fi

set -a
. ./.env
set +a

: "${APP_DOMAIN:=trade.adderlymarte.com}"
: "${STACK_NAME:=brybot}"
: "${ACME_EMAIL:?ACME_EMAIL es obligatorio en .env}"

docker info --format '{{.Swarm.LocalNodeState}}' | grep -qx active || {
  echo "El nodo no está en un Swarm activo."
  exit 1
}

docker network inspect RenaceNet >/dev/null 2>&1 || {
  echo "No existe la red externa RenaceNet requerida por Traefik."
  exit 1
}

echo "Building images..."
docker compose build --pull

echo "Deploying stack $STACK_NAME..."
docker compose config > /tmp/brybot-resolved.yml
docker stack deploy --with-registry-auth -c /tmp/brybot-resolved.yml "$STACK_NAME"
rm -f /tmp/brybot-resolved.yml


attempt=1
while [ "$attempt" -le 30 ]; do
  services="$(docker stack services "$STACK_NAME" --format '{{.Replicas}}' 2>/dev/null || true)"
  if [ -n "$services" ] && ! printf '%s\n' "$services" | grep -qE '(^|[[:space:]])0/[0-9]+'; then
    if curl --fail --silent --show-error --max-time 10 "https://${APP_DOMAIN}/healthz" >/dev/null; then
      echo "Despliegue correcto: https://${APP_DOMAIN}"
      exit 0
    fi
  fi
  sleep 5
  attempt=$((attempt + 1))
done

echo "El stack no alcanzó estado saludable. Estado actual:"
docker stack services "$STACK_NAME"
exit 1