from typing import List, Tuple, Dict
from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, timedelta
import itertools
import random

def generate_round_robin_schedule(teams: List[models.Team]) -> List[List[Tuple[int, int]]]:
    """
    Generate round-robin schedule with fair color distribution.
    Returns list of rounds, each containing list of (home_team_id, away_team_id) tuples.
    """
    num_teams = len(teams)
    team_ids = [team.id for team in teams]
    
    if num_teams < 2:
        return []
    
    # Handle odd number of teams by adding a "bye"
    if num_teams % 2 == 1:
        team_ids.append(None)  # None represents bye
        num_teams += 1
    
    # Generate round-robin pairings
    rounds = []
    n = num_teams
    
    # Create rotation schedule
    for round_num in range(n - 1):
        round_matches = []
        
        # Generate matches for this round
        for i in range(n // 2):
            team1_idx = i
            team2_idx = n - 1 - i
            
            team1 = team_ids[team1_idx]
            team2 = team_ids[team2_idx]
            
            # Skip if either team is bye
            if team1 is None or team2 is None:
                continue
            
            # Determine home/away for color balance
            # Alternate home advantage and consider round number for fairness
            if (round_num + i) % 2 == 0:
                round_matches.append((team1, team2))  # team1 home
            else:
                round_matches.append((team2, team1))  # team2 home
        
        rounds.append(round_matches)
        
        # Rotate teams (keep first team fixed, rotate others)
        team_ids = [team_ids[0]] + [team_ids[-1]] + team_ids[1:-1]
    
    return rounds

def create_tournament_structure(
    db: Session,
    tournament_data: schemas.TournamentCreate
) -> models.Tournament:
    """Create complete tournament structure with teams, players, and matches"""
    
    # Create tournament
    tournament = models.Tournament(
        name=tournament_data.name,
        description=tournament_data.description,
        start_date=tournament_data.start_date or datetime.utcnow(),
        end_date=tournament_data.end_date,
        status="active"
    )
    db.add(tournament)
    db.flush()  # Get tournament ID
    
    # Create teams and players
    teams = []
    for i, (team_name, team_players) in enumerate(zip(tournament_data.team_names, tournament_data.players_per_team)):
        team = models.Team(
            name=team_name,
            tournament_id=tournament.id
        )
        db.add(team)
        db.flush()  # Get team ID
        
        # Create players for this team
        for j, player_data in enumerate(team_players):
            player = models.Player(
                name=player_data.name,
                rating=player_data.rating,
                team_id=team.id,
                board_order=j + 1  # Ordered by input sequence
            )
            db.add(player)
        
        teams.append(team)
    
    # Generate tournament schedule
    schedule = generate_round_robin_schedule(teams)
    tournament.total_rounds = len(schedule)
    
    # Create rounds and matches
    for round_num, round_matches in enumerate(schedule, 1):
        # Create round
        round_obj = models.Round(
            tournament_id=tournament.id,
            round_number=round_num,
            start_date=tournament.start_date + timedelta(days=(round_num - 1) * 7),  # Weekly rounds
            end_date=tournament.start_date + timedelta(days=round_num * 7 - 1)
        )
        db.add(round_obj)
        db.flush()
        
        # Create matches for this round
        for home_team_id, away_team_id in round_matches:
            match = models.Match(
                tournament_id=tournament.id,
                round_id=round_obj.id,
                round_number=round_num,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                scheduled_date=round_obj.start_date + timedelta(days=3)  # Mid-week matches
            )
            db.add(match)
            db.flush()
            
            # Create games for this match (4 boards)
            home_team = db.query(models.Team).filter(models.Team.id == home_team_id).first()
            away_team = db.query(models.Team).filter(models.Team.id == away_team_id).first()
            
            create_match_games(db, match, home_team, away_team)
    
    db.commit()
    return tournament

def create_match_games(db: Session, match: models.Match, home_team: models.Team, away_team: models.Team):
    """Create individual games for a team match"""
    
    # Get top 4 players from each team by rating
    home_players = sorted(home_team.players, key=lambda p: (-p.rating, p.board_order))[:4]
    away_players = sorted(away_team.players, key=lambda p: (-p.rating, p.board_order))[:4]
    
    # Ensure we have 4 players from each team
    if len(home_players) < 4 or len(away_players) < 4:
        raise ValueError("Each team must have at least 4 players")
    
    # Create 4 board games
    # Home team gets white on boards 1,3 and black on boards 2,4
    for board in range(1, 5):
        if board in [1, 3]:  # Home team plays white
            white_player = home_players[board - 1]
            black_player = away_players[board - 1]
        else:  # Away team plays white
            white_player = away_players[board - 1]
            black_player = home_players[board - 1]
        
        game = models.Game(
            match_id=match.id,
            board_number=board,
            white_player_id=white_player.id,
            black_player_id=black_player.id,
            result="pending"
        )
        db.add(game)

def calculate_standings(db: Session, tournament_id: int) -> List[Dict]:
    """Calculate tournament standings with Sonneborn-Berger tiebreaker"""
    
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        return []
    
    # Get all teams
    teams = db.query(models.Team).filter(models.Team.tournament_id == tournament_id).all()
    
    # Calculate points for each team
    standings = []
    for team in teams:
        # Get all matches for this team
        matches = db.query(models.Match).filter(
            (models.Match.home_team_id == team.id) | (models.Match.away_team_id == team.id),
            models.Match.tournament_id == tournament_id
        ).all()
        
        match_points = 0.0
        game_points = 0.0
        sonneborn_berger = 0.0
        matches_played = 0
        
        for match in matches:
            if not match.is_completed:
                continue
                
            matches_played += 1
            is_home = match.home_team_id == team.id
            team_score = match.home_score if is_home else match.away_score
            opponent_score = match.away_score if is_home else match.home_score
            opponent_id = match.away_team_id if is_home else match.home_team_id
            
            # Game points (individual board results)
            game_points += team_score
            
            # Match points (2 for win, 1 for draw, 0 for loss)
            if team_score > opponent_score:
                match_points += 2.0
            elif team_score == opponent_score:
                match_points += 1.0
            
            # Sonneborn-Berger: sum of (points scored against opponent * opponent's total points)
            opponent_team = db.query(models.Team).filter(models.Team.id == opponent_id).first()
            if opponent_team:
                opponent_total_points = calculate_team_total_points(db, opponent_team.id, tournament_id)
                sonneborn_berger += team_score * opponent_total_points
        
        # Update team statistics
        team.match_points = match_points
        team.game_points = game_points
        team.sonneborn_berger = sonneborn_berger
        
        standings.append({
            'team': team,
            'matches_played': matches_played,
            'match_points': match_points,
            'game_points': game_points,
            'sonneborn_berger': sonneborn_berger
        })
    
    # Sort by match points, then game points, then Sonneborn-Berger
    standings.sort(key=lambda x: (-x['match_points'], -x['game_points'], -x['sonneborn_berger']))
    
    # Add positions
    for i, standing in enumerate(standings):
        standing['position'] = i + 1
    
    db.commit()
    return standings

def calculate_team_total_points(db: Session, team_id: int, tournament_id: int) -> float:
    """Calculate total match points for a team"""
    matches = db.query(models.Match).filter(
        (models.Match.home_team_id == team_id) | (models.Match.away_team_id == team_id),
        models.Match.tournament_id == tournament_id,
        models.Match.is_completed == True
    ).all()
    
    total_points = 0.0
    for match in matches:
        is_home = match.home_team_id == team_id
        team_score = match.home_score if is_home else match.away_score
        opponent_score = match.away_score if is_home else match.home_score
        
        if team_score > opponent_score:
            total_points += 2.0
        elif team_score == opponent_score:
            total_points += 1.0
    
    return total_points

def update_match_result(db: Session, match_id: int, game_results: List[Dict]):
    """Update match result based on individual game results"""
    
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise ValueError("Match not found")
    
    # Update individual games
    home_score = 0.0
    away_score = 0.0
    
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
        if game.white_player.team_id == match.home_team_id:
            home_score += game.white_score
            away_score += game.black_score
        else:
            home_score += game.black_score
            away_score += game.white_score
        
        # Update player statistics
        update_player_stats(db, game.white_player_id, game.white_score)
        update_player_stats(db, game.black_player_id, game.black_score)
    
    # Update match
    match.home_score = home_score
    match.away_score = away_score
    match.is_completed = True
    match.completed_date = datetime.utcnow()
    
    # Determine match result
    if home_score > away_score:
        match.result = "home_win"
    elif away_score > home_score:
        match.result = "away_win"
    else:
        match.result = "draw"
    
    db.commit()
    
    # Recalculate standings
    calculate_standings(db, match.tournament_id)

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
    """Get players ranked by performance"""
    players = db.query(models.Player).join(models.Team).filter(
        models.Team.tournament_id == tournament_id
    ).all()
    
    player_stats = []
    for player in players:
        if player.games_played == 0:
            win_percentage = 0.0
            performance_rating = player.rating
        else:
            win_percentage = (player.points / player.games_played) * 100
            # Simple performance rating calculation
            performance_rating = player.rating + int((player.points / player.games_played - 0.5) * 400)
        
        player_stats.append({
            'player': player,
            'win_percentage': win_percentage,
            'performance_rating': performance_rating
        })
    
    # Sort by wins first, then by win percentage, then by rating
    player_stats.sort(key=lambda x: (-x['player'].wins, -x['win_percentage'], -x['player'].rating))
    
    # Add positions
    for i, stats in enumerate(player_stats):
        stats['position'] = i + 1
    
    return player_stats

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