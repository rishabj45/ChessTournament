from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Tournament(Base):
    __tablename__ = "tournaments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    start_date = Column(DateTime, default=func.now())
    end_date = Column(DateTime)
    status = Column(String(50), default="active")  # active, completed, paused
    current_round = Column(Integer, default=1)
    total_rounds = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    teams = relationship("Team", back_populates="tournament", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="tournament", cascade="all, delete-orphan")
    rounds = relationship("Round", back_populates="tournament", cascade="all, delete-orphan")

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    captain_id = Column(Integer, ForeignKey("players.id"))
    match_points = Column(Float, default=0.0)  # Team match points
    game_points = Column(Float, default=0.0)   # Individual game points
    sonneborn_berger = Column(Float, default=0.0)  # Tiebreaker
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    tournament = relationship("Tournament", back_populates="teams")
    players = relationship(
        "Player",
        back_populates="team",
        cascade="all, delete-orphan",
        foreign_keys="[Player.team_id]"  # <-- Specify the foreign key here
    )
    captain = relationship("Player", foreign_keys=[captain_id])
    white_matches = relationship("Match", foreign_keys="Match.white_team_id", back_populates="white_team")
    black_matches = relationship("Match", foreign_keys="Match.black_team_id", back_populates="black_team")

class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    rating = Column(Integer, default=1200)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    board_order = Column(Integer, default=1)  # 1-6, determines playing order
    games_played = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    draws = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    points = Column(Float, default=0.0)  # wins + 0.5*draws
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    team = relationship(
        "Team",
        back_populates="players",
        foreign_keys=[team_id]  # <-- Specify the foreign key here
    )
    white_games = relationship("Game", foreign_keys="Game.white_player_id", back_populates="white_player")
    black_games = relationship("Game", foreign_keys="Game.black_player_id", back_populates="black_player")

class Round(Base):
    __tablename__ = "rounds"
    
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    tournament = relationship("Tournament", back_populates="rounds")
    matches = relationship("Match", back_populates="round", cascade="all, delete-orphan")

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    white_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    black_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    white_score = Column(Float, default=0.0)  
    black_score = Column(Float, default=0.0)  
    result = Column(String(10))
    scheduled_date = Column(DateTime)
    completed_date = Column(DateTime)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    tournament = relationship("Tournament", back_populates="matches")
    round = relationship("Round", back_populates="matches")
    white_team = relationship("Team", foreign_keys=[white_team_id], back_populates="white_matches")
    black_team = relationship("Team", foreign_keys=[black_team_id], back_populates="black_matches")
    games = relationship("Game", back_populates="match", cascade="all, delete-orphan")

class Game(Base):
    __tablename__ = "games"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    board_number = Column(Integer, nullable=False)  # 1-4
    white_player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    black_player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    result = Column(String(10))  # "white_win", "black_win", "draw", "pending"
    white_score = Column(Float, default=0.0)  # 1, 0.5, or 0
    black_score = Column(Float, default=0.0)  # 1, 0.5, or 0
    is_completed = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    match = relationship("Match", back_populates="games")
    white_player = relationship("Player", foreign_keys=[white_player_id], back_populates="white_games")
    black_player = relationship("Player", foreign_keys=[black_player_id], back_populates="black_games")