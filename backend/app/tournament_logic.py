from typing import List, Tuple, Dict
from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, timedelta
import itertools
import random


from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from .models import Team, Tournament, Round, Match, Game, Player
from .schemas import TournamentCreate

def generate_round_robin_schedule(
    teams: List[Team]
) -> List[List[Tuple[Optional[Team], Optional[Team]]]]:
    """
    Circle method for round-robin.
    Returns a list of rounds; each round is a list of (white, black) Team pairs.
    Inserts None for byes when odd number of teams.
    """
    n = len(teams)
    # If odd, append a dummy None (bye)
    if n % 2 == 1:
        teams = teams + [None]
        n += 1

    schedule: List[List[Tuple[Optional[Team], Optional[Team]]]] = []
    for round_idx in range(n - 1):
        pairs: List[Tuple[Optional[Team], Optional[Team]]] = []
        for i in range(n // 2):
            white = teams[i]
            black = teams[n - 1 - i]
            # skip None–None
            if white is None and black is None:
                continue
            # alternate white/black for fairness
            if (round_idx % 2) == 0:
                pairs.append((white, black))
            else:
                pairs.append((black, white))
        schedule.append(pairs)
        # rotate all except first
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]
    return schedule


def create_tournament_structure(
    db: Session,
    data: TournamentCreate
) -> Tournament:
    """Create a tournament, its teams, players, rounds, matches, and games."""
    # 1️⃣ Tournament
    tour = Tournament(
        name=data.name,
        description=data.description,
        start_date=data.start_date or datetime.utcnow(),
        end_date=data.end_date,
        status="active"
    )
    db.add(tour)
    db.flush()  # get tour.id

    # 2️⃣ Teams & Players
    teams: List[Team] = []
    for tname, plist in zip(data.team_names, data.players_per_team):
        team = Team(name=tname, tournament_id=tour.id)
        db.add(team)
        db.flush()
        for idx, p in enumerate(plist, start=1):
            db.add(Player(
                name=p.name,
                rating=p.rating,
                team_id=team.id,
                board_order=idx
            ))
        teams.append(team)

    # 3️⃣ Schedule
    schedule = generate_round_robin_schedule(teams)
    tour.total_rounds = len(schedule)

    # 4️⃣ Persist Rounds, Matches, Games
    for rn, round_pairs in enumerate(schedule, start=1):
        rd = Round(
            tournament_id=tour.id,
            round_number=rn,
            start_date=tour.start_date + timedelta(days=(rn - 1) * 7),
            end_date=tour.start_date + timedelta(days=rn * 7 - 1)
        )
        db.add(rd)
        db.flush()
        for white, black in round_pairs:
            # bye if needed
            if white is None or black is None:
                continue

            match = Match(
                tournament_id=tour.id,
                round_id=rd.id,
                round_number=rn,
                white_team_id=white.id,
                black_team_id=black.id,
                scheduled_date=rd.start_date + timedelta(days=3)
            )
            db.add(match)
            db.flush()
            create_match_games(db, match, white, black)

    db.commit()
    return tour


def create_match_games(db: Session, match: Match, white: Team, black: Team):
    """Create 4 board games for a match, alternating colors."""
    # pick top-4 by rating then board_order
    hp = sorted(white.players, key=lambda p: (-p.rating, p.board_order))[:4]
    ap = sorted(black.players, key=lambda p: (-p.rating, p.board_order))[:4]
    if len(hp) < 4 or len(ap) < 4:
        raise ValueError("Each team needs at least 4 players")

    for board in range(1, 5):
        if board in (1, 3):
            white, black = hp[board - 1], ap[board - 1]
        else:
            white, black = ap[board - 1], hp[board - 1]
        db.add(Game(
            match_id=match.id,
            board_number=board,
            white_player_id=white.id,
            black_player_id=black.id,
            result="pending"
        ))

def calculate_standings(db: Session, tournament_id: int) -> List[Dict]:
    """Calculate tournament standings with Sonneborn-Berger tiebreaker"""

    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        return []

    teams = db.query(models.Team).filter(models.Team.tournament_id == tournament_id).all()

    standings = []
    for team in teams:
        matches = db.query(models.Match).filter(
            (models.Match.white_team_id == team.id) | (models.Match.black_team_id == team.id),
            models.Match.tournament_id == tournament_id
        ).all()

        match_points = 0.0
        game_points = 0.0
        sonneborn_berger = 0.0
        matches_played = 0
        wins = 0
        draws = 0
        losses = 0

        for match in matches:
            if not match.is_completed:
                continue

            matches_played += 1
            is_white = match.white_team_id == team.id
            team_score = match.white_score if is_white else match.black_score
            opponent_score = match.black_score if is_white else match.white_score
            opponent_id = match.black_team_id if is_white else match.white_team_id

            game_points += team_score

            if team_score > opponent_score:
                match_points += 2.0
                wins += 1
            elif team_score == opponent_score:
                match_points += 1.0
                draws += 1
            else:
                losses += 1

            opponent_team = db.query(models.Team).filter(models.Team.id == opponent_id).first()
            if opponent_team:
                opponent_total_points = calculate_team_total_points(db, opponent_team.id, tournament_id)
                sonneborn_berger += team_score * opponent_total_points

        team.match_points = match_points
        team.game_points = game_points
        team.sonneborn_berger = sonneborn_berger

        standings.append({
            'team': team,
            'matches_played': matches_played,
            'match_points': match_points,
            'game_points': game_points,
            'sonneborn_berger': sonneborn_berger,
            'wins': wins,
            'draws': draws,
            'losses': losses
        })

    standings.sort(key=lambda x: (-x['match_points'], -x['game_points'], -x['sonneborn_berger']))

    for i, standing in enumerate(standings):
        standing['position'] = i + 1

    db.commit()
    return standings


def calculate_team_total_points(db: Session, team_id: int, tournament_id: int) -> float:
    """Calculate total match points for a team"""
    matches = db.query(models.Match).filter(
        (models.Match.white_team_id == team_id) | (models.Match.black_team_id == team_id),
        models.Match.tournament_id == tournament_id,
        models.Match.is_completed == True
    ).all()
    
    total_points = 0.0
    for match in matches:
        is_white = match.white_team_id == team_id
        team_score = match.white_score if is_white else match.black_score
        opponent_score = match.black_score if is_white else match.white_score
        
        if team_score > opponent_score:
            total_points += 2.0
        elif team_score == opponent_score:
            total_points += 1.0
    
    return total_points



def update_match_result(db: Session, match_id: int, game_results: list):
    """Update match result based on individual game results and handle round/tournament progress"""
    
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise ValueError("Match not found")
    
    # Update individual games
    white_score = 0.0
    black_score = 0.0
    
    for game_result in game_results:
        game = db.query(models.Game).filter(
            models.Game.match_id == match_id,
            models.Game.board_number == game_result['board_number']
        ).first()
        
        if not game:
            continue
        
        game.result = game_result['result']
        game.is_completed = True
        
        # Calculate scores
        if game_result['result'] == 'white_win':
            game.white_score = 1.0
            game.black_score = 0.0
        elif game_result['result'] == 'black_win':
            game.white_score = 0.0
            game.black_score = 1.0
        elif game_result['result'] == 'draw':
            game.white_score = 0.5
            game.black_score = 0.5
        
        # Add to team scores
        if game.white_player.team_id == match.white_team_id:
            white_score += game.white_score
            black_score += game.black_score
        else:
            white_score += game.black_score
            black_score += game.white_score
        
        # Update player statistics
        update_player_stats(db, game.white_player_id, game.white_score)
        update_player_stats(db, game.black_player_id, game.black_score)
    
    # Update match
    match.white_score = white_score
    match.black_score = black_score
    match.is_completed = True
    match.completed_date = datetime.utcnow()
    
    # Determine match result
    if white_score > black_score:
        match.result = "white_win"
    elif black_score > white_score:
        match.result = "black_win"
    else:
        match.result = "draw"
    
    db.commit()
    
    # Recalculate standings
    calculate_standings(db, match.tournament_id)
    
    # ✅ ROUND COMPLETION CHECK
    round_matches = db.query(models.Match).filter(models.Match.round_id == match.round_id).all()
    if all(m.is_completed for m in round_matches):
        match.round.is_completed = True
        db.commit()

        # Update tournament current_round
        completed_rounds = db.query(models.Round).filter(
            models.Round.tournament_id == match.tournament_id,
            models.Round.is_completed == True
        ).count()

        tournament = db.query(models.Tournament).filter(models.Tournament.id == match.tournament_id).first()
        tournament.current_round = completed_rounds + 1
        db.commit()


def update_player_stats(db: Session, player_id: int, score: float):
    """Update player statistics after a game"""
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
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

def get_best_players(db: Session, tournament_id: int) -> List[Dict]:
    tour = db.query(models.Tournament).get(tournament_id)
    if not tour:
        return []

    stats = []
    for team in tour.teams:
        for p in team.players:
            # Now p.team is already loaded and p.games_played, p.points, etc.
            if p.games_played:
                win_pct = p.points / p.games_played * 100
                perf = p.rating + int((p.points / p.games_played - 0.5) * 400)
            else:
                win_pct, perf = 0.0, p.rating

            stats.append({
                "player_id":          p.id,
                "player_name":        p.name,
                "team_id":            team.id,
                "rating":             p.rating,
                "games_played":       p.games_played,
                "wins":               p.wins,
                "draws":              p.draws,
                "losses":             p.losses,
                "points":             p.points,
                "win_percentage":     win_pct,
                "performance_rating": perf,
            })

    # sort & assign positions
    stats.sort(key=lambda x: (-x["wins"], -x["win_percentage"], -x["rating"]))
    for idx, row in enumerate(stats, start=1):
        row["position"] = idx

    return stats


def update_board_result(db: Session, game_id: int, result: str):
    """
    Update the result of a single board (game) and update player stats.
    result should be one of: 'white_win', 'black_win', 'draw'
    """
    game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not game:
        raise ValueError("Game not found")

    # Set result and scores
    game.result = result
    game.is_completed = True

    if result == 'white_win':
        game.white_score = 1.0
        game.black_score = 0.0
    elif result == 'black_win':
        game.white_score = 0.0
        game.black_score = 1.0
    elif result == 'draw':
        game.white_score = 0.5
        game.black_score = 0.5
    else:
        raise ValueError("Invalid result value")

    # Update player stats
    update_player_stats(db, game.white_player_id, game.white_score)
    update_player_stats(db, game.black_player_id, game.black_score)

    db.commit()