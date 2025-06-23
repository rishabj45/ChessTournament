import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Eye, Edit } from 'lucide-react';
import MatchResult from './MatchResult';
import { apiService } from '@/services/api';

interface Game {
  id: number;
  board_number: number;
  white_player_id: number;
  white_player_name: string;
  black_player_id: number;
  black_player_name: string;
  result: string | null;
  white_team_name: string;
  black_team_name: string;
}

interface Match {
  id: number;
  round_number: number;
  white_team_id: number;
  white_team_name: string;
  black_team_id: number;
  black_team_name: string;
  white_team_score: number;
  black_team_score: number;
  status: string;
  scheduled_date: string;
  games: Game[];
}

interface ScheduleProps {
  isAdmin: boolean;
  onUpdate: () => Promise<void>;
}

const Schedule: React.FC<ScheduleProps> = ({ isAdmin }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const current = await apiService.getCurrentTournament();
      const response = await fetch(`/api/matches/tournament/${current.id}/schedule`);
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatchResult = async (matchId: number, results: { [gameId: number]: string }) => {
    try {
        const gameResults = Object.entries(results).map(([gameId, res]) => {
    // Find board number from match.games if needed, here assume we have it
          const game = selectedMatch?.games.find((g:Game) => g.id === Number(gameId));
          return { board_number: game?.board_number, result: res };
      });
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/matches/${matchId}/submit-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(gameResults)
    });
    if (!res.ok) throw new Error('Failed to save match results');
    await fetchMatches();
    } catch (err) {
      throw err;
    }
  };

  const getMatchStatus = (match: Match) => {
    const completedGames = match.games.filter(game => game.result).length;
    const totalGames = match.games.length;
    
    if (completedGames === 0) return 'Not Started';
    if (completedGames === totalGames) return 'Completed';
    return 'In Progress';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchResult = (match: Match) => {
    const whiteScore = match.white_team_score;
    const blackScore = match.black_team_score;
    
    if (whiteScore === blackScore) return 'Draw';
    return whiteScore > blackScore ? `${match.white_team_name} Wins` : `${match.black_team_name} Wins`;
  };

  const filteredMatches = selectedRound === 'all' 
    ? matches 
    : matches.filter(match => match.round_number === selectedRound);

  const rounds = [...new Set(matches.map(match => match.round_number))].sort((a, b) => a - b);

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
          onClick={fetchMatches}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Round:</span>
          </div>
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Rounds</option>
            {rounds.map(round => (
              <option key={round} value={round}>Round {round}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.map((match) => {
          const status = getMatchStatus(match);
          const isCompleted = status === 'Completed';
          
          return (
            <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Match Header */}
              <div className="bg-gray-50 px-6 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-gray-800">
                      Round {match.round_number}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(match.scheduled_date).toLocaleDateString()}
                      <Clock className="w-4 h-4 ml-2" />
                      {new Date(match.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      {isAdmin ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {isAdmin ? 'Edit' : 'View'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Team Matchup */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-white border-2 border-gray-400 rounded"></div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{match.white_team_name}</h4>
                      <p className="text-sm text-gray-600">White</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">
                      {match.white_team_score} - {match.black_team_score}
                    </div>
                    {isCompleted && (
                      <p className="text-sm text-gray-600 mt-1">
                        {getMatchResult(match)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-right">{match.black_team_name}</h4>
                      <p className="text-sm text-gray-600 text-right">Black</p>
                    </div>
                    <div className="w-6 h-6 bg-gray-800 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Board Results Preview */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {match.games.map((game) => (
                    <div key={game.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Board {game.board_number}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          game.result 
                            ? game.result === '1-0' 
                              ? 'bg-green-100 text-green-800' 
                              : game.result === '0-1'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {game.result || 'TBD'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-white border border-gray-400 rounded mr-2"></div>
                          <span className="truncate">{game.white_player_name}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-gray-800 rounded mr-2"></div>
                          <span className="truncate">{game.black_player_name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No matches found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedRound === 'all' 
              ? 'No matches have been scheduled yet.' 
              : `No matches found for Round ${selectedRound}.`}
          </p>
        </div>
      )}

      {/* Match Result Modal */}
      {selectedMatch && (
        <MatchResult
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onSave={handleSaveMatchResult}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default Schedule;