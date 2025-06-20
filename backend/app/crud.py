from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from . import models, schemas
from .tournament_logic import create_tournament_structure, calculate_standings, update_match_result, get_best_players

# Tournament CRUD
def get_tournament(db: Session, tournament_id: int) -> Optional[models.Tournament]:
    return db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()

def get_current_tournament(db: Session) -> Optional[models.Tournament]:
    return db.query(models.Tournament).filter(models.Tournament.status == "active").first()

def get_tournaments(db: Session, skip: int = 0, limit: int = 100) -> List[models.Tournament]:
    return db.query(models.Tournament).offset(skip).limit(limit).all()

def create_tournament(db: Session, tournament: schemas.TournamentCreate) -> models.Tournament:
    return create_tournament_structure(db, tournament)

def update_tournament(db: Session, tournament_id: int, tournament_update: schemas.TournamentUpdate) -> Optional[models.Tournament]:
    tournament = get_tournament(db, tournament_id)
    if not tournament:
        return None
    
    update_data = tournament_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tournament, field, value)
    
    db.commit()
    db.refresh(tournament)
    return tournament

# Team CRUD
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
    
    update_data = team_update.dict(exclude_unset=True)
    for field, value in update_data.items():
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

# Player CRUD
def get_player(db: Session, player_id: int) -> Optional[models.Player]:
    return db.query(models.Player).filter(models.Player.id == player_id).first()

def get_players(db: Session, team_id: Optional[int] = None, tournament_id: Optional[int] = None) -> List[models.Player]:
    query = db.query(models.Player)
    
    if team_id:
        query = query.filter(models.Player.team_id == team_id)
    elif tournament_id:
        query = query.join(models.Team).filter(models.Team.tournament_id == tournament_id)
    
    return query.order_by(models.Player.team_id, models.Player.board_order).all()

def create_player(db: Session, player: schemas.PlayerCreate) -> models.Player:
    # Check team player limit
    team = get_team(db, player.team_id)
    if not team:
        raise ValueError("Team not found")
    
    player_count = db.query(models.Player).filter(models.Player.team_id == player.team_id).count()
    if player_count >= 6:
        raise ValueError("Team cannot have more than 6 players")
    
    db_player = models.Player(**player.dict())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

def update_player(db: Session, player_id: int, player_update: schemas.PlayerUpdate) -> Optional[models.Player]:
    player = get_player(db, player_id)
    if not player:
        return None
    
    update_data = player_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(player, field, value)
    
    db.commit()
    db.refresh(player)
    return player

def delete_player(db: Session, player_id: int) -> bool:
    player = get_player(db, player_id)
    if not player:
        return False
    
    # Check minimum team size
    team_player_count = db.query(models.Player).filter(models.Player.team_id == player.team_id).count()
    if team_player_count <= 4:
        raise ValueError("Team must have at least 4 players")
    
    db.delete(player)
    db.commit()
    return True

# Match CRUD
def get_match(db: Session, match_id: int) -> Optional[models.Match]:
    return db.query(models.Match).filter(models.Match.id == match_id).first()

def get_matches(db: Session, tournament_id: Optional[int] = None, round_number: Optional[int] = None) -> List[models.Match]:
    query = db.query(models.Match)
    
    if tournament_id:
        query = query.filter(models.Match.tournament_id == tournament_id)
    if round_number:
        query = query.filter(models.Match.round_number == round_number)
    
    return query.order_by(models.Match.round_number, models.Match.id).all()

def submit_match_result(db: Session, match_id: int, game_results: List[dict]) -> Optional[models.Match]:
    match = get_match(db, match_id)
    if not match:
        return None
    
    # Validate game results format
    for result in game_results:
        if not all(key in result for key in ['board_number', 'result']):
            raise ValueError("Invalid game result format")
        if result['result'] not in ['white_win', 'black_win', 'draw']:
            raise ValueError("Invalid game result value")
        if result['board_number'] not in [1, 2, 3, 4]:
            raise ValueError("Invalid board number")
    
    update_match_result(db, match_id, game_results)
    return get_match(db, match_id)

# Round CRUD
def get_round(db: Session, round_id: int) -> Optional[models.Round]:
    return db.query(models.Round).filter(models.Round.id == round_id).first()

def get_rounds(db: Session, tournament_id: int) -> List[models.Round]:
    return db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id
    ).order_by(models.Round.round_number).all()

# Game CRUD
def get_game(db: Session, game_id: int) -> Optional[models.Game]:
    return db.query(models.Game).filter(models.Game.id == game_id).first()

def get_games(db: Session, match_id: int) -> List[models.Game]:
    return db.query(models.Game).filter(
        models.Game.match_id == match_id
    ).order_by(models.Game.board_number).all()

# Standings and Statistics
def get_tournament_standings(db: Session, tournament_id: int) -> List[dict]:
    return calculate_standings(db, tournament_id)

def get_tournament_best_players(db: Session, tournament_id: int) -> List[dict]:
    return get_best_players(db, tournament_id)

# Utility functions
def get_team_players_by_rating(db: Session, team_id: int, limit: int = 4) -> List[models.Player]:
    """Get top players from a team ordered by rating"""
    return db.query(models.Player).filter(
        models.Player.team_id == team_id
    ).order_by(desc(models.Player.rating), models.Player.board_order).limit(limit).all()

def get_next_matches(db: Session, tournament_id: int, limit: int = 10) -> List[models.Match]:
    """Get upcoming matches"""
    return db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.is_completed == False
    ).order_by(models.Match.scheduled_date).limit(limit).all()

def get_recent_results(db: Session, tournament_id: int, limit: int = 10) -> List[models.Match]:
    """Get recently completed matches"""
    return db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.is_completed == True
    ).order_by(desc(models.Match.completed_date)).limit(limit).all()

def get_tournament_progress(db: Session, tournament_id: int) -> dict:
    """Get tournament progress statistics"""
    tournament = get_tournament(db, tournament_id)
    if not tournament:
        return {}
    
    total_matches = db.query(models.Match).filter(models.Match.tournament_id == tournament_id).count()
    completed_matches = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.is_completed == True
    ).count()
    
    completed_rounds = db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id,
        models.Round.is_completed == True
    ).count()
    
    return {
        'tournament': tournament,
        'total_matches': total_matches,
        'completed_matches': completed_matches,
        'completion_percentage': (completed_matches / total_matches * 100) if total_matches > 0 else 0,
        'current_round': tournament.current_round,
        'total_rounds': tournament.total_rounds,
        'completed_rounds': completed_rounds
    }