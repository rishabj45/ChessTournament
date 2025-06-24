### backend/app/api/matches.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..schemas import GameSimpleResultUpdate
from ..models import Game, Match 
from ..database import get_db
from ..schemas import MatchResponse , GameSimpleResultUpdate
from ..auth_utils import get_current_user
from .. import crud

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.get("/{round_id}", response_model=List[MatchResponse])
def get_matches(round_id: int, db: Session = Depends(get_db)):
    """Get all matches for a round."""
    return crud.get_matches(db, round_id=round_id)

@router.post("/{match_id}/board/{board_number}/result")
def submit_board_result(
    match_id: int,
    board_number: int,
    update: GameSimpleResultUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    game = (
        db.query(Game)
        .filter(Game.match_id == match_id, Game.board_number == board_number)
        .first()
    )
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # 🧮 Convert result string to scores
    if update.result == "white_win":
        game.white_score = 1.0
        game.black_score = 0.0
    elif update.result == "black_win":
        game.white_score = 0.0
        game.black_score = 1.0
    else:  # draw
        game.white_score = 0.5
        game.black_score = 0.5
    game.result = update.result
    game.is_completed = True
    db.commit()

    # 🎯 Check match status
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if all(g.is_completed for g in match.games):
        match.white_score = sum(g.white_score for g in match.games)
        match.black_score = sum(g.black_score for g in match.games)
        if match.white_score > match.black_score:
            match.result = "white_win"
        elif match.black_score > match.white_score:
            match.result = "black_win"
        else:
            match.result = "draw"

        match.is_completed = True
        db.commit()

    return {"message": f"Game result '{update.result}' submitted successfully"}
