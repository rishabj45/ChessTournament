#!/usr/bin/env python3
"""
Database Initialization Script for Chess Tournament Management System
Run this script to set up the database with initial data
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import DATABASE_URL, Base
from app.models import Tournament, Team, Player, Match, Game, Round
from datetime import datetime, timedelta
import os
from app.tournament_logic import generate_round_robin_schedule
from sqlalchemy import select

# Sample data
SAMPLE_TEAMS = [
    {
        "name": "Team Alpha",
        "players": [
            {"name": "Alice Johnson", "rating": 2100},
            {"name": "Bob Smith", "rating": 2050},
            {"name": "Charlie Brown", "rating": 2000},
            {"name": "Diana Ross", "rating": 1950},
        ]
    },
    {
        "name": "Team Beta",
        "players": [
            {"name": "Eve Wilson", "rating": 2080},
            {"name": "Frank Miller", "rating": 2020},
            {"name": "Grace Lee", "rating": 1980},
            {"name": "Henry Davis", "rating": 1940},
        ]
    },
    {
        "name": "Team Gamma",
        "players": [
            {"name": "Ivy Chen", "rating": 2120},
            {"name": "Jack Robinson", "rating": 2040},
            {"name": "Kate Turner", "rating": 1990},
            {"name": "Leo Martinez", "rating": 1960},
        ]
    },
    {
        "name": "Team Delta",
        "players": [
            {"name": "Maya Patel", "rating": 2070},
            {"name": "Nick Thompson", "rating": 2010},
            {"name": "Olivia Garcia", "rating": 1970},
            {"name": "Paul Anderson", "rating": 1930},
        ]
    },
    {
        "name": "Team Epsilon",
        "players": [
            {"name": "Quinn Rodriguez", "rating": 2090},
            {"name": "Ryan Clark", "rating": 2030},
            {"name": "Sophie White", "rating": 1985},
            {"name": "Tyler Moore", "rating": 1945},
        ]
    },
    {
        "name": "Team Zeta",
        "players": [
            {"name": "Uma Singh", "rating": 2110},
            {"name": "Victor Kim", "rating": 2025},
            {"name": "Wendy Liu", "rating": 1975},
            {"name": "Xavier Brooks", "rating": 1955},
        ]
    }
]

async def create_database():
    """Create all database tables"""
    database_url = DATABASE_URL  # <-- fix here
    engine = create_async_engine(database_url)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database tables created successfully")
    await engine.dispose()

async def initialize_tournament_data():
    """Initialize the database with sample tournament data"""
    database_url = DATABASE_URL
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Create tournament
            tournament = Tournament(
                name="Spring Chess Championship 2025",
                description="Annual spring tournament featuring 6 teams",
                start_date=datetime.now().date(),
                end_date=(datetime.now() + timedelta(days=14)).date(),
                status="active",
                current_round=1
            )
            session.add(tournament)
            await session.flush()  # Get tournament ID
            
            print(f"✅ Created tournament: {tournament.name}")
            
            # Create teams and players
            teams = []
            for team_data in SAMPLE_TEAMS:
                team = Team(
                    name=team_data["name"],
                    tournament_id=tournament.id
                )
                session.add(team)
                await session.flush()  # Get team ID
                
                # Create players for this team
                for player_data in team_data["players"]:
                    player = Player(
                        name=player_data["name"],
                        rating=player_data["rating"],
                        team_id=team.id,
                        
                    )
                    session.add(player)
                
                teams.append(team)
                print(f"✅ Created team: {team.name} with 4 players")
            
            await session.commit()
            
            # Generate tournament schedule using the round robin generator
            # You need to query the teams from the DB with their IDs set
            teams_in_db = await session.execute(
                select(Team).where(Team.tournament_id == tournament.id)
            )
            teams = teams_in_db.scalars().all()
            
            # generate_round_robin_schedule expects a list of Team objects with IDs
            schedule = generate_round_robin_schedule(teams)
            
            print("✅ Generated round-robin schedule")
            print(f"✅ Tournament initialized with {len(teams)} teams")
            
            # Optionally, you can create rounds and matches here using the schedule
            # (see your tournament_logic.py for how to do this synchronously)
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error initializing tournament data: {e}")
            raise
        finally:
            await engine.dispose()

async def reset_database():
    """Drop all tables and recreate them (USE WITH CAUTION)"""
    database_url = DATABASE_URL
    engine = create_async_engine(database_url)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database reset successfully")
    await engine.dispose()

async def check_database_status():
    """Check if database exists and has data"""
    database_url = DATABASE_URL
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    try:
        async with async_session() as session:
            from sqlalchemy import text
            
            # Check if tables exist
            result = await session.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """))
            tables = result.fetchall()
            
            if not tables:
                print("❌ No tables found in database")
                return False
            
            print(f"✅ Found {len(tables)} tables:")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Check for data
            tournament_result = await session.execute(text("SELECT COUNT(*) FROM tournaments"))
            tournament_count = tournament_result.scalar()
            
            team_result = await session.execute(text("SELECT COUNT(*) FROM teams"))
            team_count = team_result.scalar()
            
            player_result = await session.execute(text("SELECT COUNT(*) FROM players"))
            player_count = player_result.scalar()
            
            print(f"\nData Summary:")
            print(f"  - Tournaments: {tournament_count}")
            print(f"  - Teams: {team_count}")
            print(f"  - Players: {player_count}")
            
            return tournament_count > 0
            
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False
    finally:
        await engine.dispose()

async def create_admin_user():
    """Create default admin user"""
    from app.auth import get_password_hash
    
    # Default admin credentials
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    print(f"\n🔐 Admin Credentials:")
    print(f"  Username: {admin_username}")
    print(f"  Password: {admin_password}")
    print(f"  (Change these in production!)")

async def main():
    """Main initialization function"""
    print("🏆 Chess Tournament Database Initialization")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = backend_dir / ".env"
    if not env_file.exists():
        print("⚠️  .env file not found. Creating from example...")
        example_env = backend_dir.parent / ".env.example"
        if example_env.exists():
            import shutil
            shutil.copy(example_env, env_file)
            print("✅ Created .env file from .env.example")
        else:
            print("❌ .env.example not found. Please create .env manually")
            return
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(env_file)
    
    try:
        # Check current database status
        print("\n1. Checking database status...")
        has_data = await check_database_status()
        
        if has_data:
            response = input("\n⚠️  Database already has data. Reset it? (y/N): ")
            if response.lower() == 'y':
                print("\n2. Resetting database...")
                await reset_database()
            else:
                print("Keeping existing data.")
                return
        else:
            print("\n2. Creating database tables...")
            await create_database()
        
        print("\n3. Initializing tournament data...")
        await initialize_tournament_data()
        
        print("\n4. Setting up admin access...")
        await create_admin_user()
        
        print("\n🎉 Database initialization completed successfully!")
        print("\nNext steps:")
        print("1. Start the backend server: uvicorn app.main:app --reload")
        print("2. Start the frontend: cd frontend && npm run dev")
        print("3. Visit http://localhost:3000")
        
    except Exception as e:
        print(f"\n❌ Initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())