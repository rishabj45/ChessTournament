// frontend/src/services/api.ts
import axios, { AxiosInstance } from 'axios';
import {
  Tournament, Team, Player, MatchResponse, StandingsResponse, BestPlayersResponse,
  LoginRequest, AuthResponse
} from '@/types';

class ApiService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({ baseURL: '/api' });
    this.client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // ✅ attach token
  }
  return config;
});

  }
  
  // -- Authentication --
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await this.client.post('/auth/login', data);
    return res.data;
  }

  // -- Tournaments --
  async getCurrentTournament(): Promise<Tournament> {
    const res = await this.client.get('/tournaments/current');
    return res.data;
  }
  async getTournaments(): Promise<Tournament[]> {
    const res = await this.client.get('/tournaments');
    return res.data;
  }
  async createTournament(data: any): Promise<Tournament> {
    const res = await this.client.post('/tournaments', data);
    return res.data;
  }

  // -- Teams --
  async getTeams(): Promise<Team[]> {
    const res = await this.client.get('/teams');
    return res.data;
  }
  async createTeam(team: Team): Promise<Team> {
    const res = await this.client.post('/teams', team);
    return res.data;
  }
  async updateTeam(teamId: number, team: Team): Promise<Team> {
    const res = await this.client.put(`/teams/${teamId}`, team);
    return res.data;
  }

  // -- Players (example) --
  async getPlayers(): Promise<Player[]> {
    const res = await this.client.get('/players');
    return res.data;
  }

  // -- Matches --
async getMatches(roundId: number): Promise<MatchResponse[]> {
  const res = await this.client.get(`/matches/${roundId}`);
  return res.data;
}

async submitBoardResult(
  matchId: number,
  boardNumber: number,
  resultPayload: { result: string }
): Promise<void> {
  await this.client.post(`/matches/${matchId}/board/${boardNumber}/result`, resultPayload);
}

  // -- Standings & Best Players --
  async getStandings(): Promise<StandingsResponse> {
    const tournament = await this.getCurrentTournament();
    const res = await this.client.get(`/tournaments/${tournament.id}/standings`);

    return res.data;
  }
  async getBestPlayers(): Promise<BestPlayersResponse> {
    const tournament = await this.getCurrentTournament();
    const res = await this.client.get(`/tournaments/${tournament.id}/best-players`);
    return res.data;
  }
}

export const apiService = new ApiService();
