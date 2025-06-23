import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, User, Star } from 'lucide-react';
import { apiService } from '@/services/api';
interface Player {
  id: number;
  name: string;
  rating: number;
  team_id: number;
}

interface Team {
  id: number;
  name: string;
  players: Player[];
}

interface TeamEditorProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: Team) => Promise<void>;
  isAdmin: boolean;
}

const TeamEditor: React.FC<TeamEditorProps> = ({ team, isOpen, onClose, onSave, isAdmin }) => {
  const [editedTeam, setEditedTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removedPlayers, setRemovedPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (team) {
      setEditedTeam({ ...team, players: [...team.players] });
      setRemovedPlayers([]);
    }
  }, [team]);

  // ✅ Defensive check for empty state
  if (!isOpen || !editedTeam || !isAdmin) return null;

  const handleTeamNameChange = (name: string) => {
    setEditedTeam(prev => prev ? { ...prev, name } : null);
  };

  const handlePlayerChange = (playerId: number, field: 'name' | 'rating', value: string) => {
    setEditedTeam(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(player =>
          player.id === playerId
            ? { ...player, [field]: field === 'rating' ? parseInt(value) || 0 : value }
            : player
        )
      };
    });
  };

  const handleAddPlayer = () => {
    if (!editedTeam || editedTeam.players.length >= 6) return;

    const newPlayer: Player = {
      id: Date.now(), // Temporary ID for new players
      name: '',
      rating: 1200,
      team_id: editedTeam.id
    };

    setEditedTeam(prev => prev ? {
      ...prev,
      players: [...prev.players, newPlayer]
    } : null);
  };

  const handleRemovePlayer = (playerId: number) => {
    if (!editedTeam || editedTeam.players.length <= 4) return;

    setEditedTeam(prev => {
      if (!prev) return null;
      const playerToRemove = prev.players.find(p => p.id === playerId);
      if (playerToRemove && playerToRemove.id && !isNaN(playerToRemove.id)) {
        setRemovedPlayers(rp => [...rp, playerToRemove]);
      }
      return {
        ...prev,
        players: prev.players.filter(player => player.id !== playerId)
      };
    });
  };

  const handleSave = async () => {
    if (!team || !editedTeam) return;
    try {
      setSaving(true);

      // Save team details
      await apiService.updateTeam(team.id, { name: editedTeam.name });

      // Save players
      for (const player of editedTeam.players) {
        if (team.players.some(p => p.id === player.id)) {
          await apiService.updatePlayer(player.id, {
            name: player.name,
            rating: player.rating,
          });
        } else {
          await apiService.createPlayer({
            name: player.name,
            rating: player.rating,
            team_id: team.id,
          });
        }
      }

      // Remove deleted players
      for (const player of removedPlayers) {
        await apiService.deletePlayer(player.id);
      }

      await onSave({
        ...editedTeam,
        players: [...editedTeam.players],
      }); // Notify parent of update
      onClose();
    } catch (err) {
      console.error('Failed to save team:', err);
      setError('Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  const sortedPlayers = [...editedTeam.players].sort((a, b) => b.rating - a.rating);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Edit Team: {team?.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={editedTeam.name}
              onChange={(e) => handleTeamNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter team name"
            />
          </div>

          {/* Players Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Players</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {editedTeam.players.length}/6 players
                </span>
                {editedTeam.players.length < 6 && (
                  <button
                    onClick={handleAddPlayer}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Player
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    {index < 4 && (
                      <>
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="sr-only">Starting lineup</span>
                      </>
                    )}
                  </div>

                  <User className="w-5 h-5 text-gray-400" />

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange(player.id, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Player name"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={player.rating}
                        onChange={(e) => handlePlayerChange(player.id, 'rating', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Rating"
                        min="0"
                        max="3000"
                      />
                      <span className="text-sm text-gray-500">ELO</span>
                    </div>
                  </div>

                  {editedTeam.players.length > 4 && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      title="Remove player"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Players are automatically ordered by rating. 
                The top 4 players will be the starting lineup for matches.
                {editedTeam.players.length < 4 && (
                  <span className="block mt-1 text-red-600">
                    ⚠️ Teams must have at least 4 players.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            disabled={saving || editedTeam.players.length < 4}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Team
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamEditor;