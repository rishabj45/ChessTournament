import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { UseApiOptions } from '../types';
import toast from 'react-hot-toast';

// Tournaments
export const useTournaments = (options?: UseApiOptions) => {
  return useQuery(
    ['tournaments'],
    () => apiService.getTournaments(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch tournaments');
        options?.onError?.(error);
      },
    }
  );
};

export const useCurrentTournament = (options?: UseApiOptions) => {
  return useQuery(
    ['tournaments', 'current'],
    () => apiService.getCurrentTournament(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch current tournament');
        options?.onError?.(error);
      },
    }
  );
};

export const useCreateTournament = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    apiService.createTournament,
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['tournaments']);
        toast.success('Tournament created successfully!');
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error('Failed to create tournament');
        options?.onError?.(error);
      },
    }
  );
};

// Teams
export const useTeams = (options?: UseApiOptions) => {
  return useQuery(
    ['teams'],
    () => apiService.getTeams(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch teams');
        options?.onError?.(error);
      },
    }
  );
};

export const useCreateTeam = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    apiService.createTeam,
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['teams']);
        toast.success('Team created successfully!');
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error('Failed to create team');
        options?.onError?.(error);
      },
    }
  );
};

export const useUpdateTeam = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, updates }: { id: number; updates: any }) => 
      apiService.updateTeam(id, updates),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['teams']);
        toast.success('Team updated successfully!');
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error('Failed to update team');
        options?.onError?.(error);
      },
    }
  );
};

export const useDeleteTeam = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: number) => apiService.deleteTeam(id),
    {
      onSuccess: (id) => {
        queryClient.invalidateQueries(['teams']);
        toast.success('Team deleted successfully!');
        options?.onSuccess?.(id);
      },
      onError: (error: any) => {
        toast.error('Failed to delete team');
        options?.onError?.(error);
      },
    }
  );
};

// Players
export const usePlayers = (options?: UseApiOptions) => {
  return useQuery(
    ['players'],
    () => apiService.getPlayers(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch players');
        options?.onError?.(error);
      },
    }
  );
};

export const usePlayerRankings = (options?: UseApiOptions) => {
  return useQuery(
    ['players', 'rankings'],
    () => apiService.getPlayerRankings(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch player rankings');
        options?.onError?.(error);
      },
    }
  );
};

export const useCreatePlayer = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    apiService.createPlayer,
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['players']);
        queryClient.invalidateQueries(['teams']);
        toast.success('Player created successfully!');
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error('Failed to create player');
        options?.onError?.(error);
      },
    }
  );
};

export const useUpdatePlayer = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, updates }: { id: number; updates: any }) => 
      apiService.updatePlayer(id, updates),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['players']);
        queryClient.invalidateQueries(['teams']);
        toast.success('Player updated successfully!');
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error('Failed to update player');
        options?.onError?.(error);
      },
    }
  );
};

export const useDeletePlayer = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: number) => apiService.deletePlayer(id),
    {
      onSuccess: (id) => {
        queryClient.invalidateQueries(['players']);
        queryClient.invalidateQueries(['teams']);
        toast.success('Player deleted successfully!');
        options?.onSuccess?.(id);
      },
      onError: (error: any) => {
        toast.error('Failed to delete player');
        options?.onError?.(error);
      },
    }
  );
};

// Matches
export const useMatches = (options?: UseApiOptions) => {
  return useQuery(
    ['matches'],
    () => apiService.getMatches(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch matches');
        options?.onError?.(error);
      },
    }
  );
};

export const useMatchSchedule = (options?: UseApiOptions) => {
  return useQuery(
    ['matches', 'schedule'],
    () => apiService.getMatchSchedule(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch match schedule');
        options?.onError?.(error);
      },
    }
  );
};

export const useUpdateMatchResult = (options?: UseApiOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, result }: { id: number; result: any }) => 
      apiService.updateMatchResult(id, result),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['matches']);
        queryClient.invalidateQueries(['players']);
        queryClient.invalidateQueries(['teams']);
        toast.success('Match result updated successfully!');
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error('Failed to update match result');
        options?.onError?.(error);
      },
    }
  );
};

// Standings
export const useStandings = (options?: UseApiOptions) => {
  return useQuery(
    ['standings'],
    () => apiService.getStandings(),
    {
      ...options,
      onError: (error: any) => {
        toast.error('Failed to fetch standings');
        options?.onError?.(error);
      },
    }
  );
};
// src/hooks/useApi.ts
import axios from 'axios';

export default function useApi() {
  const apiCall = async <T>(path: string, method: string, data?: any) => {
    const resp = await axios.request({ url: path, method, data });
    return { success: true, data: resp.data as T };
  };
  return { apiCall };
}
