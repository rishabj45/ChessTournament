# # backend/app/api/players.py
# """
# API endpoints for player management in chess tournament system
# """

# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, and_, func
# from sqlalchemy.orm import selectinload
# from typing import List, Optional
# from datetime import datetime

# from ..database import get_db
# from ..models import Player, Team, Tournament, Game
# from ..schemas import (
#     PlayerCreate, 
#     PlayerUpdate, 
#     PlayerResponse, 
#     PlayerWithStats,
#     PlayerRanking
# )
# from ..auth import get_current_user, get_admin_user
# from ..crud import players as player_crud

# router = APIRouter(prefix="/api/players", tags=["players"])

# @router.get("/", response_model=List[PlayerResponse])
# async def get_all_players(
#     tournament_id: Optional[int] = None,
#     team_id: Optional[int] = None,
#     skip: int = 0,
#     limit: int = 100,
#     db: AsyncSession = Depends(get_db)
# ):
#     """
#     Get all players with optional filtering
#     - **tournament_id**: Filter by tournament
#     - **team_id**: Filter by team
#     - **skip**: Number of records to skip (pagination)
#     - **limit**: Maximum number of records to return
#     """
#     try:
#         query = select(Player).options(selectinload(Player.team))
        
#         # Apply filters
#         if tournament_id:
#             query = query.where(Player.tournament_id == tournament_id)
        
#         if team_id:
#             query = query.where(Player.team_id == team_id)
        
#         # Add ordering and pagination
#         query = query.order_by(Player.rating.desc()).offset(skip).limit(limit)
        
#         result = await db.execute(query)
#         players = result.scalars().all()
        
#         return players
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error fetching players: {str(e)}"
#         )

# @router.get("/rankings", response_model=List[PlayerRanking])
# async def get_player_rankings(
#     tournament_id: Optional[int] = None,
#     db: AsyncSession = Depends(get_db)
# ):
#     """
#     Get player rankings based on wins and performance
#     Players are ranked by:
#     1. Number of wins
#     2. Win percentage
#     3. Rating
#     """
#     try:
#         # Base query with player stats
#         query = select(
#             Player,
#             func.count(Game.id).label('total_games'),
#             func.sum(
#                 func.case(
#                     (Game.result == 'white_wins', func.case((Game.white_player_id == Player.id, 1), else_=0)),
#                     (Game.result == 'black_wins', func.case((Game.black_player_id == Player.id, 1), else_=0)),
#                     else_=0
#                 )
#             ).label('wins'),
#             func.sum(
#                 func.case(
#                     (Game.result == 'draw', 1),
#                     else_=0
#                 )
#             ).label('draws')
#         ).select_from(
#             Player
#         ).outerjoin(
#             Game, 
#             (Game.white_player_id == Player.id) | (Game.black_player_id == Player.id)
#         ).options(
#             selectinload(Player.team)
#         )
        
#         if tournament_id:
#             query = query.where(Player.tournament_id == tournament_id)
        
#         query = query.group_by(Player.id)
        
#         result = await db.execute(query)
#         player_stats = result.all()
        
#         # Calculate rankings
#         rankings = []
#         for player, total_games, wins, draws in player_stats:
#             total_games = total_games or 0
#             wins = wins or 0
#             draws = draws or 0
#             losses = total_games - wins - draws
            
#             # Calculate win percentage
#             win_percentage = (wins / total_games * 100) if total_games > 0 else 0
            
#             # Calculate points (1 for win, 0.5 for draw)
#             points = wins + (draws * 0.5)
            
#             rankings.append(PlayerRanking(
#                 id=player.id,
#                 name=player.name,
#                 team_name=player.team.name if player.team else "No Team",
#                 rating=player.rating,
#                 wins=wins,
#                 draws=draws,
#                 losses=losses,
#                 total_games=total_games,
#                 points=points,
#                 win_percentage=round(win_percentage, 1)
#             ))
        
#         # Sort by wins, then win percentage, then rating
#         rankings.sort(
#             key=lambda x: (x.wins, x.win_percentage, x.rating), 
#             reverse=True
#         )
        
#         # Add rank numbers
#         for i, ranking in enumerate(rankings):
#             ranking.rank = i + 1
        
#         return rankings
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error fetching player rankings: {str(e)}"
#         )

# @router.get("/{player_id}", response_model=PlayerWithStats)
# async def get_player(
#     player_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get detailed information about a specific player including statistics"""
#     try:
#         # Get player with team info
#         player_query = select(Player).options(
#             selectinload(Player.team)
#         ).where(Player.id == player_id)
        
#         result = await db.execute(player_query)
#         player = result.scalar_one_or_none()
        
#         if not player:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Player not found"
#             )
        
#         # Get player statistics
#         stats_query = select(
#             func.count(Game.id).label('total_games'),
#             func.sum(
#                 func.case(
#                     (Game.result == 'white_wins', func.case((Game.white_player_id == player_id, 1), else_=0)),
#                     (Game.result == 'black_wins', func.case((Game.black_player_id == player_id, 1), else_=0)),
#                     else_=0
#                 )
#             ).label('wins'),
#             func.sum(
#                 func.case(
#                     (Game.result == 'draw', 1),
#                     else_=0
#                 )
#             ).label('draws'),
#             func.sum(
#                 func.case(
#                     (Game.white_player_id == player_id, 1),
#                     else_=0
#                 )
#             ).label('games_as_white'),
#             func.sum(
#                 func.case(
#                     (and_(Game.white_player_id == player_id, Game.result == 'white_wins'), 1),
#                     else_=0
#                 )
#             ).label('wins_as_white')
#         ).where(
#             (Game.white_player_id == player_id) | (Game.black_player_id == player_id)
#         )
        
#         stats_result = await db.execute(stats_query)
#         stats = stats_result.first()
        
#         # Calculate statistics
#         total_games = stats.total_games or 0
#         wins = stats.wins or 0
#         draws = stats.draws or 0
#         losses = total_games - wins - draws
#         games_as_white = stats.games_as_white or 0
#         wins_as_white = stats.wins_as_white or 0
        
#         # Calculate percentages
#         win_percentage = (wins / total_games * 100) if total_games > 0 else 0
#         white_win_percentage = (wins_as_white / games_as_white * 100) if games_as_white > 0 else 0
        
#         # Calculate points
#         points = wins + (draws * 0.5)
        
#         return PlayerWithStats(
#             id=player.id,
#             name=player.name,
#             rating=player.rating,
#             team_id=player.team_id,
#             team_name=player.team.name if player.team else None,
#             tournament_id=player.tournament_id,
#             board_preference=player.board_preference,
#             is_substitute=player.is_substitute,
#             created_at=player.created_at,
#             updated_at=player.updated_at,
#             # Statistics
#             total_games=total_games,
#             wins=wins,
#             draws=draws,
#             losses=losses,
#             points=points,
#             win_percentage=round(win_percentage, 1),
#             games_as_white=games_as_white,
#             games_as_black=total_games - games_as_white,
#             white_win_percentage=round(white_win_percentage, 1)
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error fetching player details: {str(e)}"
#         )

# @router.post("/", response_model=PlayerResponse)
# async def create_player(
#     player_data: PlayerCreate,
#     db: AsyncSession = Depends(get_db),
#     current_admin = Depends(get_current_user),
#     admin_mode: bool = Depends(get_admin_user)
# ):
#     """
#     Create a new player (Admin only)
#     - Players are automatically assigned to the specified team
#     - Team can have maximum 6 players
#     """
#     try:
#         # Verify team exists and get current player count
#         team_query = select(Team, func.count(Player.id).label('player_count')).outerjoin(
#             Player, Player.team_id == Team.id
#         ).where(Team.id == player_data.team_id).group_by(Team.id)
        
#         result = await db.execute(team_query)
#         team_data = result.first()
        
#         if not team_data:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Team not found"
#             )
        
#         team, player_count = team_data
        
#         # Check team player limit
#         if player_count >= 6:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Team already has maximum 6 players"
#             )
        
#         # Create player
#         player = await player_crud.create_player(db, player_data)
        
#         return player
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error creating player: {str(e)}"
#         )

# @router.put("/{player_id}", response_model=PlayerResponse)
# async def update_player(
#     player_id: int,
#     player_data: PlayerUpdate,
#     db: AsyncSession = Depends(get_db),
#     current_admin = Depends(get_current_user),
#     admin_mode: bool = Depends(get_admin_user)
# ):
#     """
#     Update player information (Admin only)
#     - Can update name, rating, board preference
#     - Team changes require additional validation
#     """
#     try:
#         # Check if player exists
#         existing_player = await player_crud.get_player(db, player_id)
#         if not existing_player:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Player not found"
#             )
        
#         # If changing team, validate new team
#         if player_data.team_id and player_data.team_id != existing_player.team_id:
#             # Check new team player count
#             new_team_query = select(func.count(Player.id)).where(
#                 Player.team_id == player_data.team_id
#             )
#             result = await db.execute(new_team_query)
#             new_team_count = result.scalar()
            
#             if new_team_count >= 6:
#                 raise HTTPException(
#                     status_code=status.HTTP_400_BAD_REQUEST,
#                     detail="Destination team already has maximum 6 players"
#                 )
            
#             # Check old team won't have too few players
#             old_team_query = select(func.count(Player.id)).where(
#                 Player.team_id == existing_player.team_id
#             )
#             result = await db.execute(old_team_query)
#             old_team_count = result.scalar()
            
#             if old_team_count <= 4:
#                 raise HTTPException(
#                     status_code=status.HTTP_400_BAD_REQUEST,
#                     detail="Cannot remove player: team would have less than 4 players"
#                 )
        
#         # Update player
#         updated_player = await player_crud.update_player(db, player_id, player_data)
        
#         return updated_player
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error updating player: {str(e)}"
#         )

# @router.delete("/{player_id}")
# async def delete_player(
#     player_id: int,
#     db: AsyncSession = Depends(get_db),
#     current_admin = Depends(get_current_user),
#     admin_mode: bool = Depends(get_admin_user)
# ):
#     """
#     Delete a player (Admin only)
#     - Cannot delete if team would have less than 4 players
#     - Cannot delete if player has played games
#     """
#     try:
#         # Check if player exists
#         player = await player_crud.get_player(db, player_id)
#         if not player:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Player not found"
#             )
        
#         # Check if player has played any games
#         games_query = select(func.count(Game.id)).where(
#             (Game.white_player_id == player_id) | (Game.black_player_id == player_id)
#         )
#         result = await db.execute(games_query)
#         games_count = result.scalar()
        
#         if games_count > 0:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Cannot delete player who has played games"
#             )
        
#         # Check team player count
#         team_query = select(func.count(Player.id)).where(
#             Player.team_id == player.team_id
#         )
#         result = await db.execute(team_query)
#         team_count = result.scalar()
        
#         if team_count <= 4:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Cannot delete player: team would have less than 4 players"
#             )
        
#         # Delete player
#         await player_crud.delete_player(db, player_id)
        
#         return {"message": "Player deleted successfully"}
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error deleting player: {str(e)}"
#         )

# @router.get("/team/{team_id}/available", response_model=List[PlayerResponse])
# async def get_available_players_for_team(
#     team_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """
#     Get available players for a team (for substitutions)
#     Returns team players ordered by rating (top 4 are default lineup)
#     """
#     try:
#         # Verify team exists
#         team_query = select(Team).where(Team.id == team_id)
#         result = await db.execute(team_query)
#         team = result.scalar_one_or_none()
        
#         if not team:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Team not found"
#             )
        
#         # Get team players ordered by rating
#         players_query = select(Player).where(
#             Player.team_id == team_id
#         ).order_by(Player.rating.desc())
        
#         result = await db.execute(players_query)
#         players = result.scalars().all()
        
#         return players
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error fetching team players: {str(e)}"
#         )

# @router.put("/{player_id}/substitute", response_model=PlayerResponse)
# async def toggle_substitute_status(
#     player_id: int,
#     db: AsyncSession = Depends(get_db),
#     current_admin = Depends(get_current_user),
#     admin_mode: bool = Depends(get_admin_user)
# ):
#     """
#     Toggle player's substitute status (Admin only)
#     - Used for managing team lineups
#     - Affects board assignments in matches
#     """
#     try:
#         player = await player_crud.get_player(db, player_id)
#         if not player:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Player not found"
#             )
        
#         # Toggle substitute status
#         update_data = PlayerUpdate(is_substitute=not player.is_substitute)
#         updated_player = await player_crud.update_player(db, player_id, update_data)
        
#         return updated_player
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error updating substitute status: {str(e)}"
#         )



from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Player, Team
from ..schemas import PlayerResponse, PlayerCreate, PlayerUpdate
from ..auth import get_admin_user
from .. import crud

router = APIRouter(prefix="/api/players", tags=["players"])

@router.get("/tournament/{tournament_id}/ranking")
def get_tournament_player_ranking(tournament_id: int, db: Session = Depends(get_db)):
    """Get player ranking for a specific tournament"""
    # Verify tournament exists
    tournament = crud.get_tournament(db, tournament_id)
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found"
        )
    
    # Get all players in tournament ordered by performance
    players = crud.get_tournament_players_ranking(db, tournament_id)
    
    return {
        "tournament_id": tournament_id,
        "tournament_name": tournament.name,
        "player_ranking": [
            {
                "rank": idx + 1,
                "player_id": player.id,
                "name": player.name,
                "team_name": player.team.name,
                "rating": player.rating,
                "games_played": player.wins + player.draws + player.losses,
                "wins": player.wins,
                "draws": player.draws,
                "losses": player.losses,
                "points": player.wins + 0.5 * player.draws,
                "win_percentage": (player.wins + 0.5 * player.draws) / max(1, player.wins + player.draws + player.losses) * 100
            }
            for idx, player in enumerate(players)
        ]
    }

@router.get("/", response_model=List[PlayerResponse])
def get_players(
    team_id: Optional[int] = None,
    tournament_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all players, optionally filtered by team or tournament"""
    players = crud.get_players(
        db, 
        team_id=team_id, 
        tournament_id=tournament_id, 
        skip=skip, 
        limit=limit
    )
    return players

@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(player_id: int, db: Session = Depends(get_db)):
    """Get a specific player by ID"""
    player = crud.get_player(db, player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    return player

@router.post("/", response_model=PlayerResponse)
def create_player(
    player: PlayerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Create a new player"""
    # Verify team exists
    team = crud.get_team(db, player.team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check if tournament is completed
    if team.tournament.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add players to completed tournament"
        )
    
    # Check team size limit (max 6 players)
    current_player_count = len(team.players)
    if current_player_count >= 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team cannot have more than 6 players"
        )
    
    # Check if player name already exists in team
    existing_player = crud.get_player_by_name_in_team(db, player.name, player.team_id)
    if existing_player:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player name already exists in this team"
        )
    
    # Set position if not provided
    if not player.position:
        player.position = current_player_count + 1
    
    return crud.create_player(db, player)

@router.put("/{player_id}", response_model=PlayerResponse)
def update_player(
    player_id: int,
    player_update: PlayerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Update player details"""
    db_player = crud.get_player(db, player_id)
    if not db_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Check if tournament is completed
    if db_player.team.tournament.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update player in completed tournament"
        )
    
    # If updating name, check for duplicates in team
    if player_update.name and player_update.name != db_player.name:
        existing_player = crud.get_player_by_name_in_team(
            db, player_update.name, db_player.team_id
        )
        if existing_player:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Player name already exists in this team"
            )
    
    # If updating position, validate it's within team size
    if player_update.position:
        team_size = len(db_player.team.players)
        if player_update.position < 1 or player_update.position > team_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position must be between 1 and {team_size}"
            )
    
    return crud.update_player(db, player_id, player_update)

@router.delete("/{player_id}")
def delete_player(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Delete a player"""
    db_player = crud.get_player(db, player_id)
    if not db_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Check if tournament is completed
    if db_player.team.tournament.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete player from completed tournament"
        )
    
    # Check minimum team size (4 players)
    current_team_size = len(db_player.team.players)
    if current_team_size <= 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team must have at least 4 players"
        )
    
    # Store team_id for position adjustment
    team_id = db_player.team_id
    deleted_position = db_player.position
    
    # Delete the player
    crud.delete_player(db, player_id)
    
    # Adjust positions of remaining players
    crud.adjust_player_positions_after_deletion(db, team_id, deleted_position)
    
    return {"message": "Player deleted successfully"}

@router.get("/{player_id}/games")
def get_player_games(player_id: int, db: Session = Depends(get_db)):
    """Get all games played by a player"""
    player = crud.get_player(db, player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Get games where player participated
    games = crud.get_player_games(db, player_id)
    
    return {
        "player_id": player_id,
        "player_name": player.name,
        "team_name": player.team.name,
        "games": games
    }

@router.get("/{player_id}/statistics")
def get_player_statistics(player_id: int, db: Session = Depends(get_db)):
    """Get detailed player statistics"""
    player = crud.get_player(db, player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Calculate detailed statistics
    games_played = player.wins + player.draws + player.losses
    win_percentage = 0
    if games_played > 0:
        win_percentage = (player.wins + 0.5 * player.draws) / games_played * 100
    
    # Performance rating estimation (simplified)
    performance_rating = player.rating
    if games_played > 0:
        score_percentage = (player.wins + 0.5 * player.draws) / games_played
        # Simple performance rating calculation
        if score_percentage > 0.5:
            performance_rating = player.rating + (score_percentage - 0.5) * 400
        elif score_percentage < 0.5:
            performance_rating = player.rating - (0.5 - score_percentage) * 400
    
    stats = {
        "player_id": player_id,
        "name": player.name,
        "team_name": player.team.name,
        "rating": player.rating,
        "position": player.position,
        "games_played": games_played,
        "wins": player.wins,
        "draws": player.draws,
        "losses": player.losses,
        "win_percentage": round(win_percentage, 2),
        "performance_rating": round(performance_rating, 0),
        "points": player.wins + 0.5 * player.draws,
        "games_as_white": crud.get_player_games_as_white(db, player_id),
        "games_as_black": crud.get_player_games_as_black(db, player_id)
    }
    
    return stats

@router.post("/{player_id}/swap-position")
def swap_player_position(
    player_id: int,
    target_player_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin_user)
):
    """Swap positions of two players within the same team"""
    player1 = crud.get_player(db, player_id)
    player2 = crud.get_player(db, target_player_id)
    
    if not player1 or not player2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both players not found"
        )
    
    # Check if players are in the same team
    if player1.team_id != player2.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Players must be in the same team to swap positions"
        )
    
    # Check if tournament is completed
    if player1.team.tournament.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot swap players in completed tournament"
        )
    
    # Swap positions
    pos1, pos2 = player1.position, player2.position
    crud.update_player_position(db, player_id, pos2)
    crud.update_player_position(db, target_player_id, pos1)
    
    return {
        "message": "Player positions swapped successfully",
        "player1": {"id": player_id, "name": player1.name, "new_position": pos2},
        "player2": {"id": target_player_id, "name": player2.name, "new_position": pos1}
    }

