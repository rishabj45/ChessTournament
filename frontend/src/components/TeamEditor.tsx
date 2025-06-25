import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { Player, Team } from '@/types';
import { apiService } from '@/services/api';

interface TeamEditorProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: Team) => void;
  isAdmin: boolean;
}

const TeamEditor: React.FC<TeamEditorProps> = ({ team, isOpen, onClose, onSave, isAdmin }) => {
  const [name, setName] = useState(team.name);
  const [players, setPlayers] = useState<Player[]>(team.players || []);
  const [originalPlayers, setOriginalPlayers] = useState<Player[]>(team.players || []);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState<number | ''>('');

  useEffect(() => {
    setName(team.name);
    setPlayers(team.players || []);
    setOriginalPlayers(team.players || []);
  }, [team]);

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;

    try {
      const created = await apiService.addPlayer({
        name: newPlayerName.trim(),
        team_id: team.id,
        position: players.length + 1,
        rating: typeof newPlayerRating === 'number' ? newPlayerRating : undefined,
      });
      setPlayers(prev => [...prev, created]);
      setNewPlayerName('');
      setNewPlayerRating('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add player.');
    }
  };

  const removePlayer = async (idx: number) => {
    const player = players[idx];
    if (!player.id) return;

    if (!confirm(`Delete player ${player.name}?`)) return;

    try {
      await apiService.deletePlayer(player.id);
      setPlayers(prev => prev.filter((_, i) => i !== idx));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete player.');
    }
  };

  const save = async () => {
    try {
      const updates = players.map((p, i) => {
        const original = originalPlayers.find(op => op.id === p.id);
        if (p.name.trim() && original && p.name !== original.name) {
          return apiService.updatePlayer(p.id, { name: p.name });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(updates);

      const updatedTeam: Team = {
        ...team,
        name: name.trim(),
        players,
      };

      onSave(updatedTeam);
    } catch (err) {
      alert('Failed to save changes.');
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Edit Team</h3>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Team Name:</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Players:</label>
          <ul className="mb-2 space-y-2">
            {players.map((p, idx) => (
              <li key={p.id ?? idx} className="flex items-center space-x-2">
                <input
                  className="flex-1 border px-3 py-1 rounded"
                  value={p.name}
                  onChange={e => {
                    const updated = [...players];
                    updated[idx].name = e.target.value;
                    setPlayers(updated);
                  }}
                />
                <span className="text-sm text-gray-500 w-12 text-right">
                  {p.rating ?? '—'}
                </span>
                <button onClick={() => removePlayer(idx)} className="text-red-600">
                  <Trash2 />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center mt-2 space-x-2">
            <input
              className="flex-1 border px-3 py-1 rounded"
              placeholder="New player name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
            />
            <input
              type="number"
              className="w-20 border px-2 py-1 rounded"
              placeholder="Rating"
              value={newPlayerRating}
              onChange={e =>
                setNewPlayerRating(e.target.value === '' ? '' : parseInt(e.target.value))
              }
              min={0}
            />
            <button
              className="px-2 py-1 bg-green-500 text-white rounded"
              onClick={addPlayer}
              disabled={!newPlayerName.trim()}
            >
              <Plus />
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={save}
            disabled={!name.trim()}
          >
            <Save className="inline-block mr-1" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamEditor;
