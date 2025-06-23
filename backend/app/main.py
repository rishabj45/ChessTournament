# backend/app/main.py
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os, logging
from datetime import datetime
import uvicorn
from sqlalchemy import text

from .database import engine, Base
from .api import  tournaments, teams, players, matches
from . import auth
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(",")
API_VERSION = "v1"

app = FastAPI(
    title="Chess Tournament Management System",
    version=API_VERSION,
    docs_url="/docs" if DEBUG else None
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup / Shutdown ---
@app.on_event("startup")
def on_startup():
    logger.info("🚀 Starting up")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Tables ready")

@app.on_event("shutdown")
def on_shutdown():
    logger.info("🛑 Shutting down")

# --- CORS & Hosts ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if not DEBUG:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

# --- Routers (with correct prefixes) ---
app.include_router(auth.router, tags=["Authentication"])
app.include_router(tournaments.router, tags=["Tournaments"])
app.include_router(teams.router,  tags=["Teams"])
app.include_router(players.router, tags=["Players"])
app.include_router(matches.router, tags=["Matches"])

# --- Health & Root ---
@app.get("/health")
def health(): return {"status": "healthy"}

@app.get("/")
def root():
    return {"message": "Chess Tournament API", "version": API_VERSION}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=DEBUG)
