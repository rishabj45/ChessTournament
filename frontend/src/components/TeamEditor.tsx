// frontend/src/components/TeamEditor.tsx
import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { Player, Team } from '@/types';

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
  const [newPlayerName, setNewPlayerName] = useState('');

  useEffect(() => {
    setName(team.name);
    setPlayers(team.players || []);
  }, [team]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;

    const newPlayer: Player = {
      id: 0,
      name: newPlayerName.trim(),
      rating: 1200,
      team_id: team.id,
    };

    setPlayers(prev => [...prev, newPlayer]);
    setNewPlayerName('');
  };

  const removePlayer = (idx: number) => {
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  };

  const save = () => {
    const updatedTeam: Team = {
      ...team,
      name: name.trim(),
      players,
    };

    onSave(updatedTeam);
  };

  if (!isOpen) return null;

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
              <li key={idx} className="flex items-center">
                <input
                  className="flex-1 border px-3 py-1 rounded mr-2"
                  value={p.name}
                  onChange={e => {
                    const updated = [...players];
                    updated[idx].name = e.target.value;
                    setPlayers(updated);
                  }}
                />
                <button onClick={() => removePlayer(idx)} className="text-red-600">
                  <Trash2 />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center mt-2">
            <input
              className="flex-1 border px-3 py-1 rounded mr-2"
              placeholder="New player name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
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
