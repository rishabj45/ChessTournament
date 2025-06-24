// frontend/src/components/Standings.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { StandingsEntry } from '@/types';

const Standings: React.FC = () => {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);

  useEffect(() => {
    apiService.getStandings().then(data => setStandings(data.standings));
  }, []);

  return (
    <div>
      <h2 className="text-2xl mb-4">Standings</h2>
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Team</th>
            <th className="p-2">Match Points</th>
            <th className="p-2">Game Points</th>
            <th className="p-2">Sonneborn-Berger</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => (
            <tr key={idx}>
              <td className="p-2">{s.team_name}</td>
              <td className="p-2">{s.match_points}</td>
              <td className="p-2">{s.game_points}</td>
              <td className="p-2">{s.sonneborn_berger}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Standings;
