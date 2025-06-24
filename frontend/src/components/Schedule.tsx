import React, { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { MatchResponse, Tournament } from '@/types';
import MatchResult from './MatchResult';

interface ScheduleProps {
  isAdmin: boolean;
  tournament: Tournament | null;
  onUpdate: () => void;
}


const Schedule: React.FC<ScheduleProps> = ({ isAdmin, tournament, onUpdate }) => {
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchResponse | null>(null);
  

  useEffect(() => {
    const loadMatches = async () => {
      if (!tournament) return;

      try {
        const allMatches: MatchResponse[] = [];

        for (let round = 1; round <= tournament.total_rounds; round++) {
          const res = await apiService.getMatches(round);
          allMatches.push(...res);
        }

        setMatches(allMatches);
        setError(null);
      } catch (err) {
        console.error('Failed to load schedule:', err);
        setError('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [tournament, onUpdate]); // re-run when tournament is available or updated

  if (loading) return <div>Loading schedule...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-2xl mb-4">Schedule</h2>
      {matches.length === 0 ? (
        <p>No matches scheduled yet.</p>
      ) : (
        matches.map((match) => (
          <div key={match.id} className="bg-white p-4 rounded shadow mb-3">
            <p className="text-gray-800 font-semibold">
              Round {match.round_number}: Team {match.white_team_id} vs Team {match.black_team_id}
            </p>
            <p className="text-sm text-gray-600">
              Scheduled:{' '}
              {match.scheduled_date
                ? new Date(match.scheduled_date).toLocaleString()
                : 'TBD'}
            </p>
            {isAdmin && (
              <button
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => setSelectedMatch(match)}
              >
                Enter Result
              </button>
            )}
          </div>
        ))
      )}

      {selectedMatch && (
        <MatchResult
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default Schedule;
