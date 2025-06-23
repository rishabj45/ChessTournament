import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface TeamStanding {
  id: number;
  name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  match_points: number;
  game_points: number;
  sonneborn_berger: number;
  buchholz: number;
}

interface StandingsProps {
  onUpdate: () => void;
}

export const Standings: React.FC<StandingsProps> = ({ onUpdate }) => {
  const [teams, setTeams] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTiebreakers, setShowTiebreakers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const currentTournament = await api.getCurrentTournament();
      if (!currentTournament || !currentTournament.id) {
        throw new Error('No tournament found');
      }

      const standings = await api.getStandings(currentTournament.id);
      setTeams(standings ?? []);
      setError(null);
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError('Failed to load standings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">🥇 1st</span>;
    if (position === 2) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">🥈 2nd</span>;
    if (position === 3) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">🥉 3rd</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{position}th</span>;
  };

  const formatScore = (score: number) => score % 1 === 0 ? score.toString() : score.toFixed(1);

  const getPerformanceIndicator = (team: TeamStanding) => {
    if (team.matches_played === 0) return null;
    const winRate = (team.wins * 2 + team.draws) / (team.matches_played * 2);
    if (winRate >= 0.75) return <span className="text-green-600 font-bold">🔥</span>;
    if (winRate >= 0.6) return <span className="text-green-500">📈</span>;
    if (winRate <= 0.25) return <span className="text-red-500">📉</span>;
    return null;
  };

  const handleRefresh = () => {
    fetchData();
    onUpdate?.();
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
          <button onClick={fetchData} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <button onClick={() => setShowTiebreakers(!showTiebreakers)} className="btn btn-outline btn-sm">
              {showTiebreakers ? 'Hide' : 'Show'} Tiebreakers
            </button>
            <button onClick={handleRefresh} className="btn btn-secondary btn-sm" disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

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
              {(teams || []).map((team, index) => (
                <tr key={team.id} className={`${index < 3 ? 'bg-yellow-50' : ''} hover:bg-gray-50`}>
                  <td className="font-medium">{getPositionBadge(index + 1)}</td>
                  <td className="font-medium text-gray-900 flex items-center">
                    {team.name} {getPerformanceIndicator(team)}
                  </td>
                  <td className="text-center font-bold text-blue-600">{formatScore(team.match_points)}</td>
                  <td className="text-center">{team.wins}</td>
                  <td className="text-center">{team.draws}</td>
                  <td className="text-center">{team.losses}</td>
                  <td className="text-center font-medium">{formatScore(team.game_points)}</td>
                  {showTiebreakers && (
                    <>
                      <td className="text-center text-sm text-gray-600">{formatScore(team.sonneborn_berger)}</td>
                      <td className="text-center text-sm text-gray-600">{formatScore(team.buchholz)}</td>
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
            <p className="text-gray-600">Teams will appear here once they are added to the tournament.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Standings;
