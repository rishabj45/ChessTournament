from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from ..database import get_db
from ..models import Match, Game, Team, Player
from ..schemas import (
    MatchResponse, MatchUpdate, GameResultSubmit,
    MatchWithGamesResponse
)
from ..auth import get_admin_user
from ..tournament_logic import (
    update_board_result,
    update_match_result,
    calculate_standings
)
from .. import crud

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.get("/", response_model=List[MatchResponse])
def get_matches(
    tournament_id: Optional[int] = None,
    round_number: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all matches with optional filtering"""
    matches = crud.get_matches(
        db,
        tournament_id=tournament_id,
        round_number=round_number,
        status=status,
        skip=skip,
        limit=limit
    )
    return matches

@router.get("/{match_id}", response_model=MatchWithGamesResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    """Get a specific match with all games"""
    match = crud.get_match_with_games(db, match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    return match

@router.put("/{match_id}")
def update_match(
    match_id: int,
    match_update: MatchUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Update match details (admin only)"""
    db_match = crud.get_match(db, match_id)
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Check if tournament is completed
    if db_match.tournament.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update matches in completed tournament"
        )
    
    updated_match = crud.update_match(db, match_id, match_update)
    return {"message": "Match updated successfully", "match": updated_match}

@router.post("/{match_id}/submit-results")
def submit_match_results(
    match_id: int,
    game_results: List[GameResultSubmit],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Submit results for all games in a match"""
    db_match = crud.get_match_with_games(db, match_id)
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Check if tournament allows result submission
    if db_match.tournament.status not in ["active", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit results for this tournament status"
        )
    
    # Check if match is already completed
    if db_match.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match results already submitted"
        )
    
    # Validate game results
    if len(game_results) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must submit results for exactly 4 games"
        )
    
    # Validate board numbers
    submitted_boards = {gr.board_number for gr in game_results}
    if submitted_boards != {1, 2, 3, 4}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must submit results for boards 1, 2, 3, and 4"
        )
    
    try:
        # Use tournament logic to process results
        update_board_result(db, match_id, game_results)
        
        # Get updated match
        updated_match = crud.get_match_with_games(db, match_id)
        
        return {
            "message": "Match results submitted successfully",
            "match": updated_match,
            "home_score": updated_match.home_score,
            "away_score": updated_match.away_score
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit results: {str(e)}"
        )

@router.put("/{match_id}/games/{game_id}/result")
def submit_single_game_result(
    match_id: int,
    game_id: int,
    game_result: GameResultSubmit,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Submit result for a single game"""
    # Verify match exists
    db_match = crud.get_match(db, match_id)
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Verify game exists and belongs to match
    db_game = crud.get_game(db, game_id)
    if not db_game or db_game.match_id != match_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found or doesn't belong to this match"
        )
    
    # Check if tournament allows result submission
    if db_match.tournament.status not in ["active", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit results for this tournament status"
        )
    
    # Validate result
    if game_result.result not in ["1-0", "0-1", "1/2-1/2"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid game result. Must be '1-0', '0-1', or '1/2-1/2'"
        )
    
    try:
        # Update game result
        crud.update_game_result(db, game_id, game_result.result)
        
        # Recalculate match score
        update_match_result(db, match_id)
        
        # Get updated game
        updated_game = crud.get_game(db, game_id)
        
        return {
            "message": "Game result submitted successfully",
            "game": updated_game
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit game result: {str(e)}"
        )

@router.get("/tournament/{tournament_id}/schedule")
def get_tournament_schedule(
    tournament_id: int,
    round_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get tournament schedule, optionally filtered by round"""
    # Verify tournament exists
    tournament = crud.get_tournament(db, tournament_id)
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found"
        )
    
    # Get matches for tournament
    matches = crud.get_tournament_matches(db, tournament_id, round_number)
    
    # Group matches by round
    rounds_data = {}
    for match in matches:
        round_num = match.round.round_number
        if round_num not in rounds_data:
            rounds_data[round_num] = {
                "round_number": round_num,
                "matches": []
            }
        
        rounds_data[round_num]["matches"].append({
            "match_id": match.id,
            "home_team": {
                "id": match.home_team.id,
                "name": match.home_team.name
            },
            "away_team": {
                "id": match.away_team.id,
                "name": match.away_team.name
            },
            "scheduled_date": match.scheduled_date,
            "status": match.status,
            "home_score": match.home_score,
            "away_score": match.away_score,
            "games": [
                {
                    "game_id": game.id,
                    "board_number": game.board_number,
                    "white_player": {
                        "id": game.white_player.id,
                        "name": game.white_player.name,
                        "rating": game.white_player.rating
                    },
                    "black_player": {
                        "id": game.black_player.id,
                        "name": game.black_player.name,
                        "rating": game.black_player.rating
                    },
                    "result": game.result
                }
                for game in sorted(match.games, key=lambda g: g.board_number)
            ]
        })
    
    # Sort rounds
    sorted_rounds = sorted(rounds_data.values(), key=lambda r: r["round_number"])
    
    return {
        "tournament_id": tournament_id,
        "tournament_name": tournament.name,
        "schedule": sorted_rounds
    }

@router.get("/tournament/{tournament_id}/results")
def get_tournament_results(tournament_id: int, db: Session = Depends(get_db)):
    """Get all completed match results for a tournament"""
    # Verify tournament exists
    tournament = crud.get_tournament(db, tournament_id)
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found"
        )
    
    # Get completed matches
    completed_matches = crud.get_completed_matches(db, tournament_id)
    
    results = []
    for match in completed_matches:
        results.append({
            "match_id": match.id,
            "round_number": match.round.round_number,
            "home_team": match.home_team.name,
            "away_team": match.away_team.name,
            "home_score": match.home_score,
            "away_score": match.away_score,
            "played_date": match.played_date,
            "games": [
                {
                    "board_number": game.board_number,
                    "white_player": game.white_player.name,
                    "black_player": game.black_player.name,
                    "result": game.result
                }
                for game in sorted(match.games, key=lambda g: g.board_number)
            ]
        })
    
    return {
        "tournament_id": tournament_id,
        "tournament_name": tournament.name,
        "completed_matches": len(results),
        "results": sorted(results, key=lambda r: (r["round_number"], r["match_id"]))
    }

@router.delete("/{match_id}/reset")
def reset_match_results(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Reset match results (clear all game results)"""
    db_match = crud.get_match_with_games(db, match_id)
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Check if tournament allows modifications
    if db_match.tournament.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reset results in completed tournament"
        )
    
    try:
        # Reset all game results
        for game in db_match.games:
            crud.update_game_result(db, game.id, None)
        
        # Reset match scores and status
        match_update = MatchUpdate(
            home_score=0,
            away_score=0,
            status="scheduled",
            played_date=None
        )
        crud.update_match(db, match_id, match_update)
        
        # Recalculate tournament standings
        calculate_standings(db, db_match.tournament_id)
        
        return {"message": "Match results reset successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset match results: {str(e)}"
        )