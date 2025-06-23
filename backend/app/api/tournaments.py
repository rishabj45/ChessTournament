from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..auth import get_admin_user, get_optional_admin
from ..schemas import Tournament, TournamentCreate, TournamentUpdate, Standings, BestPlayers
from .. import crud,schemas

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])

@router.get("/current", response_model=Optional[Tournament])
async def get_current_tournament(db: Session = Depends(get_db)):
    """Get the current active tournament"""
    tournament = crud.get_current_tournament(db)
    return tournament

@router.get("/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: int, db: Session = Depends(get_db)):
    """Get tournament by ID"""
    tournament = crud.get_tournament(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament

@router.get("/", response_model=List[Tournament])
async def get_tournaments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all tournaments"""
    return crud.get_tournaments(db, skip=skip, limit=limit)

@router.post("/", response_model=Tournament)
async def create_tournament(
    tournament: TournamentCreate,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    """Create a new tournament (Admin only)"""
    try:
        return crud.create_tournament(db, tournament)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{tournament_id}", response_model=Tournament)
async def update_tournament(
    tournament_id: int,
    tournament_update: TournamentUpdate,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    """Update tournament (Admin only)"""
    tournament = crud.update_tournament(db, tournament_id, tournament_update)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@router.get("/{tournament_id}/standings", response_model=List[schemas.TeamStanding])
def read_standings(tournament_id: int, db: Session = Depends(get_db)):
    """
    Get the standings for a given tournament.
    """
    rows = crud.get_tournament_standings(db, tournament_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    standings: List[schemas.TeamStanding] = []
    for row in rows:
        # row["team"] is a SQLAlchemy Team model; convert it to the Pydantic schema
        team = schemas.Team.model_validate(row["team"])
        standings.append(
            schemas.TeamStanding(
                position=row["position"],
                team=team,
                matches_played=row["matches_played"],
                match_points=row["match_points"],
                game_points=row["game_points"],
                sonneborn_berger=row["sonneborn_berger"],
            )
        )

    return standings

@router.get("/{tournament_id}/best-players", response_model=List[schemas.PlayerStats])
def best_players(tournament_id: int, db: Session = Depends(get_db)):
    return crud.get_best_players(db, tournament_id)

@router.get("/{tournament_id}/progress")
async def get_tournament_progress(tournament_id: int, db: Session = Depends(get_db)):
    """Get tournament progress statistics"""
    progress = crud.get_tournament_progress(db, tournament_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return progress