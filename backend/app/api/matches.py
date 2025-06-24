from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas import MatchResponse, MatchUpdate, GameResultSubmit, MatchWithGamesResponse
from ..auth import get_admin_user
from .. import crud

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.get("/", response_model=List[MatchResponse])
def list_matches(
    tournament_id: Optional[int] = None,
    round_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List matches with optional filters."""
    return crud.get_matches(
        db,
        tournament_id=tournament_id,
        round_number=round_number
    )

@router.get("/{match_id}", response_model=MatchWithGamesResponse)
def retrieve_match(match_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific match with its games."""
    match = crud.get_match_with_games(db, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match

@router.put("/{match_id}", response_model=MatchResponse)
def modify_match(
    match_id: int,
    data: MatchUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Update match details (admin only)."""
    match = crud.get_match(db, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.tournament.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update a completed tournament")
    return crud.update_match(db, match_id, data)

@router.post("/{match_id}/submit-results", response_model=MatchResponse)
def submit_results(
    match_id: int,
    results: List[GameResultSubmit],
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Submit all game results for a match (admin only)."""
    match = crud.get_match_with_games(db, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.tournament.status not in ["active", "pending"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tournament not accepting results")
    if match.is_completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Results already submitted")
    if {gr.board_number for gr in results} != {1, 2, 3, 4}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must submit results for boards 1–4")
    try:
        crud.update_match_result(db, match_id, results)
        return crud.get_match_with_games(db, match_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{match_id}/games/{game_id}/result", response_model=MatchWithGamesResponse)
def submit_game(
    match_id: int,
    game_id: int,
    result: GameResultSubmit,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Submit a single game result (admin only)."""
    match = crud.get_match_with_games(db, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    game = crud.get_game(db, game_id)
    if not game or game.match_id != match_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    try:
        crud.update_game_result(db, game_id, result.result)
        crud.recalculate_match(db, match_id)
        return crud.get_match_with_games(db, match_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# backend/app/api/matches.py

@router.get("/tournament/{tournament_id}/schedule")
def tournament_schedule(
    tournament_id: int,
    round_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get schedule for a tournament."""
    matches = crud.get_tournament_matches(db, tournament_id, round_number)
    schedule = []
    for match in matches:
        games_data = []
        for game in match.games:
            # Map internal result to frontend format
            res = game.result
            if res == 'white_win':
                res = '1-0'
            elif res == 'black_win':
                res = '0-1'
            elif res == 'draw':
                res = '1/2-1/2'
            else:
                # Treat 'pending' or None as no result
                res = None

            games_data.append({
                "id": game.id,
                "board_number": game.board_number,
                "white_player_id": game.white_player_id,
                "white_player_name": game.white_player.name if game.white_player else None,
                "black_player_id": game.black_player_id,
                "black_player_name": game.black_player.name if game.black_player else None,
                "white_team_name": match.white_team.name if match.white_team else None,
                "black_team_name": match.black_team.name if match.black_team else None,
                "result": res
            })

        schedule.append({
            "id": match.id,
            "round_number": match.round_number,
            "white_team_id": match.white_team_id,
            "white_team_name": match.white_team.name if match.white_team else None,
            "black_team_id": match.black_team_id,
            "black_team_name": match.black_team.name if match.black_team else None,
            "white_team_score": match.white_score,
            "black_team_score": match.black_score,
            "scheduled_date": match.scheduled_date.isoformat() if match.scheduled_date else None,
            "status": "Completed" if match.is_completed else "Not Started",
            "games": games_data
        })
    return {"tournament": tournament_id, "schedule": schedule}

@router.get("/tournament/{tournament_id}/results")
def tournament_results(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Get completed match results for a tournament."""
    completed = crud.get_completed_matches(db, tournament_id)
    return {"tournament": tournament_id, "results": completed}

@router.delete("/{match_id}/reset")
def reset_results(
    match_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    """Reset all results of a match (admin only)."""
    match = crud.get_match_with_games(db, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    try:
        crud.reset_match(db, match_id)
        return {"message": "Match reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
