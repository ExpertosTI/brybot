import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.security import hash_password
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

# Connect to DB
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_users():
    session = SessionLocal()

    # Optional: check if users already exist to avoid duplicates
    if session.query(User).first():
        print("Users already seeded.")
        session.close()
        return

    users = [
        User(
            username="admin",
            email="admin@example.com",
            hashed_password=hash_password("AdminPass123"),
            created_at=datetime.utcnow()
        ),
        User(
            username="demo",
            email="demo@example.com",
            hashed_password=hash_password("DemoPass1234"),
            created_at=datetime.utcnow()
        )
    ]

    session.add_all(users)
    session.commit()
    print("Seeded users successfully.")
    session.close()

if __name__ == "__main__":
    seed_users()
