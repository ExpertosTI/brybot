# TopStep MVP Bot

This repository contains a FastAPI backend with a simple React frontend to interact with TopStepX. The backend exposes authentication routes using JWT and integrates existing TopStep login logic. The frontend allows users to log in and view a minimal dashboard.

## 🚀 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Backend Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head  # run from project root to apply migrations
uvicorn app.main:app --reload
```

## 🧪 ENV

Create a `.env` file with the following values:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/topstepdb
TOPSTEP_USER=your@email.com
TOPSTEP_API_KEY=your-api-key
SECRET_KEY=your-secret
```
