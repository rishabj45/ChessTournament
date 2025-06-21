import React, { useState, useEffect } from 'react';
import { Users, Edit, Plus, Star, User} from 'lucide-react';
import TeamEditor from './TeamEditor';

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
  average_rating?: number;
  total_players?: number;
}

interface TeamsProps {
  isAdmin: boolean;
}

const Teams: React.FC<TeamsProps> = ({ isAdmin }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      
      // Calculate team statistics
      const teamsWithStats = data.map((team: Team) => ({
        ...team,
        average_rating: team.players.length > 0 
          ? Math.round(team.players.reduce((sum, player) => sum + player.rating, 0) / team.players.length)
          : 0,
        total_players: team.players.length
      }));
      
      setTeams(teamsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsEditorOpen(true);
  };

  const handleSaveTeam = async (editedTeam: Team) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/teams/${editedTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editedTeam.name,
          players: editedTeam.players.map(player => ({
            id: player.id > 1000000000 ? undefined : player.id, // New players have temporary IDs
            name: player.name,
            rating: player.rating,
            team_id: editedTeam.id
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save team');
      }

      await fetchTeams();
    } catch (err) {
      throw err;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 2000) return 'text-purple-600 bg-purple-50';
    if (rating >= 1800) return 'text-blue-600 bg-blue-50';
    if (rating >= 1600) return 'text-green-600 bg-green-50';
    if (rating >= 1400) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getTeamStrengthBar = (avgRating: number) => {
    const maxRating = 2500;
    const percentage = Math.min((avgRating / maxRating) * 100, 100);
    return percentage;
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
          onClick={fetchTeams}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Tournament Teams
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {teams.length} teams registered for the tournament
            </p>
          </div>
          {isAdmin && (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Team
            </button>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Team Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{team.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">
                      {team.total_players} players
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      Avg: {team.average_rating}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleEditTeam(team)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>

              {/* Team Strength Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Team Strength</span>
                  <span>{team.average_rating}/2500</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getTeamStrengthBar(team.average_rating || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Players List */}
            <div className="p-6">
              <div className="space-y-3">
                {team.players
                  .sort((a, b) => b.rating - a.rating)
                  .map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-full text-xs font-medium">
                            {index + 1}
                          </div>
                          {index < 4 && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800">{player.name}</p>
                          {index < 4 && (
                            <p className="text-xs text-gray-500">Starting player</p>
                          )}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(player.rating)}`}>
                        {player.rating}
                      </div>
                    </div>
                  ))}
              </div>

              {team.players.length === 0 && (
                <div className="text-center py-6">
                  <User className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No players assigned</p>
                </div>
              )}

              {/* Team Stats Summary */}
              {team.players.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-800">{team.total_players}</p>
                      <p className="text-xs text-gray-500">Total Players</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-600">{team.average_rating}</p>
                      <p className="text-xs text-gray-500">Avg Rating</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-600">
                        {Math.max(...team.players.map(p => p.rating))}
                      </p>
                      <p className="text-xs text-gray-500">Top Player</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No teams found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Teams will appear here once they are created.
          </p>
        </div>
      )}

      {/* Team Editor Modal */}
      <TeamEditor
        team={selectedTeam}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedTeam(null);
        }}
        onSave={handleSaveTeam}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default Teams;