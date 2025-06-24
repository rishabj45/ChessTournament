### backend/app/tournament_logic.py
from typing import List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from .models import Tournament, Round, Match, Game,Team, Player
from . import schemas

from typing import List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from .models import Tournament, Round, Match, Game, Team, Player
from . import schemas

def create_tournament_structure(db: Session,data: schemas.TournamentCreate):
    """
    Create tournament, teams, players, rounds, matches, and games.
    """
    # Step 1: Create the tournament
    tour = Tournament(
        name=data.name,
        description=data.description,
        start_date=data.start_date or datetime.utcnow(),
        end_date=data.end_date,
        status="active"
    )
    db.add(tour)
    db.flush()  # To get tour.id

    # Step 2: Create teams and players
    teams = []
    for name, num_players in zip(data.team_names, data.players_per_team):
        team = Team(name=name, tournament_id=tour.id)
        db.add(team)
        db.flush()
        teams.append(team)

        for i in range(num_players):
            player = Player(
                name=f"Player {i + 1} of {name}",
                team_id=team.id
            )
            db.add(player)

    db.flush()

    # Step 3: Generate all rounds using round-robin logic
    team_ids = [team.id for team in teams]
    all_rounds = generate_all_round_robin_rounds(team_ids)
    tour.total_rounds = len(all_rounds)
    db.commit()

    # Step 4: Create rounds, matches, and games
    for round_num, pairings in enumerate(all_rounds, start=1):
        rnd = Round(tournament_id=tour.id, round_number=round_num)
        db.add(rnd)
        db.flush()

        for white_id, black_id in pairings:
            match = Match(
                tournament_id=tour.id,
                round_id=rnd.id,
                round_number=round_num,
                white_team_id=white_id,
                black_team_id=black_id
            )
            db.add(match)
            db.flush()

            white_players = db.query(Player).filter_by(team_id=white_id).order_by(Player.id).all()
            black_players = db.query(Player).filter_by(team_id=black_id).order_by(Player.id).all()

            for board_num, (wp, bp) in enumerate(zip(white_players, black_players), start=1):
                game = Game(
                    match_id=match.id,
                    board_number=board_num,
                    white_player_id=wp.id,
                    black_player_id=bp.id
                )
                db.add(game)

    db.commit()
    return tour



def calculate_standings(db: Session, tournament_id: int) -> List[dict]:
    """
    Update team standings (match/game points, Sonneborn-Berger).
    """
    tour = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tour:
        return []

    # Reset all team scores
    team_dict = {team.id: team for team in tour.teams}
    for team in team_dict.values():
        team.match_points = 0.0
        team.game_points = 0.0
        team.sonneborn_berger = 0.0
    db.commit()

    for m in tour.matches:
        if not m.is_completed:
            continue

        white_team = team_dict.get(m.white_team_id)
        black_team = team_dict.get(m.black_team_id)
        if not white_team or not black_team:
            continue

        white_team.game_points += m.white_score
        black_team.game_points += m.black_score

        if m.result == "white_win":
            white_team.match_points += 2
            black_team.match_points += 0
            white_team.sonneborn_berger += m.white_score + m.black_score
        elif m.result == "black_win":
            black_team.match_points += 2
            white_team.match_points += 0
            black_team.sonneborn_berger += m.white_score + m.black_score
        elif m.result == "draw":
            white_team.match_points += 1
            black_team.match_points += 1
            white_team.sonneborn_berger += black_team.match_points
            black_team.sonneborn_berger += white_team.match_points

    db.commit()

    return [
        {
            "team_id": t.id,
            "team_name": t.name,
            "match_points": t.match_points,
            "game_points": t.game_points,
            "sonneborn_berger": t.sonneborn_berger,
        }
        for t in sorted(team_dict.values(), key=lambda x: (-x.match_points, -x.game_points))
    ]


def generate_all_round_robin_rounds(team_ids: List[int]) -> List[List[Tuple[int, int]]]:
    """
    Generate all rounds using the circle method for round-robin scheduling.
    Returns a list of rounds, where each round is a list of (white_team_id, black_team_id) tuples.
    """
    teams = team_ids[:]
    if len(teams) % 2 != 0:
        teams.append(None)  # Add a dummy for byes

    total_rounds = len(teams) - 1
    half = len(teams) // 2
    rounds: List[List[Tuple[int, int]]] = []

    for round_num in range(1, total_rounds + 1):
        arr = teams[:]
        for _ in range(round_num - 1):
            arr = [arr[0]] + [arr[-1]] + arr[1:-1]  # rotate

        pairings: List[Tuple[int, int]] = []
        for i in range(half):
            t1, t2 = arr[i], arr[-i - 1]
            if t1 is None or t2 is None:
                continue
            if round_num % 2 == 0:
                t1, t2 = t2, t1  # alternate home/away
            pairings.append((t1, t2))

        rounds.append(pairings)

    return rounds

