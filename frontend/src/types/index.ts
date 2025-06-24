// frontend/src/types/index.ts
export type TabType = 'teams' | 'schedule' | 'standings' | 'bestPlayers';

export interface LayoutProps {
  children: React.ReactNode;
  currentTab: TabType;
  onTabSelect: (tab: TabType) => void;
  tournament?: Tournament | null;
  isAdmin: boolean;
  onAdminToggle: () => void;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (creds: {username:string,password:string}) => Promise<boolean>;
}


export interface Tournament {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  current_round: number;
  total_rounds: number;
}

export interface Team {
  id: number;
  name: string;
  tournament_id: number;
  players?: Player[];
  match_points?: number;
  game_points?: number;
}

export interface Player {
  id: number;
  name: string;
  team_id: number;
  position?: number;
  rating?: number;
  games_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  points?: number;
}

export interface GameResponse {
  id: number;
  board_number: number;
  white_player_id: number;
  black_player_id: number;
  result: string;
}

export interface RoundResponse {
  id: number;
  round_number: number;
  is_completed: boolean;
  games: GameResponse[];
}

export interface MatchResponse {
  id: number;
  round_number: number;
  white_team_id: number;
  black_team_id: number;
  white_score: number;
  black_score: number;
  result: string;
  scheduled_date: string;
  is_completed: boolean;
  games: GameResponse[];
}

export interface StandingsEntry {
  team_id: number;
  team_name: string;
  match_points: number;
  game_points: number;
  sonneborn_berger: number;
}

export interface StandingsResponse {
  standings: StandingsEntry[];
}

export interface BestPlayerEntry {
  player_id: number;
  player_name: string;
  team_id: number;
  rating: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  win_percentage: number;
  performance_rating: number;
  position: number;
}

export interface BestPlayersResponse {
  tournament_id: number;
  tournament_name: string;
  players: BestPlayerEntry[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  username: string;
  token: string;
}

export interface UseApiOptions {
  onSuccess?: () => void;
}
