# backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# For sync, strip the '+aiosqlite' if present
raw_url = os.getenv("DATABASE_URL", "sqlite:///./chess_tournament.db")
DATABASE_URL = raw_url.replace("sqlite+aiosqlite://", "sqlite://")

# If it's SQLite, allow multithread
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite://") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
