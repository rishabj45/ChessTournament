import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Tournament,
  Team,
  Player,
  Match,
  TeamStanding,
  PlayerRanking,
  LoginRequest,
  AuthResponse,
  CreateTournamentForm,
  CreateTeamForm,
  CreatePlayerForm,
  UpdatePlayerForm,
  MatchResultForm,
} from '../types';

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.reload();
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.api.request({
      method,
      url,
      data,
    });
    return response.data;
  }

  // ✅ Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request('POST', '/api/auth/login', credentials);
  }

  async verifyToken(): Promise<{ valid: boolean }> {
    return this.request('POST', '/api/auth/verify-token');
  }

  async logout(): Promise<void> {
    return this.request('POST', '/api/auth/logout');
  }

  // ✅ Tournaments
  async getTournaments(): Promise<Tournament[]> {
    return this.request('GET', '/api/tournaments');
  }

  async getCurrentTournament(): Promise<Tournament> {
    return this.request('GET', '/api/tournaments/current');
  }

  async createTournament(tournament: CreateTournamentForm): Promise<Tournament> {
    return this.request('POST', '/api/tournaments', tournament);
  }

  async updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament> {
    return this.request('PUT', `/api/tournaments/${id}`, updates);
  }

  // ✅ Teams
  async getTeams(): Promise<Team[]> {
    return this.request('GET', '/api/teams');
  }

  async createTeam(team: CreateTeamForm): Promise<Team> {
    return this.request('POST', '/api/teams', team);
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team> {
    return this.request('PUT', `/api/teams/${id}`, updates);
  }

  async deleteTeam(id: number): Promise<void> {
    return this.request('DELETE', `/api/teams/${id}`);
  }

  // ✅ Players
  async getPlayers(): Promise<Player[]> {
    return this.request('GET', '/api/players');
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return this.request('GET', `/api/teams/${teamId}/players`);
  }

  async getPlayerRankings(tournamentId: number): Promise<PlayerRanking[]> {
    return this.request('GET', `/api/tournaments/${tournamentId}/best-players`);
  }

  async createPlayer(player: CreatePlayerForm): Promise<Player> {
    return this.request('POST', '/api/players', player);
  }

  async updatePlayer(id: number, updates: UpdatePlayerForm): Promise<Player> {
    return this.request('PUT', `/api/players/${id}`, updates);
  }

  async deletePlayer(id: number): Promise<void> {
    return this.request('DELETE', `/api/players/${id}`);
  }

  // ✅ Matches
  async getMatches(): Promise<Match[]> {
    return this.request('GET', '/api/matches');
  }

  async getMatchSchedule(tournamentId: number): Promise<Match[]> {
    return this.request('GET', `/api/matches/tournament/${tournamentId}/schedule`);
  }

  async submitMatchResults(matchId: number, data: MatchResultForm): Promise<Match> {
    return this.request('POST', `/api/matches/${matchId}/submit-results`, data);
  }

  // ✅ Standings
  async getStandings(tournamentId: number): Promise<TeamStanding[]> {
    return this.request('GET', `/api/tournaments/${tournamentId}/standings`);
  }

  // ✅ Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request('GET', '/health');
  }
}

export const apiService = new ApiService();
export default apiService;