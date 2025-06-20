from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..auth import get_admin_user
from ..schemas import Team, TeamCreate, TeamUpdate
from .. import crud

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("/", response_model=List[Team])
async def get_teams(tournament_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all teams, optionally filtered by tournament"""
    return crud.get_teams(db, tournament_id=tournament_id)

@router.get("/{team_id}", response_model=Team)
async def get_team(team_id: int, db: Session = Depends(get_db)):
    """Get team by ID"""
    team = crud.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.post("/", response_model=Team)
async def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    """Create a new team (Admin only)"""
    try:
        return crud.create_team(db, team)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{team_id}", response_model=Team)
async def update_team(
    team_id: int,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    """Update team (Admin only)"""
    team = crud.update_team(db, team_id, team_update)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    """Delete team (Admin only)"""
    success = crud.delete_team(db, team_id)
    if not success:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted successfully"}