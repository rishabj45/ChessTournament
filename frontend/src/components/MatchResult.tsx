import React, { useState } from 'react';
import { Save, X, Crown, User } from 'lucide-react';

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

interface MatchResultProps {
  match: Match;
  onClose: () => void;
  onSave: (matchId: number, results: { [gameId: number]: string }) => Promise<void>;
  isAdmin: boolean;
}

const MatchResult: React.FC<MatchResultProps> = ({ match, onClose, onSave, isAdmin }) => {
  const [results, setResults] = useState<{ [gameId: number]: string }>(() => {
    const initialResults: { [gameId: number]: string } = {};
    match.games.forEach(game => {
      if (game.result) {
        initialResults[game.id] = game.result;
      }
    });
    return initialResults;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResultChange = (gameId: number, result: string) => {
    setResults(prev => ({
      ...prev,
      [gameId]: result
    }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    
    try {
      setSaving(true);
      setError(null);
      await onSave(match.id, results);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const getResultOptions = () => [
    { value: '1-0', label: 'White Wins (1-0)' },
    { value: '0-1', label: 'Black Wins (0-1)' },
    { value: '1/2-1/2', label: 'Draw (½-½)' },
    { value: '', label: 'Not played' }
  ];

  const calculateTeamScores = () => {
    let whiteScore = 0;
    let blackScore = 0;

    match.games.forEach(game => {
      const result = results[game.id] || game.result;
      if (result === '1-0') {
        whiteScore += 1;
      } else if (result === '0-1') {
        blackScore += 1;
      } else if (result === '1/2-1/2') {
        whiteScore += 0.5;
        blackScore += 0.5;
      }
    });

    return { whiteScore, blackScore };
  };

  const { whiteScore, blackScore } = calculateTeamScores();

  const getResultColor = (result: string) => {
    switch (result) {
      case '1-0':
        return 'text-green-600 bg-green-50';
      case '0-1':
        return 'text-red-600 bg-red-50';
      case '1/2-1/2':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Crown className="w-5 h-5 text-blue-600" />
              Round {match.round_number} - Match Result
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(match.scheduled_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Score Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <h3 className="font-semibold text-gray-800">{match.white_team_name}</h3>
              <p className="text-sm text-gray-600">White</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {whiteScore} - {blackScore}
              </div>
              <p className="text-sm text-gray-500">Team Score</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-800">{match.black_team_name}</h3>
              <p className="text-sm text-gray-600">Black</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Games */}
        <div className="p-6">
          <div className="space-y-4">
            {match.games.map((game) => (
              <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">
                    Board {game.board_number}
                  </h4>
                  <div className={`px-2 py-1 rounded-full text-xs ${getResultColor(results[game.id] || game.result || '')}`}>
                    {results[game.id] || game.result || 'Not played'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* White Player */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">{game.white_player_name}</p>
                      <p className="text-xs text-gray-500">{game.white_team_name}</p>
                    </div>
                  </div>

                  {/* Result Selection */}
                  <div className="flex justify-center">
                    {isAdmin ? (
                      <select
                        value={results[game.id] || ''}
                        onChange={(e) => handleResultChange(game.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {getResultOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className={`px-3 py-2 rounded-md text-sm font-medium ${getResultColor(game.result || '')}`}>
                        {game.result || 'Not played'}
                      </div>
                    )}
                  </div>

                  {/* Black Player */}
                  <div className="flex items-center space-x-2 justify-end">
                    <div>
                      <p className="font-medium text-gray-800 text-right">{game.black_player_name}</p>
                      <p className="text-xs text-gray-500 text-right">{game.black_team_name}</p>
                    </div>
                    <User className="w-4 h-4 text-gray-400" />
                    <div className="w-4 h-4 bg-gray-800 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Results
                </>
              )}
            </button>
          </div>
        )}

        {/* Match Status */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Status: {match.status}</span>
            <span>
              {match.games.filter(g => results[g.id] || g.result).length} of {match.games.length} games completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchResult;