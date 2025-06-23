#!/usr/bin/env python3
"""
Synchronous Database Initialization Script
for Chess Tournament Management System.
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import os

# ─── Adjust Python path so "app" is importable ────────────────────────────────
backend_dir = Path(__file__).parent.resolve()
app_dir     = backend_dir / "app"
sys.path.insert(0, str(backend_dir))  # so 'app' is a top-level package
sys.path.insert(0, str(app_dir))      # in case you also import un-packaged modules

# ─── Environment & SQLAlchemy setup ──────────────────────────────────────────
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm  import sessionmaker

load_dotenv(backend_dir / ".env")
raw_url = os.getenv("DATABASE_URL", "sqlite:///./chess_tournament.db")
DATABASE_URL = raw_url.replace("sqlite+aiosqlite://", "sqlite://", 1)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite://")
    else {}
)
SessionLocal = sessionmaker(bind=engine)

# ─── Your app’s models & logic ───────────────────────────────────────────────
from app.database         import Base
from app.models           import Tournament, Team, Player, Round, Match, Game
from app.tournament_logic import generate_round_robin_schedule

# ─── Helpers ─────────────────────────────────────────────────────────────────
def prompt_team_count(default: int = 6) -> int:
    s = input(f"Enter number of teams (default {default}): ").strip()
    return int(s) if (s.isdigit() and int(s) >= 2) else default

# ─── Main Initialization ──────────────────────────────────────────────────────
def main():
    # 1️⃣ Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

    session = SessionLocal()
    try:
        # 2️⃣ Create one tournament
        n = prompt_team_count()
        tour = Tournament(
            name="Auto Chess Tournament",
            description=f"Round-robin of {n} teams",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=n*2)).date(),
            status="active",
            current_round=1
        )
        session.add(tour)
        session.commit()
        session.refresh(tour)
        print(f"✅ Tournament created: ID {tour.id}")

        # 3️⃣ Create teams + 4 players each
        teams = []
        for i in range(1, n+1):
            t = Team(name=f"Team {i}", tournament_id=tour.id)
            session.add(t); session.commit(); session.refresh(t)
            for j in range(1,5):
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

        # 4️⃣ Generate and persist schedule
        schedule = generate_round_robin_schedule(teams)
        tour.total_rounds = len(schedule)
        session.commit()
        print(f"\n✅ Persisting {len(schedule)} rounds:")

        for rnd_num, pairs in enumerate(schedule, start=1):
            rd = Round(
                tournament_id=tour.id,
                round_number=rnd_num,
                start_date=tour.start_date + timedelta(days=(rnd_num-1)*7),
                end_date=  tour.start_date + timedelta(days=rnd_num*7-1)
            )
            session.add(rd); session.commit(); session.refresh(rd)
            print(f"\n⏱️  Round {rnd_num}")

            for home, away in pairs:
                if home is None or away is None:
                    bye = home or away
                    print(f"    • {bye.name} has a bye")
                    continue

                m = Match(
                    tournament_id=tour.id,
                    round_id=rd.id,
                    round_number=rnd_num,
                    home_team_id=home.id,
                    away_team_id=away.id,
                    scheduled_date=rd.start_date + timedelta(days=3)
                )
                session.add(m); session.commit(); session.refresh(m)

                # create 4 board games
                hps = sorted(home.players, key=lambda p: p.board_order)[:4]
                aps = sorted(away.players, key=lambda p: p.board_order)[:4]
                for b in range(1,5):
                    if b in (1,3):
                        wp, bp = hps[b-1], aps[b-1]
                    else:
                        wp, bp = aps[b-1], hps[b-1]
                    g = Game(
                        match_id=m.id,
                        board_number=b,
                        white_player_id=wp.id,
                        black_player_id=bp.id,
                        result=None
                    )
                    session.add(g)
                session.commit()

                print(f"    • {home.name} vs {away.name}")

        print("\n🎉 Initialization complete!")

    except Exception as err:
        session.rollback()
        print(f"❌ Initialization failed: {err}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
