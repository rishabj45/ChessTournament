from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Base schemas
class PlayerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    rating: int = Field(default=1200, ge=0, le=3000)
    board_order: int = Field(default=1, ge=1, le=6)

class PlayerCreate(PlayerBase):
    team_id: int

class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    rating: Optional[int] = Field(None, ge=0, le=3000)
    board_order: Optional[int] = Field(None, ge=1, le=6)

class Player(PlayerBase):
    id: int
    team_id: int
    games_played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    points: float = 0.0
    created_at: datetime
    
    class Config:
        from_attributes = True

# Team schemas
class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class TeamCreate(TeamBase):
    tournament_id: int
    captain_id: Optional[int] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    captain_id: Optional[int] = None

class Team(TeamBase):
    id: int
    tournament_id: int
    captain_id: Optional[int] = None
    match_points: float = 0.0
    game_points: float = 0.0
    sonneborn_berger: float = 0.0
    created_at: datetime
    players: List[Player] = []
    
    class Config:
        from_attributes = True

# Game schemas
class GameBase(BaseModel):
    board_number: int = Field(..., ge=1, le=4)
    white_player_id: int
    black_player_id: int

class GameCreate(GameBase):
    match_id: int

class GameResult(BaseModel):
    result: str = Field(..., pattern="^(white_win|black_win|draw|pending)$")

class Game(GameBase):
    id: int
    match_id: int
    result: str = "pending"
    white_score: float = 0.0
    black_score: float = 0.0
    is_completed: bool = False
    notes: Optional[str] = None
    white_player: Player
    black_player: Player
    
    class Config:
        from_attributes = True

# Match schemas
class MatchBase(BaseModel):
    round_number: int = Field(..., ge=1)
    home_team_id: int
    away_team_id: int
    scheduled_date: Optional[datetime] = None

class MatchCreate(MatchBase):
    tournament_id: int
    round_id: int

class MatchResult(BaseModel):
    games: List[GameResult]

class Match(MatchBase):
    id: int
    tournament_id: int
    round_id: int
    home_score: float = 0.0
    away_score: float = 0.0
    result: str = "pending"
    completed_date: Optional[datetime] = None
    is_completed: bool = False
    home_team: Team
    away_team: Team
    games: List[Game] = []
    
    class Config:
        from_attributes = True

# Round schemas
class RoundBase(BaseModel):
    round_number: int = Field(..., ge=1)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class RoundCreate(RoundBase):
    tournament_id: int

class Round(RoundBase):
    id: int
    tournament_id: int
    is_completed: bool = False
    created_at: datetime
    matches: List[Match] = []
    
    class Config:
        from_attributes = True

# Tournament schemas
class TournamentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class TournamentCreate(TournamentBase):
    team_names: List[str] = Field(..., min_length=2)
    players_per_team: List[List[PlayerBase]] = Field(..., min_length=2)

class TournamentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(active|completed|paused)$")

class Tournament(TournamentBase):
    id: int
    status: str = "active"
    current_round: int = 1
    total_rounds: int
    created_at: datetime
    updated_at: datetime
    teams: List[Team] = []
    
    class Config:
        from_attributes = True

# Standings schemas
class TeamStanding(BaseModel):
    position: int
    team: Team
    matches_played: int
    match_points: float
    game_points: float
    sonneborn_berger: float

class Standings(BaseModel):
    tournament: Tournament
    standings: List[TeamStanding]

# Player statistics
class PlayerStats(BaseModel):
    player: Player
    position: int
    win_percentage: float
    performance_rating: Optional[int] = None

class BestPlayers(BaseModel):
    tournament: Tournament
    players: List[PlayerStats]

# Authentication schemas
class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    is_admin: bool = False

class PlayerResponse(BaseModel):
    id: int
    name: str
    rating: int
    team_id: int
    board_order: int
    games_played: int
    wins: int
    draws: int
    losses: int
    points: float

    class Config:
        orm_mode = True

class PlayerWithStats(BaseModel):
    id: int
    name: str
    rating: int
    team_id: int
    team_name: Optional[str]
    tournament_id: Optional[int]
    board_preference: Optional[int] = None
    is_substitute: Optional[bool] = False
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    # Statistics
    total_games: int
    wins: int
    draws: int
    losses: int
    points: float
    win_percentage: float
    games_as_white: int
    games_as_black: int
    white_win_percentage: float

    class Config:
        orm_mode = True

class PlayerRanking(BaseModel):
    id: int
    name: str
    rating: int
    team_id: int
    team_name: Optional[str]
    points: float
    rank: int

    class Config:
        orm_mode = True

class GameResultSubmit(BaseModel):
    board_number: int
    result: str  # e.g. "1-0", "0-1", "1/2-1/2"

class MatchUpdate(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    played_date: Optional[datetime] = None

class MatchResponse(BaseModel):
    id: int
    round_id: int
    home_team_id: int
    away_team_id: int
    scheduled_date: Optional[datetime]
    status: str
    home_score: Optional[int]
    away_score: Optional[int]

    class Config:
        orm_mode = True

class GameResponse(BaseModel):
    id: int
    match_id: int
    board_number: int
    white_player_id: int
    black_player_id: int
    result: Optional[str]

    class Config:
        orm_mode = True

class MatchWithGamesResponse(MatchResponse):
    games: List[GameResponse]