// frontend/src/components/BestPlayers.tsx
import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { apiService } from '@/services/api';
import { BestPlayerEntry } from '@/types';

const BestPlayers: React.FC = () => {
  const [players, setPlayers] = useState<BestPlayerEntry[]>([]);

  useEffect(() => {
    apiService.getBestPlayers().then(data => setPlayers(data.players));
  }, []);

  return (
    <div>
      <h2 className="text-2xl mb-4">Best Players</h2>
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Position</th>
            <th className="p-2">Player</th>
            <th className="p-2">Rating</th>
            <th className="p-2">Games</th>
            <th className="p-2">Wins</th>
            <th className="p-2">Draws</th>
            <th className="p-2">Losses</th>
            <th className="p-2">Win %</th>
            <th className="p-2">Perf Rating</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.position}>
              <td className="p-2">{p.position}</td>
              <td className="p-2">{p.player_name}</td>
              <td className="p-2">{p.rating}</td>
              <td className="p-2">{p.games_played}</td>
              <td className="p-2">{p.wins}</td>
              <td className="p-2">{p.draws}</td>
              <td className="p-2">{p.losses}</td>
              <td className="p-2">{p.win_percentage.toFixed(1)}%</td>
              <td className="p-2">{p.performance_rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BestPlayers;
