# backend/app/main.py
"""
Chess Tournament Management System - Main FastAPI Application
"""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging
from datetime import datetime
import uvicorn

# Import database and models
from .database import engine, Base

# Import API routers
from .api import tournaments, teams, players, matches, auth


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("chess_tournament.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Environment variables
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")
API_VERSION = "v1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("🏆 Starting Chess Tournament Management System")
    
    try:
        # Create database tables if they don't exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables initialized")
        
        # Log application info
        logger.info(f"📊 API Version: {API_VERSION}")
        logger.info(f"🔧 Debug Mode: {DEBUG}")
        logger.info(f"🌐 Allowed Hosts: {ALLOWED_HOSTS}")
        
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Chess Tournament Management System")
    await engine.dispose()
    logger.info("✅ Database connections closed")

# Create FastAPI application
app = FastAPI(
    title="Chess Tournament Management System",
    description="""
    A comprehensive chess tournament management system supporting:
    
    * **Tournament Management**: Round-robin tournaments with multiple teams
    * **Team Management**: 4-6 players per team with ratings and substitutions
    * **Match Scheduling**: Automated round generation with fair color distribution
    * **Results Tracking**: Individual board results and team standings
    * **Player Rankings**: Performance-based rankings and statistics
    * **Admin Interface**: Secure admin access with viewer/admin modes
    
    ## Features
    - 🏆 Complete tournament lifecycle management
    - 👥 Team and player management with ratings
    - 📅 Automated round-robin scheduling
    - 🎯 Board-level match results
    - 📊 Real-time standings and statistics
    - 🔐 Secure admin authentication
    - 📱 Mobile-responsive interface
    
    ## Authentication
    - Viewers can access all tournament data without authentication
    - Admins need to login to modify tournament data
    - Admin mode toggle for seamless switching between viewer/admin modes
    """,
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
    openapi_url="/openapi.json" if DEBUG else None
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:5173",  # Vite development server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",  # Alternative frontend port
        "https://yourdomain.com"  # Add your production domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add trusted host middleware for production
if not DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=ALLOWED_HOSTS
    )

# Custom middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests"""
    start_time = datetime.now()
    
    # Log request
    logger.info(f"📥 {request.method} {request.url.path} - {request.client.host}")
    
    try:
        response = await call_next(request)
        
        # Calculate response time
        process_time = (datetime.now() - start_time).total_seconds()
        
        # Log response
        logger.info(
            f"📤 {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.3f}s"
        )
        
        # Add response time header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
        
    except Exception as e:
        process_time = (datetime.now() - start_time).total_seconds()
        logger.error(
            f"❌ {request.method} {request.url.path} - "
            f"Error: {str(e)} - "
            f"Time: {process_time:.3f}s"
        )
        raise

# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format"""
    logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "Internal server error" if not DEBUG else str(exc),
            "status_code": 500,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path)
        }
    )

# Include API routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(tournaments.router, tags=["Tournaments"])
app.include_router(teams.router, tags=["Teams"])
app.include_router(players.router, tags=["Players"])
app.include_router(matches.router, tags=["Matches"])

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": API_VERSION,
        "service": "Chess Tournament Management System"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with database connectivity"""
    try:
        # Test database connection
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        
        db_status = "connected"
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "version": API_VERSION,
        "service": "Chess Tournament Management System",
        "components": {
            "database": db_status,
            "api": "running"
        },
        "debug_mode": DEBUG
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Chess Tournament Management System API",
        "version": API_VERSION,
        "documentation": "/docs" if DEBUG else "Documentation disabled in production",
        "health_check": "/health",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "authentication": "/api/auth",
            "tournaments": "/api/tournaments",
            "teams": "/api/teams",
            "players": "/api/players",
            "matches": "/api/matches"
        }
    }

# API info endpoint
@app.get("/api")
async def api_info():
    """API information and available endpoints"""
    return {
        "api_version": API_VERSION,
        "service": "Chess Tournament Management System",
        "endpoints": {
            "auth": {
                "login": "POST /api/auth/login",
                "verify": "POST /api/auth/verify",
                "logout": "POST /api/auth/logout"
            },
            "tournaments": {
                "list": "GET /api/tournaments",
                "current": "GET /api/tournaments/current",
                "create": "POST /api/tournaments (Admin)",
                "update": "PUT /api/tournaments/{id} (Admin)"
            },
            "teams": {
                "list": "GET /api/teams",
                "create": "POST /api/teams (Admin)",
                "update": "PUT /api/teams/{id} (Admin)",
                "delete": "DELETE /api/teams/{id} (Admin)"
            },
            "players": {
                "list": "GET /api/players",
                "rankings": "GET /api/players/rankings",
                "create": "POST /api/players (Admin)",
                "update": "PUT /api/players/{id} (Admin)",
                "delete": "DELETE /api/players/{id} (Admin)"
            },
            "matches": {
                "list": "GET /api/matches",
                "schedule": "GET /api/matches/schedule",
                "results": "PUT /api/matches/{id}/result (Admin)"
            }
        },
        "features": [
            "Round-robin tournament generation",
            "Team management (4-6 players)",
            "Player ratings and statistics",
            "Match scheduling and results",
            "Real-time standings",
            "Admin authentication",
            "Mobile-responsive interface"
        ]
    }

# Static files (for production)
if not DEBUG:
    # Serve static files from frontend build
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Development server configuration
if __name__ == "__main__":
    # This block runs when the file is executed directly
    # Not used when running with uvicorn command
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting development server on {host}:{port}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning",
        access_log=DEBUG,
        reload_excludes=["*.log", "*.db", "*.sqlite*", "alembic/versions/*"] if DEBUG else None
    )

# Application configuration
class Config:
    """Application configuration"""
    
    # API Settings
    API_VERSION = API_VERSION
    DEBUG = DEBUG
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./chess_tournament.db")
    
    # Authentication
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # Admin Credentials
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # CORS
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # File Uploads (for future use)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES = [".pgn", ".csv", ".json"]
    
    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # Tournament Settings
    MIN_TEAMS = 2
    MAX_TEAMS = 16
    MIN_PLAYERS_PER_TEAM = 4
    MAX_PLAYERS_PER_TEAM = 6
    
    @classmethod
    def get_config(cls):
        """Get configuration dictionary"""
        return {
            attr: getattr(cls, attr)
            for attr in dir(cls)
            if not attr.startswith('_') and not callable(getattr(cls, attr))
        }

# Export configuration for use in other modules
config = Config()