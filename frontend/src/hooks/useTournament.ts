// src/hooks/useTournament.ts

import { useState, useEffect, useCallback } from 'react';
import  useApi  from './useApi';
import { useAuth } from './useAuth';
import {
  Tournament,
  Team,
  Player,
  Match,
  TeamStanding,
  PlayerRanking,
  CreateTournamentForm,
  CreateTeamForm,
  CreatePlayerForm,
  UpdatePlayerForm,
  MatchResultForm
} from '../types';

// Define UpdateTeamForm here since it's missing from types
export interface UpdateTeamForm {
  name?: string;
  coach?: string;
  members?: number[]; // array of player IDs
}

interface TournamentState {
  tournament: Tournament | null;
  teams: Team[];
  players: Player[];
  matches: Match[];
  standings: TeamStanding[];
  playerRankings: PlayerRanking[];
  loading: boolean;
  error: string | null;
}

interface TournamentActions {
  // Tournament management
  createTournament: (data: CreateTournamentForm) => Promise<void>;
  updateTournament: (id: number, data: Partial<Tournament>) => Promise<void>;
  refreshTournament: () => Promise<void>;
  
  // Team management
  createTeam: (data: CreateTeamForm) => Promise<void>;
  updateTeam: (id: number, data: UpdateTeamForm) => Promise<void>;
  deleteTeam: (id: number) => Promise<void>;
  
  // Player management
  createPlayer: (data: CreatePlayerForm) => Promise<void>;
  updatePlayer: (id: number, data: UpdatePlayerForm) => Promise<void>;
  deletePlayer: (id: number) => Promise<void>;
  
  // Match management
  submitMatchResult: (matchId: number, result: MatchResultForm) => Promise<void>;
  
  // Data refresh
  refreshAll: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  refreshStandings: () => Promise<void>;
  refreshPlayerRankings: () => Promise<void>;
}

export const useTournament = (): TournamentState & TournamentActions => {
  const { apiCall } = useApi();
  const { isAuthenticated, user } = useAuth();

  const [state, setState] = useState<TournamentState>({
    tournament: null,
    teams: [],
    players: [],
    matches: [],
    standings: [],
    playerRankings: [],
    loading: false,
    error: null
  });

  // Helper to merge partial updates into state
  const updateState = useCallback((updates: Partial<TournamentState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Centralized error handler
  const handleError = useCallback((error: unknown, action: string) => {
    console.error(`Error in ${action}:`, error);
    // If using axios, you can narrow the type; for now we'll do a safe extraction:
    let errorMessage = `Failed to ${action}`;
    if (error && typeof error === 'object') {
      // @ts-ignore
      if (error.response && error.response.data && error.response.data.detail) {
        // @ts-ignore
        errorMessage = error.response.data.detail;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
    }
    updateState({ error: errorMessage, loading: false });
    // Rethrow so calling code can also handle if needed
    throw new Error(errorMessage);
  }, [updateState]);

  //
  // ==== Refresh functions: declare these first, before any usage
  //

  const refreshTournament = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Tournament>('/tournaments/current', 'GET');
      if (response.success && response.data) {
        updateState({ tournament: response.data, loading: false });
      } else {
        // No current tournament or endpoint returned no data
        updateState({ tournament: null, loading: false });
      }
    } catch (error) {
      console.warn('No current tournament found or error fetching it:', error);
      updateState({ tournament: null, loading: false });
    }
  }, [apiCall, updateState]);

  const refreshTeams = useCallback(async () => {
    try {
      const response = await apiCall<Team[]>('/teams', 'GET');
      if (response.success && response.data) {
        updateState({ teams: response.data });
      }
    } catch (error) {
      console.warn('Failed to refresh teams:', error);
    }
  }, [apiCall, updateState]);

  const refreshPlayers = useCallback(async () => {
    try {
      const response = await apiCall<Player[]>('/players', 'GET');
      if (response.success && response.data) {
        updateState({ players: response.data });
      }
    } catch (error) {
      console.warn('Failed to refresh players:', error);
    }
  }, [apiCall, updateState]);

  const refreshMatches = useCallback(async () => {
    try {
      const response = await apiCall<Match[]>('/matches', 'GET');
      if (response.success && response.data) {
        updateState({ matches: response.data });
      }
    } catch (error) {
      console.warn('Failed to refresh matches:', error);
    }
  }, [apiCall, updateState]);

  const refreshStandings = useCallback(async () => {
    try {
      const response = await apiCall<TeamStanding[]>('/standings', 'GET');
      if (response.success && response.data) {
        updateState({ standings: response.data });
      }
    } catch (error) {
      console.warn('Failed to refresh standings:', error);
    }
  }, [apiCall, updateState]);

  const refreshPlayerRankings = useCallback(async () => {
    try {
      const response = await apiCall<PlayerRanking[]>('/players/rankings', 'GET');
      if (response.success && response.data) {
        updateState({ playerRankings: response.data });
      }
    } catch (error) {
      console.warn('Failed to refresh player rankings:', error);
    }
  }, [apiCall, updateState]);

  const refreshAll = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      // Run all in parallel; they each update their slice of state.
      await Promise.all([
        refreshTournament(),
        refreshTeams(),
        refreshPlayers(),
        refreshMatches(),
        refreshStandings(),
        refreshPlayerRankings()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      updateState({ loading: false });
    }
  }, [
    refreshTournament,
    refreshTeams,
    refreshPlayers,
    refreshMatches,
    refreshStandings,
    refreshPlayerRankings,
    updateState
  ]);

  //
  // ==== Action functions (these now can safely call refresh…)
  //

  // Tournament management
  const createTournament = useCallback(async (data: CreateTournamentForm) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Tournament>('/tournaments', 'POST', data);
      if (response.success && response.data) {
        updateState({ tournament: response.data, loading: false });
        // Reload all related data
        await refreshAll();
      } else {
        throw new Error('Failed to create tournament');
      }
    } catch (error) {
      handleError(error, 'create tournament');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshAll]);

  const updateTournament = useCallback(async (id: number, data: Partial<Tournament>) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Tournament>(`/tournaments/${id}`, 'PUT', data);
      if (response.success && response.data) {
        updateState({ tournament: response.data, loading: false });
      } else {
        throw new Error('Failed to update tournament');
      }
    } catch (error) {
      handleError(error, 'update tournament');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError]);

  // Team management
  const createTeam = useCallback(async (data: CreateTeamForm) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Team>('/teams', 'POST', data);
      if (response.success && response.data) {
        // Refresh teams & standings
        await refreshTeams();
        await refreshStandings();
      } else {
        throw new Error('Failed to create team');
      }
    } catch (error) {
      handleError(error, 'create team');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshTeams, refreshStandings]);

  const updateTeam = useCallback(async (id: number, data: UpdateTeamForm) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Team>(`/teams/${id}`, 'PUT', data);
      if (response.success && response.data) {
        await refreshTeams();
        await refreshStandings();
      } else {
        throw new Error('Failed to update team');
      }
    } catch (error) {
      handleError(error, 'update team');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshTeams, refreshStandings]);

  const deleteTeam = useCallback(async (id: number) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall(`/teams/${id}`, 'DELETE');
      if (response.success) {
        await refreshTeams();
        await refreshStandings();
      } else {
        throw new Error('Failed to delete team');
      }
    } catch (error) {
      handleError(error, 'delete team');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshTeams, refreshStandings]);

  // Player management
  const createPlayer = useCallback(async (data: CreatePlayerForm) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Player>('/players', 'POST', data);
      if (response.success && response.data) {
        // After creating a player, refresh players, teams (in case team membership changed), and rankings
        await refreshPlayers();
        await refreshTeams();
        await refreshPlayerRankings();
      } else {
        throw new Error('Failed to create player');
      }
    } catch (error) {
      handleError(error, 'create player');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshPlayers, refreshTeams, refreshPlayerRankings]);

  const updatePlayer = useCallback(async (id: number, data: UpdatePlayerForm) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Player>(`/players/${id}`, 'PUT', data);
      if (response.success && response.data) {
        await refreshPlayers();
        await refreshTeams();
        await refreshPlayerRankings();
      } else {
        throw new Error('Failed to update player');
      }
    } catch (error) {
      handleError(error, 'update player');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshPlayers, refreshTeams, refreshPlayerRankings]);

  const deletePlayer = useCallback(async (id: number) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall(`/players/${id}`, 'DELETE');
      if (response.success) {
        await refreshPlayers();
        await refreshTeams();
        await refreshPlayerRankings();
      } else {
        throw new Error('Failed to delete player');
      }
    } catch (error) {
      handleError(error, 'delete player');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshPlayers, refreshTeams, refreshPlayerRankings]);

  // Match management
  const submitMatchResult = useCallback(async (matchId: number, result: MatchResultForm) => {
    if (!isAuthenticated || !user) {
      throw new Error('Admin access required');
    }
    try {
      updateState({ loading: true, error: null });
      const response = await apiCall<Match>(`/matches/${matchId}/result`, 'PUT', result);
      if (response.success && response.data) {
        await refreshMatches();
        await refreshStandings();
        await refreshPlayerRankings();
      } else {
        throw new Error('Failed to submit match result');
      }
    } catch (error) {
      handleError(error, 'submit match result');
    }
  }, [apiCall, isAuthenticated, user, updateState, handleError, refreshMatches, refreshStandings, refreshPlayerRankings]);

  //
  // ==== Effects
  //

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Whenever matches change, auto-refresh standings and rankings
  useEffect(() => {
    if (state.matches.length > 0) {
      refreshStandings();
      refreshPlayerRankings();
    }
  }, [state.matches, refreshStandings, refreshPlayerRankings]);

  //
  // ==== Return state + actions
  //
  return {
    // State
    tournament: state.tournament,
    teams: state.teams,
    players: state.players,
    matches: state.matches,
    standings: state.standings,
    playerRankings: state.playerRankings,
    loading: state.loading,
    error: state.error,

    // Actions
    createTournament,
    updateTournament,
    refreshTournament,
    createTeam,
    updateTeam,
    deleteTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    submitMatchResult,
    refreshAll,
    refreshTeams,
    refreshPlayers,
    refreshMatches,
    refreshStandings,
    refreshPlayerRankings
  };
};
