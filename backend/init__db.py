#!/usr/bin/env python3
"""
Synchronous Database Initialization Script
for Chess Tournament Management System.
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import os

# ─── Adjust Python path ──────────────────────────────────────
backend_dir = Path(__file__).parent.resolve()
app_dir = backend_dir / "app"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(app_dir))

# ─── Load environment & database ─────────────────────────────
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv(backend_dir / ".env")
raw_url = os.getenv("DATABASE_URL", "sqlite:///./chess_tournament.db")
DATABASE_URL = raw_url.replace("sqlite+aiosqlite://", "sqlite://", 1)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite://") else {}
)
SessionLocal = sessionmaker(bind=engine)

# ─── Import Models ───────────────────────────────────────────
from app.database import Base
from app.models import Tournament, Team, Player, Round, Match, Game
from app.tournament_logic import generate_round_robin_schedule

# ─── Prompt ──────────────────────────────────────────────────
def prompt_team_count(default: int = 6) -> int:
    s = input(f"Enter number of teams (default {default}): ").strip()
    return int(s) if s.isdigit() and int(s) >= 2 else default

# ─── Main Initialization ─────────────────────────────────────
def main():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

    session = SessionLocal()
    try:
        # Tournament
        n = prompt_team_count()
        tour = Tournament(
            name="Auto Chess Tournament",
            description=f"Round-robin of {n} teams",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=n * 2)).date(),
            status="active",
            current_round=1
        )
        session.add(tour)
        session.commit()
        session.refresh(tour)
        print(f"✅ Tournament created: ID {tour.id}")

        # Teams and players
        teams = []
        for i in range(1, n + 1):
            t = Team(name=f"Team {i}", tournament_id=tour.id)
            session.add(t)
            session.commit()
            session.refresh(t)

            for j in range(1, 5):
                p = Player(
                    name=f"Player{i}_{j}",
                    rating=1200,
                    team_id=t.id,
                    board_order=j
                )
                session.add(p)
            session.commit()
            teams.append(t)
            print(f"  • {t.name} (ID {t.id}) with 4 players")

        # Generate matches
        schedule = generate_round_robin_schedule(teams)
        tour.total_rounds = len(schedule)
        session.commit()
        print(f"\n✅ Persisting {len(schedule)} rounds:")

        for rnd_num, pairs in enumerate(schedule, start=1):
            rd = Round(
                tournament_id=tour.id,
                round_number=rnd_num,
                start_date=tour.start_date + timedelta(days=(rnd_num - 1) * 7),
                end_date=tour.start_date + timedelta(days=rnd_num * 7 - 1)
            )
            session.add(rd)
            session.commit()
            session.refresh(rd)
            print(f"\n⏱️  Round {rnd_num}")

            for white, black in pairs:
                if white is None or black is None:
                    bye = white or black
                    print(f"    • {bye.name} has a bye")
                    continue

                m = Match(
                    tournament_id=tour.id,
                    round_id=rd.id,
                    round_number=rnd_num,
                    white_team_id=white.id,
                    black_team_id=black.id,
                    scheduled_date=rd.start_date + timedelta(days=3)
                )
                session.add(m)
                session.commit()
                session.refresh(m)

                # Assign 4 board games
                w_players = sorted(white.players, key=lambda p: p.board_order)[:4]
                b_players = sorted(black.players, key=lambda p: p.board_order)[:4]
                for b in range(1, 5):
                    if b in (1, 3):
                        wp, bp = w_players[b - 1], b_players[b - 1]
                    else:
                        wp, bp = b_players[b - 1], w_players[b - 1]
                    g = Game(
                        match_id=m.id,
                        board_number=b,
                        white_player_id=wp.id,
                        black_player_id=bp.id,
                        result=None
                    )
                    session.add(g)
                session.commit()

                print(f"    • {white.name} vs {black.name}")

        print("\n🎉 Initialization complete!")

    except Exception as e:
        session.rollback()
        print(f"❌ Initialization failed: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
