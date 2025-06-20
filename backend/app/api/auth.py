from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from ..auth import authenticate_admin, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from ..schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """Admin login endpoint"""
    if not authenticate_admin(login_request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin", "is_admin": True},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(access_token=access_token)

@router.post("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify if token is valid"""
    return {"valid": True, "is_admin": current_user.get("is_admin", False)}