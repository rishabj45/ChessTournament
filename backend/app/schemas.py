### backend/app/schemas.py
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, field_validator
# -- Tournament Schemas --
class TournamentBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime]
    end_date: Optional[datetime]

class TournamentCreate(TournamentBase):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime]
    end_date: Optional[datetime] = None
    team_names: List[str]
    players_per_team: List[int]

class TournamentUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]

class TournamentResponse(TournamentBase):
    id: int
    status: str
    current_round: int
    total_rounds: Optional[int]
    class Config:
        from_attributes = True

# -- Team Schemas --
class TeamBase(BaseModel):
    name: str
    tournament_id: int

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str]

class TeamResponse(TeamBase):
    id: int
    match_points: float
    game_points: float
    class Config:
        from_attributes = True

# -- Player Schemas --
class PlayerBase(BaseModel):
    name: str
    team_id: int
    position: Optional[int]

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    name: Optional[str]
    position: Optional[int]

class PlayerResponse(PlayerBase):
    id: int
    rating: int
    games_played: int
    wins: int
    draws: int
    losses: int
    points: float
    class Config:
        from_attributes = True

# -- Game/Round/Match Schemas --
class GameCreate(BaseModel):
    white_player_id: int
    black_player_id: int
    board_number: int

class GameResponse(BaseModel):
    id: int
    board_number: int
    white_player_id: int
    black_player_id: int
    result: Optional[str]
    white_score: float
    black_score: float
    is_completed: bool
    class Config:
        from_attributes = True

class GameSimpleResultUpdate(BaseModel):
    result: str  # 'white', 'black', or 'draw'

    @field_validator("result")
    @classmethod
    def validate_result(cls, v):
        allowed = {"white_win", "black_win", "draw"}
        if v not in allowed:
            raise ValueError(f"result must be one of {allowed}")
        return v


class RoundResponse(BaseModel):
    round_number: int
    is_completed: bool
    games: List[GameResponse]

class MatchResponse(BaseModel):
    id: int
    round_number: int
    white_team_id: int
    black_team_id: int
    white_score: float
    black_score: float
    result: Optional[str]
    scheduled_date: Optional[datetime]
    is_completed: bool
    games: List[GameResponse]
    class Config:
        from_attributes = True

class StandingsEntry(BaseModel):
    team_id: int
    team_name: str
    match_points: float
    game_points: float
    sonneborn_berger: float
    class Config:
        from_attributes = True

class StandingsResponse(BaseModel):
    standings: List[StandingsEntry]

class BestPlayerEntry(BaseModel):
    player_id: int
    player_name: str
    team_id: int
    rating: int
    games_played: int
    wins: int
    draws: int
    losses: int
    points: float
    win_percentage: float
    performance_rating: int
    position: int

class BestPlayersResponse(BaseModel):
    tournament_id: int
    tournament_name: str
    players: List[BestPlayerEntry]
