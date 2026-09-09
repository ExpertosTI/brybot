import os
import secrets
import string
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.security import hash_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_users():
    session = SessionLocal()

    if session.query(User).first():
        print("Users already exist in database.")
        session.close()
        return

    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@trade.adderlymarte.com")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_password:
        # Generate a cryptographically strong random password
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        raw_pw = "".join(secrets.choice(alphabet) for _ in range(24))
        # Ensure policy compliance: uppercase, lowercase, digit
        admin_password = raw_pw + "A1a!"
        generated = True
    else:
        generated = False

    admin = User(
        username=admin_username,
        email=admin_email,
        hashed_password=hash_password(admin_password),
        created_at=datetime.utcnow()
    )

    session.add(admin)
    session.commit()
    session.close()

    if generated:
        print("=" * 60)
        print("✅ Initial admin user created.")
        print(f"👤 Username: {admin_username}")
        print(f"🔑 Password: {admin_password}")
        print("⚠️  Save this password immediately and change it upon first login!")
        print("=" * 60)
    else:
        print(f"✅ Initial admin user created: {admin_username}")

if __name__ == "__main__":
    seed_users()

