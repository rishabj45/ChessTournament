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

// Add this declaration to fix the ImportMeta.env error
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // add other env variables here if needed
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

    // Request interceptor to add auth token
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

    // Response interceptor to handle errors
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

  // Generic request method
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

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await this.api.post<AuthResponse>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async verifyToken(): Promise<{ valid: boolean }> {
    return this.request('POST', '/api/auth/verify');
  }

  async logout(): Promise<void> {
    return this.request('POST', '/api/auth/logout');
  }

  // Tournaments
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

  // Teams
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

  // Players
  async getPlayers(): Promise<Player[]> {
    return this.request('GET', '/api/players');
  }

  async getPlayerRankings(): Promise<PlayerRanking[]> {
    return this.request('GET', '/api/players/rankings');
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

  // Matches
  async getMatches(): Promise<Match[]> {
    return this.request('GET', '/api/matches');
  }

  async getMatchSchedule(): Promise<Match[]> {
    return this.request('GET', '/api/matches/schedule');
  }

  async updateMatchResult(id: number, result: MatchResultForm): Promise<Match> {
    return this.request('PUT', `/api/matches/${id}/result`, result);
  }

  // Standings (if you have a dedicated endpoint)
  async getStandings(): Promise<TeamStanding[]> {
    // This might be computed on the frontend or you might add this endpoint
    const teams = await this.getTeams();
    const matches = await this.getMatches();
    return this.computeStandings(teams, matches);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request('GET', '/health');
  }

  // Helper method to compute standings (this could be moved to backend)
  private computeStandings(teams: Team[], matches: Match[]): TeamStanding[] {
    const standings: TeamStanding[] = teams.map(team => ({
      team,
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      match_points: 0,
      game_points: 0,
      sonneborn_berger: 0,
      position: 0,
    }));

    // Compute standings from matches
    matches.forEach(match => {
      if (match.status === 'completed') {
        const whiteStanding = standings.find(s => s.team.id === match.white_team_id);
        const blackStanding = standings.find(s => s.team.id === match.black_team_id);

        if (whiteStanding && blackStanding) {
          whiteStanding.matches_played++;
          blackStanding.matches_played++;
          
          whiteStanding.game_points += match.white_score;
          blackStanding.game_points += match.black_score;

          if (match.white_score > match.black_score) {
            whiteStanding.wins++;
            whiteStanding.match_points += 2;
            blackStanding.losses++;
          } else if (match.black_score > match.white_score) {
            blackStanding.wins++;
            blackStanding.match_points += 2;
            whiteStanding.losses++;
          } else {
            whiteStanding.draws++;
            blackStanding.draws++;
            whiteStanding.match_points += 1;
            blackStanding.match_points += 1;
          }
        }
      }
    });

    // Sort by match points, then by game points, then by Sonneborn-Berger
    standings.sort((a, b) => {
      if (b.match_points !== a.match_points) return b.match_points - a.match_points;
      if (b.game_points !== a.game_points) return b.game_points - a.game_points;
      return b.sonneborn_berger - a.sonneborn_berger;
    });

    // Assign positions
    standings.forEach((standing, index) => {
      standing.position = index + 1;
    });

    return standings;
  }
}

export const apiService = new ApiService();
export default apiService;