import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, User } from 'lucide-react';
import { apiService } from '@/services/api';

interface Player {
  id: number;
  name: string;
  rating: number;
  team_id: number;
  team_name: string;
  wins: number;
  draws: number;
  losses: number;
  games_played: number;
  score: number;
}

const BestPlayers: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerRankings();
  }, []);

  const fetchPlayerRankings = async () => {
    try {
      setLoading(true);
      const current = await apiService.getCurrentTournament();

      // ✅ Safeguard against null or undefined tournament
      if (!current || !current.id) {
        throw new Error('No active tournament found.');
      }

      const response = await fetch(`/api/tournaments/${current.id}/best-players`);
      if (!response.ok) {
        throw new Error('Failed to fetch player rankings');
      }

      const data = await response.json();
      const formattedPlayers = data.map((p: any) => ({
        id: p.player_id,
        name: p.player_name,
        rating: p.rating,
        team_id: p.team_id,
        team_name: p.team_name,
        wins: p.wins,
        draws: p.draws,
        losses: p.losses,
        games_played: p.games_played,
        score: p.points,
      }));
      setPlayers(formattedPlayers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">{rank}</div>;
    }
  };

  const getScorePercentage = (score: number, gamesPlayed: number) => {
    if (gamesPlayed === 0) return 0;
    return ((score / gamesPlayed) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchPlayerRankings}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Best Players Rankings
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Players ranked by number of wins and performance
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Games</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">W-D-L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player, index) => (
                <tr key={player.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">{getRankIcon(index + 1)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{player.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{player.team_name}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{player.rating}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{player.games_played}</td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">{player.score}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="text-green-600 font-medium">{player.wins}</span>-
                    <span className="text-yellow-600 font-medium">{player.draws}</span>-
                    <span className="text-red-600 font-medium">{player.losses}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {getScorePercentage(player.score, player.games_played)}%
                      </div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${getScorePercentage(player.score, player.games_played)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {players.length === 0 && (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No players found</h3>
            <p className="mt-1 text-sm text-gray-500">Players will appear here once games are played.</p>
          </div>
        )}
      </div>

      {players.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {players.slice(0, 3).map((player, index) => (
            <div key={player.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getRankIcon(index + 1)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{player.name}</p>
                    <p className="text-xs text-gray-500">{player.team_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{player.score}</p>
                  <p className="text-xs text-gray-500">{getScorePercentage(player.score, player.games_played)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BestPlayers;
