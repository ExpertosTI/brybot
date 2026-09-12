import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.security import hash_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://topstep:change-this-password@db:5432/topstepdb")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_users():
    session = SessionLocal()
    try:
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_email = os.getenv("ADMIN_EMAIL", "expertostird@gmail.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "Trading2027@")

        user = session.query(User).filter(
            (User.email == admin_email) | (User.username == admin_username)
        ).first()

        if user:
            user.username = admin_username
            user.email = admin_email
            user.hashed_password = hash_password(admin_password)
            session.commit()
            print(f"✅ Admin user updated: {admin_email} ({admin_username}) / Password: {admin_password}")
        else:
            admin = User(
                username=admin_username,
                email=admin_email,
                hashed_password=hash_password(admin_password),
                created_at=datetime.utcnow()
            )
            session.add(admin)
            session.commit()
            print(f"✅ Initial admin user created: {admin_email} ({admin_username}) / Password: {admin_password}")
    except Exception as e:
        print(f"⚠️ Error seeding users: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    seed_users()
