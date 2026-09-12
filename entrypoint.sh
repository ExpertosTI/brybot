#!/bin/sh
set -e

echo "⏳ Checking database connection..."
python - << 'EOF'
import socket, time, os, urllib.parse

db_url = os.getenv("DATABASE_URL", "")
if db_url:
    parsed = urllib.parse.urlparse(db_url)
    host = parsed.hostname or "brybot_db"
    port = parsed.port or 5432
    for i in range(40):
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"✅ Database reachable at {host}:{port}")
                break
        except OSError:
            time.sleep(1)
    else:
        print(f"⚠️ Warning: Database at {host}:{port} not answering yet, proceeding...")
EOF

echo "🔄 Running database migrations..."
alembic upgrade head || echo "⚠️ Alembic warning (proceeding with app startup)"

echo "👤 Seeding initial admin credentials..."
python seed.py || echo "⚠️ Seed warning (proceeding with app startup)"

echo "🚀 Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
