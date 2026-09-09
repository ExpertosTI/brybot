FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python -c 'import socket, time, os, urllib.parse; u = urllib.parse.urlparse(os.getenv(\"DATABASE_URL\", \"\")); h = u.hostname or \"db\"; p = u.port or 5432;\nfor _ in range(30):\n    try:\n        with socket.create_connection((h, p), timeout=2): break\n    except OSError: time.sleep(1)' && alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]