from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Get password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_admin(password: str) -> bool:
    """Authenticate admin with password"""
    return password == ADMIN_PASSWORD

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(credentials.credentials)
    return payload

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure current user is admin"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin access required."
        )
    return current_user

# Optional admin dependency (for endpoints that work for both admin and viewers)
async def get_optional_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get admin user if authenticated, otherwise None"""
    if not credentials:
        return None
    
    try:
        payload = verify_token(credentials.credentials)
        return payload if payload.get("is_admin") else None
    except HTTPException:
        return None

get_current_admin = get_admin_user
get_current_admin_user = get_admin_user
require_admin_mode = get_admin_user
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login", response_model=LoginResponse)
def login(login_request: LoginRequest):
    """Admin login endpoint."""
    # Verify username and password (only one admin user)
    expected_user = os.getenv("ADMIN_USERNAME", "admin")
    if login_request.username != expected_user or not authenticate_admin(login_request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": login_request.username, "is_admin": True},
        expires_delta=access_token_expires
    )
    user_info = {
        "id": 0,
        "username": expected_user,
        "is_admin": True
    }
    return LoginResponse(access_token=access_token,token_type="bearer", user=user_info)

@router.post("/verify")
def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """Verify if token is valid."""
    return {"valid": True, "is_admin": current_user.get("is_admin", False)}
