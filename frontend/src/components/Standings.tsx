import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Team {
  id: number;
  name: string;
  players: Player[];
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  match_points: number;
  game_points: number;
  sonneborn_berger: number;
  buchholz: number;
  direct_encounter?: number;
}

interface Player {
  id: number;
  name: string;
  rating: number;
  team_id: number;
}

interface Match {
  id: number;
  round_number: number;
  white_team: Team;
  black_team: Team;
  white_score?: number;
  black_score?: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  date?: string;
  games?: Game[];
}

interface Game {
  id: number;
    match_id: number;
    board_number: number;
    white_player_id: number;
    black_player_id: number;
    result: '1-0' | '0-1' | '1/2-1/2' | null;
    white_player: Player;
    black_player: Player;
}

interface StandingsProps {
  onUpdate: () => void;
}

export const Standings: React.FC<StandingsProps> = ({ onUpdate }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  // const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [sortBy, setSortBy] = useState<'position' | 'match_points' | 'game_points' | 'sonneborn_berger'>('position');
  const [showTiebreakers, setShowTiebreakers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // const auth = useAuth();

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [teamsData, matchesData] = await Promise.all([
        api.getTeams(),
        api.getMatches()
      ]);
      
      // Calculate standings
      const calculatedStandings = calculateStandings(teamsData, matchesData);
      setTeams(calculatedStandings);
      // setMatches(matchesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError('Failed to load standings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStandings = (teamsData: Team[], matchesData: Match[]): Team[] => {
    const standings = teamsData.map(team => {
      const teamMatches = matchesData.filter(match => 
        match.white_team.id === team.id || match.black_team.id === team.id
      );

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let matchPoints = 0;
      let gamePoints = 0;
      let opponentIds: number[] = [];
      
      teamMatches.forEach(match => {
        if (match.status === 'completed' && match.white_score !== undefined && match.black_score !== undefined) {
          const isWhite = match.white_team.id === team.id;
          const teamScore = isWhite ? match.white_score : match.black_score;
          const opponentScore = isWhite ? match.black_score : match.white_score;
          const opponentId = isWhite ? match.black_team.id : match.white_team.id;
          
          opponentIds.push(opponentId);
          gamePoints += teamScore;
          
          if (teamScore > opponentScore) {
            wins++;
            matchPoints += 2;
          } else if (teamScore === opponentScore) {
            draws++;
            matchPoints += 1;
          } else {
            losses++;
          }
        }
      });

      // Calculate Sonneborn-Berger (sum of defeated opponents' match points + half of drawn opponents' match points)
      let sonnebornBerger = 0;
      teamMatches.forEach(match => {
        if (match.status === 'completed' && match.white_score !== undefined && match.black_score !== undefined) {
          const isWhite = match.white_team.id === team.id;
          const teamScore = isWhite ? match.white_score : match.black_score;
          const opponentScore = isWhite ? match.black_score : match.white_score;
          const opponent = isWhite ? match.black_team : match.white_team;
          
          // Find opponent's match points
          const opponentMatchPoints = calculateTeamMatchPoints(opponent.id, matchesData);
          
          if (teamScore > opponentScore) {
            sonnebornBerger += opponentMatchPoints;
          } else if (teamScore === opponentScore) {
            sonnebornBerger += opponentMatchPoints * 0.5;
          }
        }
      });

      // Calculate Buchholz (sum of all opponents' match points)
      const buchholz = opponentIds.reduce((sum, opponentId) => {
        return sum + calculateTeamMatchPoints(opponentId, matchesData);
      }, 0);

      return {
        ...team,
        matches_played: teamMatches.filter(m => m.status === 'completed').length,
        wins,
        draws,
        losses,
        match_points: matchPoints,
        game_points: gamePoints,
        sonneborn_berger: sonnebornBerger,
        buchholz
      };
    });

    // Sort standings by FIDE rules
    return standings.sort((a, b) => {
      // 1. Match points
      if (a.match_points !== b.match_points) {
        return b.match_points - a.match_points;
      }
      
      // 2. Sonneborn-Berger
      if (a.sonneborn_berger !== b.sonneborn_berger) {
        return b.sonneborn_berger - a.sonneborn_berger;
      }
      
      // 3. Game points
      if (a.game_points !== b.game_points) {
        return b.game_points - a.game_points;
      }
      
      // 4. Buchholz
      if (a.buchholz !== b.buchholz) {
        return b.buchholz - a.buchholz;
      }
      
      // 5. Number of wins
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      
      // 6. Alphabetical by team name
      return a.name.localeCompare(b.name);
    });
  };

  const calculateTeamMatchPoints = (teamId: number, matchesData: Match[]): number => {
    const teamMatches = matchesData.filter(match => 
      (match.white_team.id === teamId || match.black_team.id === teamId) && 
      match.status === 'completed'
    );

    let matchPoints = 0;
    teamMatches.forEach(match => {
      if (match.white_score !== undefined && match.black_score !== undefined) {
        const isWhite = match.white_team.id === teamId;
        const teamScore = isWhite ? match.white_score : match.black_score;
        const opponentScore = isWhite ? match.black_score : match.white_score;
        
        if (teamScore > opponentScore) {
          matchPoints += 2;
        } else if (teamScore === opponentScore) {
          matchPoints += 1;
        }
      }
    });

    return matchPoints;
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">🥇 1st</span>;
    } else if (position === 2) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">🥈 2nd</span>;
    } else if (position === 3) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">🥉 3rd</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{position}th</span>;
  };

  const formatScore = (score: number) => {
    return score % 1 === 0 ? score.toString() : score.toFixed(1);
  };

  const getPerformanceIndicator = (team: Team) => {
    if (team.matches_played === 0) return null;
    
    const winRate = (team.wins * 2 + team.draws) / (team.matches_played * 2);
    
    if (winRate >= 0.75) {
      return <span className="text-green-600 font-bold">🔥</span>;
    } else if (winRate >= 0.6) {
      return <span className="text-green-500">📈</span>;
    } else if (winRate <= 0.25) {
      return <span className="text-red-500">📉</span>;
    }
    return null;
  };

  const handleRefresh = () => {
    fetchData();
    onUpdate();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-12 h-12"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Standings</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchData} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title flex items-center">
              🏆 Tournament Standings
              {refreshing && <div className="loading-spinner w-4 h-4 ml-2"></div>}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Teams ranked by match points with FIDE tiebreakers
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTiebreakers(!showTiebreakers)}
              className="btn btn-outline btn-sm"
            >
              {showTiebreakers ? 'Hide' : 'Show'} Tiebreakers
            </button>
            <button
              onClick={handleRefresh}
              className="btn btn-secondary btn-sm"
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Standings Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-16">Rank</th>
                <th>Team</th>
                <th className="text-center">MP</th>
                <th className="text-center">W</th>
                <th className="text-center">D</th>
                <th className="text-center">L</th>
                <th className="text-center">GP</th>
                {showTiebreakers && (
                  <>
                    <th className="text-center">SB</th>
                    <th className="text-center">Buch</th>
                  </>
                )}
                <th className="text-center">Form</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.id} className={`${index < 3 ? 'bg-yellow-50' : ''} hover:bg-gray-50`}>
                  <td className="font-medium">
                    {getPositionBadge(index + 1)}
                  </td>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center">
                          {team.name}
                          {getPerformanceIndicator(team)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {team.players.length} players • Avg: {Math.round(team.players.reduce((sum, p) => sum + p.rating, 0) / team.players.length)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center font-bold text-blue-600">
                    {formatScore(team.match_points)}
                  </td>
                  <td className="text-center win-indicator">
                    {team.wins}
                  </td>
                  <td className="text-center draw-indicator">
                    {team.draws}
                  </td>
                  <td className="text-center loss-indicator">
                    {team.losses}
                  </td>
                  <td className="text-center font-medium">
                    {formatScore(team.game_points)}
                  </td>
                  {showTiebreakers && (
                    <>
                      <td className="text-center text-sm text-gray-600">
                        {formatScore(team.sonneborn_berger)}
                      </td>
                      <td className="text-center text-sm text-gray-600">
                        {formatScore(team.buchholz)}
                      </td>
                    </>
                  )}
                  <td className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {team.matches_played > 0 ? (
                        <div className="text-xs font-mono">
                          {((team.wins * 2 + team.draws) / (team.matches_played * 2) * 100).toFixed(0)}%
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {teams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Yet</h3>
            <p className="text-gray-600">
              Teams will appear here once they are added to the tournament.
            </p>
          </div>
        )}
      </div>

      {/* Tiebreaker Explanation */}
      {showTiebreakers && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Tiebreaker System (FIDE Rules)</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Ranking Order:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li><strong>Match Points (MP)</strong> - 2 for win, 1 for draw, 0 for loss</li>
                  <li><strong>Sonneborn-Berger (SB)</strong> - Quality of opposition beaten</li>
                  <li><strong>Game Points (GP)</strong> - Individual game results</li>
                  <li><strong>Buchholz (Buch)</strong> - Sum of all opponents' match points</li>
                  <li><strong>Number of Wins</strong> - Direct wins count</li>
                  <li><strong>Alphabetical</strong> - Team name as final tiebreaker</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Abbreviations:</h4>
                <dl className="space-y-1 text-gray-700">
                  <dt className="inline font-medium">MP:</dt> <dd className="inline">Match Points</dd><br />
                  <dt className="inline font-medium">W/D/L:</dt> <dd className="inline">Wins/Draws/Losses</dd><br />
                  <dt className="inline font-medium">GP:</dt> <dd className="inline">Game Points (board results)</dd><br />
                  <dt className="inline font-medium">SB:</dt> <dd className="inline">Sonneborn-Berger Score</dd><br />
                  <dt className="inline font-medium">Buch:</dt> <dd className="inline">Buchholz Score</dd><br />
                  <dt className="inline font-medium">Form:</dt> <dd className="inline">Win Percentage</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {teams.reduce((sum, team) => sum + team.matches_played, 0) / 2}
            </div>
            <div className="text-sm text-gray-600">Matches Completed</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {teams.reduce((sum, team) => sum + team.game_points, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Game Points</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {teams.length > 0 ? Math.round(teams.reduce((sum, team) => sum + (team.wins * 2 + team.draws), 0) / teams.reduce((sum, team) => sum + team.matches_played * 2, 0) * 100) || 0 : 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Win Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};