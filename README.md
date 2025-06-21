PROMPT GIVEN 

i am beginner working on chesstournament project i will attach zip file of what i had completed if u need any ideas from there; i was using sqlite but use what is bestlike sqlalchemy
initialise the tournament with n teams and 4 players in each team;generates round robin schedule 
the site should be read only for viewers and admin can add information. at top of site tournament name , below it 4 tabs- schedule&results,standings,teams,best player;default schedule page is open
it should also allow admin to login but viewers dont need to login;when admin is logged in it should show a toggle for admin mode which can be turned on off to be in viewer mode and admin mode,can only use admin powers in admin mode
teams tab shows teams and players with their ratings; admin can add upto 2 more players ; change team names player names player ratings; remove player but no . of players cant go below 4 and canot excceed 6 
schedule&results contain date and time of matches and  show result,each match is a 4v4 ;it also shows which player plays against whom on each board ; top4 players by default;if any players is swapped there place in order is decided bt their order in team 
admin can submit results in each board 
standings contain teams rank based on points and tiebraker points also like used in fide tournaments
best player which has all the players ranked based on no. of wins

additional features that we can add later:
assign black and white to teams in each match ; team white gets while in board1,3 black gets white in board 2,4
in case of odd no of rounds i am unsure how to be fair so every team gets white equal times

Tech Stack
best architecture for everything
generate complete project structure and code for each files in one go
also tell me how to run the project 
ask any queries you may have before generating any code

# Chess Tournament Management System

## Project Structure

```
chess-tournament/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   ├── auth.py
│   │   ├── tournament_logic.py
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── tournaments.py
│   │       ├── teams.py
│   │       ├── matches.py
│   │       ├── players.py
│   │       └── auth.py
│   ├── requirements.txt
│   ├── alembic.ini
│   └── alembic/
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── AdminToggle.tsx
│   │   │   ├── LoginModal.tsx
│   │   │   ├── Schedule.tsx
│   │   │   ├── Standings.tsx
│   │   │   ├── Teams.tsx
│   │   │   ├── BestPlayers.tsx
│   │   │   ├── MatchResult.tsx
│   │   │   └── TeamEditor.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   └── useTournament.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set environment variables:**
```bash
cp ../.env.example .env
# Edit .env with your settings
```

4. **Initialize database:**
```bash
alembic upgrade head
```

5. **Run backend server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Start development server:**
```bash
npm run dev
```

### Using Docker (Alternative)

```bash
docker-compose up --build
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify` - Verify token

### Tournament
- `GET /api/tournaments/current` - Get current tournament
- `POST /api/tournaments/` - Create tournament (admin)
- `PUT /api/tournaments/{id}` - Update tournament (admin)

### Teams
- `GET /api/teams/` - Get all teams
- `POST /api/teams/` - Create team (admin)
- `PUT /api/teams/{id}` - Update team (admin)
- `DELETE /api/teams/{id}` - Delete team (admin)

### Players
- `GET /api/players/` - Get all players
- `POST /api/players/` - Create player (admin)
- `PUT /api/players/{id}` - Update player (admin)
- `DELETE /api/players/{id}` - Delete player (admin)

### Matches
- `GET /api/matches/` - Get all matches
- `PUT /api/matches/{id}/result` - Submit match result (admin)

## Features

### Core Features
- ✅ Round-robin tournament generation for any number of teams
- ✅ Fair color allocation across rounds
- ✅ 4v4 team matches with board assignments
- ✅ Admin authentication with toggle mode
- ✅ Real-time standings with Sonneborn-Berger tiebreaker
- ✅ Player rankings by wins
- ✅ Team and player management
- ✅ Match result submission

### Tournament Logic
- **Round Generation**: Creates balanced round-robin schedule
- **Color Fairness**: Ensures equal white/black distribution
- **Board Assignment**: Top 4 players by rating, with substitution logic
- **Tiebreakers**: Implements FIDE Sonneborn-Berger system
- **Standings**: Real-time team rankings with multiple tiebreakers

### User Interface
- **Responsive Design**: Works on desktop and mobile
- **Admin Mode**: Toggle between viewer and admin modes
- **Real-time Updates**: Automatic refresh of standings and results
- **Intuitive Navigation**: Tab-based interface with clear sections

## Development Notes

### Database Schema
- **Tournament**: Main tournament information
- **Team**: Team data with 4-6 players
- **Player**: Individual player with ELO rating
- **Match**: Team vs team matches
- **Game**: Individual board games within matches
- **Round**: Tournament rounds for organization

### Architecture Decisions
- **FastAPI**: Modern Python web framework with automatic API docs
- **SQLAlchemy**: Robust ORM with relationship management
- **React + TypeScript**: Type-safe frontend development
- **Tailwind CSS**: Utility-first styling for rapid development
- **JWT Authentication**: Stateless admin authentication

### Performance Considerations
- **Database Indexing**: Optimized queries for tournament data
- **Caching**: React Query for efficient data fetching
- **Pagination**: Ready for large tournaments
- **Optimistic Updates**: Immediate UI feedback

## Next Steps / Future Enhancements

1. **Advanced Features**
   - Swiss tournament system
   - Player pairing algorithms
   - Tournament export (PGN)
   - Email notifications

2. **UI Improvements**
   - Dark mode
   - Advanced filtering
   - Mobile app
   - Print-friendly views

3. **Admin Features**
   - User management
   - Tournament templates
   - Backup/restore
   - Analytics dashboard

4. **Integration**
   - Chess.com API
   - Lichess integration
   - Rating system sync
   - Live game streaming

## Support

For issues or questions:
1. Check the API documentation at `http://localhost:8000/docs`
2. Review the console logs for errors
3. Ensure all dependencies are installed correctly
4. Verify database connection settings


