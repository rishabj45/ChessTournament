// src/hooks/apiHooks.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiService } from '../services/api';
import { UseApiOptions } from '../types';
import toast from 'react-hot-toast';

// 🏆 Tournaments
export const useTournaments = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => apiService.getTournaments(),
    ...options,
  });

  // Custom error handling
  if (result.error) {
    toast.error('Failed to fetch tournaments');
    options?.onError?.(result.error);
  }

  return result;
};

export const useCurrentTournament = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['tournaments', 'current'],
    queryFn: () => apiService.getCurrentTournament(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch current tournament');
    options?.onError?.(result.error);
  }

  return result;
};

export const useCreateTournament = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.createTournament,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament created successfully!');
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error('Failed to create tournament');
      options?.onError?.(error);
    },
  });
};

// 🧠 Teams
export const useTeams = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiService.getTeams(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch teams');
    options?.onError?.(result.error);
  }

  return result;
};

export const useCreateTeam = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.createTeam,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created successfully!');
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error('Failed to create team');
      options?.onError?.(error);
    },
  });
};

export const useUpdateTeam = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      apiService.updateTeam(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team updated successfully!');
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error('Failed to update team');
      options?.onError?.(error);
    },
  });
};

export const useDeleteTeam = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteTeam(id),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted successfully!');
      options?.onSuccess?.(id);
    },
    onError: (error: any) => {
      toast.error('Failed to delete team');
      options?.onError?.(error);
    },
  });
};

// 🧑‍🤝‍🧑 Players
export const usePlayers = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['players'],
    queryFn: () => apiService.getPlayers(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch players');
    options?.onError?.(result.error);
  }

  return result;
};

export const usePlayerRankings = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['players', 'rankings'],
    queryFn: () => apiService.getPlayerRankings(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch player rankings');
    options?.onError?.(result.error);
  }

  return result;
};

export const useCreatePlayer = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.createPlayer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Player created successfully!');
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error('Failed to create player');
      options?.onError?.(error);
    },
  });
};

export const useUpdatePlayer = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      apiService.updatePlayer(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Player updated successfully!');
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error('Failed to update player');
      options?.onError?.(error);
    },
  });
};

export const useDeletePlayer = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deletePlayer(id),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Player deleted successfully!');
      options?.onSuccess?.(id);
    },
    onError: (error: any) => {
      toast.error('Failed to delete player');
      options?.onError?.(error);
    },
  });
};

// 🕒 Matches
export const useMatches = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['matches'],
    queryFn: () => apiService.getMatches(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch matches');
    options?.onError?.(result.error);
  }

  return result;
};

export const useMatchSchedule = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['matches', 'schedule'],
    queryFn: () => apiService.getMatchSchedule(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch match schedule');
    options?.onError?.(result.error);
  }

  return result;
};

export const useUpdateMatchResult = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, result }: { id: number; result: any }) =>
      apiService.updateMatchResult(id, result),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Match result updated successfully!');
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error('Failed to update match result');
      options?.onError?.(error);
    },
  });
};

// 🏁 Standings
export const useStandings = (options?: UseApiOptions) => {
  const result = useQuery({
    queryKey: ['standings'],
    queryFn: () => apiService.getStandings(),
    ...options,
  });

  if (result.error) {
    toast.error('Failed to fetch standings');
    options?.onError?.(result.error);
  }

  return result;
};
