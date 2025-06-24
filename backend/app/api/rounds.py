from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas
from ..auth import get_admin_user

router = APIRouter(prefix="/api/rounds", tags=["rounds"])

@router.put("/{round_id}", response_model=schemas.Round)
async def update_round(round_id: int, update: schemas.RoundUpdate, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    """Update a round's start and end date (admin only)"""
    round_obj = crud.get_round(db, round_id)
    if not round_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")
    if update.start_date is not None:
        round_obj.start_date = update.start_date
        # Update scheduled_date for all matches in this round
        for match in round_obj.matches:
            match.scheduled_date = update.start_date
    if update.end_date is not None:
        round_obj.end_date = update.end_date
    db.commit()
    db.refresh(round_obj)
    return round_obj
