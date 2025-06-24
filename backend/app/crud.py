### backend/app/crud.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from fastapi import HTTPException
from . import models, schemas
from .tournament_logic import create_tournament_structure, calculate_standings

# -- Tournament CRUD --
def get_tournament(db: Session, tournament_id: int) -> Optional[models.Tournament]:
    return db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()

def get_current_tournament(db: Session) -> Optional[models.Tournament]:
    """
    Get the most recently created tournament.
    """
    return db.query(models.Tournament).order_by(models.Tournament.created_at.desc()).first()

def get_tournaments(db: Session, skip: int = 0, limit: int = 100) -> List[models.Tournament]:
    return db.query(models.Tournament).offset(skip).limit(limit).all()

def create_tournament(db: Session, tournament: schemas.TournamentCreate) -> models.Tournament:
    """
    Create full tournament structure.
    """
    return create_tournament_structure(db, tournament)

def update_tournament(db: Session, tournament_id: int, tournament_update: schemas.TournamentUpdate) -> Optional[models.Tournament]:
    tour = get_tournament(db, tournament_id)
    if not tour:
        return None
    data = tournament_update.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(tour, field, value)
    db.commit()
    db.refresh(tour)
    return tour

def delete_tournament(db: Session, tournament_id: int) -> bool:
    tour = get_tournament(db, tournament_id)
    if not tour:
        return False
    db.delete(tour)
    db.commit()
    return True

# -- Team CRUD --
def get_team(db: Session, team_id: int) -> Optional[models.Team]:
    return db.query(models.Team).filter(models.Team.id == team_id).first()

def get_teams(db: Session, tournament_id: Optional[int] = None) -> List[models.Team]:
    query = db.query(models.Team)
    if tournament_id:
        query = query.filter(models.Team.tournament_id == tournament_id)
    return query.all()

def create_team(db: Session, team: schemas.TeamCreate) -> models.Team:
    db_team = models.Team(**team.dict())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

def update_team(db: Session, team_id: int, team_update: schemas.TeamUpdate) -> Optional[models.Team]:
    team = get_team(db, team_id)
    if not team:
        return None
    data = team_update.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team

def delete_team(db: Session, team_id: int) -> bool:
    team = get_team(db, team_id)
    if not team:
        return False
    db.delete(team)
    db.commit()
    return True

# -- Player CRUD --
def get_player(db: Session, player_id: int) -> Optional[models.Player]:
    return db.query(models.Player).filter(models.Player.id == player_id).first()

def get_players(db: Session, team_id: Optional[int] = None, tournament_id: Optional[int] = None) -> List[models.Player]:
    query = db.query(models.Player)
    if team_id:
        query = query.filter(models.Player.team_id == team_id)
    if tournament_id:
        query = query.join(models.Team).filter(models.Team.tournament_id == tournament_id)
    return query.all()

def get_player_by_name_in_team(db: Session, name: str, team_id: int) -> Optional[models.Player]:
    return db.query(models.Player).filter(
        and_(models.Player.team_id == team_id, models.Player.name == name)
    ).first()

def create_player(db: Session, player: schemas.PlayerCreate) -> models.Player:
    db_player = models.Player(**player.dict())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

def update_player(db: Session, player_id: int, player_update: schemas.PlayerUpdate) -> Optional[models.Player]:
    player = get_player(db, player_id)
    if not player:
        return None
    data = player_update.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(player, field, value)
    db.commit()
    db.refresh(player)
    return player

def delete_player(db: Session, player_id: int) -> bool:
    player = get_player(db, player_id)
    if not player:
        return False
    db.delete(player)
    db.commit()
    return True

def adjust_player_positions_after_deletion(db: Session, team_id: int, deleted_position: int):
    """
    Shift up player positions after deletion.
    """
    players = db.query(models.Player).filter(models.Player.team_id == team_id).order_by(models.Player.position).all()
    for p in players:
        if p.position > deleted_position:
            p.position -= 1
    db.commit()

# -- Match/Result CRUD --
def get_match(db: Session, match_id: int) -> Optional[models.Match]:
    return db.query(models.Match).filter(models.Match.id == match_id).first()

def get_matches(db: Session, round_id: Optional[int] = None, tournament_id: Optional[int] = None) -> List[models.Match]:
    query = db.query(models.Match)
    if round_id:
        query = query.filter(models.Match.round_id == round_id)
    if tournament_id:
        query = query.filter(models.Match.tournament_id == tournament_id)
    return query.all()


def update_match_result(db: Session, match_id: int, game_results: List[dict]) -> dict:
    match = get_match(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    white_score = 0.0
    black_score = 0.0

    for res in game_results:
        game = db.query(models.Game).filter(
            models.Game.match_id == match_id,
            models.Game.board_number == res["board_number"]
        ).first()
        if not game:
            continue
        game.result = res["result"]
        game.is_completed = True
        if res["result"] == "white_win":
            game.white_score, game.black_score = 1.0, 0.0
        elif res["result"] == "black_win":
            game.white_score, game.black_score = 0.0, 1.0
        else:
            game.white_score = game.black_score = 0.5
        if game.white_player.team_id == match.white_team_id:
            white_score += game.white_score
            black_score += game.black_score
        else:
            white_score += game.black_score
            black_score += game.white_score
        update_player_stats(db, game.white_player_id, game.white_score)
        update_player_stats(db, game.black_player_id, game.black_score)

    match.white_score = white_score
    match.black_score = black_score
    match.is_completed = True
    match.completed_date = models.func.now()
    if white_score > black_score:
        match.result = "white_win"
    elif black_score > white_score:
        match.result = "black_win"
    else:
        match.result = "draw"

    db.commit()
    calculate_standings(db, match.tournament_id)

    # Check round completion
    round_matches = db.query(models.Match).filter(models.Match.round_id == match.round_id).all()
    if all(m.is_completed for m in round_matches):
        match.round.is_completed = True
        db.commit()
        completed = db.query(models.Round).filter(
            models.Round.tournament_id == match.tournament_id,
            models.Round.is_completed == True
        ).count()
        tournament = get_tournament(db, match.tournament_id)
        if tournament:
            tournament.current_round = completed + 1
            db.commit()

    return {"message": "Match result updated successfully"}

def update_player_stats(db: Session, player_id: int, score: float):
    player = get_player(db, player_id)
    if not player:
        return
    player.games_played += 1
    player.points += score
    if score == 1.0:
        player.wins += 1
    elif score == 0.5:
        player.draws += 1
    else:
        player.losses += 1

def get_best_players(db: Session, tournament_id: int) -> List[dict]:
    tour = get_tournament(db, tournament_id)
    if not tour:
        return []
    stats = []
    for team in tour.teams:
        for p in team.players:
            total = p.wins + p.draws + p.losses
            win_pct = (p.points / total * 100) if total else 0
            perf = p.rating + int((p.points / total - 0.5) * 400) if total else p.rating
            stats.append({
                "player_id": p.id,
                "player_name": p.name,
                "team_id": team.id,
                "rating": p.rating,
                "games_played": total,
                "wins": p.wins,
                "draws": p.draws,
                "losses": p.losses,
                "points": p.points,
                "win_percentage": win_pct,
                "performance_rating": perf
            })
    stats.sort(key=lambda x: (-x["wins"], -x["win_percentage"], -x["rating"]))
    for idx, row in enumerate(stats, start=1):
        row["position"] = idx
    return stats
