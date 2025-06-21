import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, User } from 'lucide-react';

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

interface BestPlayersProps {}

const BestPlayers: React.FC<BestPlayersProps> = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerRankings();
  }, []);

  const fetchPlayerRankings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/players/rankings');
      if (!response.ok) {
        throw new Error('Failed to fetch player rankings');
      }
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Games
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  W-D-L
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player, index) => (
                <tr key={player.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRankIcon(index + 1)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {player.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{player.team_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.rating}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{player.games_played}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-blue-600">{player.score}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className="text-green-600 font-medium">{player.wins}</span>-
                      <span className="text-yellow-600 font-medium">{player.draws}</span>-
                      <span className="text-red-600 font-medium">{player.losses}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {getScorePercentage(player.score, player.games_played)}%
                      </div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${getScorePercentage(player.score, player.games_played)}%`
                          }}
                        ></div>
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
            <p className="mt-1 text-sm text-gray-500">
              Players will appear here once games are played.
            </p>
          </div>
        )}
      </div>

      {/* Top Performers Summary */}
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
                  <p className="text-xs text-gray-500">
                    {getScorePercentage(player.score, player.games_played)}%
                  </p>
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