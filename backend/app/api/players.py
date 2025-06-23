# app/api/players.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Team
from ..schemas import (
    Player as PlayerSchema,
    PlayerResponse,
    PlayerCreate,
    PlayerUpdate,BestPlayersResponse
)
from ..auth import get_admin_user
from .. import crud

router = APIRouter(prefix="/api/players", tags=["players"])

@router.get(
    "/{tournament_id}/best-players",
    response_model=BestPlayersResponse,
)
def best_players(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    tour = crud.get_tournament(db, tournament_id)
    if not tour:
        raise HTTPException(404, "Tournament not found")

    stats = crud.get_best_players(db, tournament_id)
    return BestPlayersResponse(
        tournament_id=tournament_id,
        tournament_name=tour.name,
        players=stats,
    )



@router.get("/", response_model=List[PlayerSchema])
def get_players(
    team_id: Optional[int] = None,
    tournament_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all players, optionally filtered by team or tournament"""
    return crud.get_players(
        db,
        team_id=team_id,
        tournament_id=tournament_id,
    )


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(player_id: int, db: Session = Depends(get_db)):
    """Get a specific player by ID"""
    player = crud.get_player(db, player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    return player


@router.post("/", response_model=PlayerResponse)
def create_player(
    player: PlayerCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Create a new player (admin only)"""
    team = crud.get_team(db, player.team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team.tournament.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add players to completed tournament")
    if len(team.players) >= 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team cannot have more than 6 players")
    if crud.get_player_by_name_in_team(db, player.name, player.team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player name already exists in this team")

    # default position = next available
    if not player.position:
        player.position = len(team.players) + 1

    return crud.create_player(db, player)


@router.put("/{player_id}", response_model=PlayerResponse)
def update_player(
    player_id: int,
    upd: PlayerUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Update player details (admin only)"""
    p = crud.get_player(db, player_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    if p.team.tournament.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update player in completed tournament")

    if upd.name and upd.name != p.name:
        if crud.get_player_by_name_in_team(db, upd.name, p.team_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player name already exists in this team")
    if upd.position:
        size = len(p.team.players)
        if not (1 <= upd.position <= size):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Position must be between 1 and {size}")

    return crud.update_player(db, player_id, upd)


@router.delete("/{player_id}")
def delete_player(
    player_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Delete a player (admin only)"""
    p = crud.get_player(db, player_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    if p.team.tournament.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete player from completed tournament")
    if len(p.team.players) <= 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team must have at least 4 players")

    # remember for reordering
    team_id, old_pos = p.team_id, p.position
    crud.delete_player(db, player_id)
    crud.adjust_player_positions_after_deletion(db, team_id, old_pos)
    return {"message": "Player deleted successfully"}


@router.get("/{player_id}/games")
def get_player_games(player_id: int, db: Session = Depends(get_db)):
    """Get all games played by a player"""
    p = crud.get_player(db, player_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return {
        "player_id": player_id,
        "player_name": p.name,
        "team_name": p.team.name,
        "games": crud.get_player_games(db, player_id)
    }


@router.get("/{player_id}/statistics")
def get_player_statistics(player_id: int, db: Session = Depends(get_db)):
    """Get detailed player statistics"""
    p = crud.get_player(db, player_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

    total = p.wins + p.draws + p.losses
    win_pct = (p.wins + 0.5 * p.draws) / total * 100 if total else 0
    perf = p.rating + ((p.wins + 0.5 * p.draws) / total - 0.5) * 400 if total else p.rating

    return {
        "player_id": player_id,
        "name": p.name,
        "team_name": p.team.name,
        "rating": p.rating,
        "position": p.position,
        "games_played": total,
        "wins": p.wins,
        "draws": p.draws,
        "losses": p.losses,
        "win_percentage": round(win_pct, 2),
        "performance_rating": round(perf, 0),
        "points": p.wins + 0.5 * p.draws,
        "games_as_white": crud.get_player_games_as_white(db, player_id),
        "games_as_black": crud.get_player_games_as_black(db, player_id)
    }


@router.get("/rankings", response_model=List[dict])
def get_current_tournament_rankings(db: Session = Depends(get_db)):
    """Get player rankings for the current active tournament"""
    t = crud.get_current_tournament(db)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")
    return crud.get_tournament_best_players(db, t.id)


@router.post("/{player_id}/swap-position")
def swap_player_position(
    player_id: int,
    target_player_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Swap positions of two players within the same team (admin only)"""
    p1 = crud.get_player(db, player_id)
    p2 = crud.get_player(db, target_player_id)
    if not p1 or not p2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both players not found")
    if p1.team_id != p2.team_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Players must be in the same team")
    if p1.team.tournament.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot swap players in completed tournament")

    crud.update_player_position(db, player_id, p2.position)
    crud.update_player_position(db, target_player_id, p1.position)

    return {
        "message": "Player positions swapped successfully",
        "player1": {"id": p1.id, "name": p1.name, "new_position": p2.position},
        "player2": {"id": p2.id, "name": p2.name, "new_position": p1.position},
    }
