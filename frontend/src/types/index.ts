// Tournament Types
export interface Tournament {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  status: 'upcoming' | 'active' | 'completed';
  total_rounds: number;
  current_round: number;
  created_at: string;
  updated_at: string;
}

// Team Types
export interface Team {
  id: number;
  name: string;
  players: Player[];
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  match_points: number;
  game_points: number;
  sonneborn_berger: number;
  buchholz: number;
  direct_encounter?: number;
}

// Player Types
export interface Player {
  id: number;
  name: string;
  rating: number;
  team_id: number;
  position: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
  updated_at: string;
}

// Match Types
export interface Match {
  id: number;
  tournament_id: number;
  round_number: number;
  white_team_id: number;
  black_team_id: number;
  match_date: string;
  match_time: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  white_score: number;
  black_score: number;
  created_at: string;
  updated_at: string;
  white_team: Team;
  black_team: Team;
  games: Game[];
}

// Game Types (individual board games within a match)
export interface Game {
  id: number;
  match_id: number;
  board_number: number;
  white_player_id: number;
  black_player_id: number;
  result: '1-0' | '0-1' | '1/2-1/2' | null;
  white_player: Player;
  black_player: Player;
}

// Standings Types
export interface TeamStanding {
  team: Team;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  match_points: number;
  game_points: number;
  sonneborn_berger: number;
  position: number;
}

// Player Ranking Types
export interface PlayerRanking {
  player: Player;
  wins: number;
  draws: number;
  losses: number;
  total_games: number;
  score: number;
  performance_rating?: number;
  position: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    is_admin: boolean;
  };
}

// Form Types
export interface CreateTournamentForm {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  num_teams: number;
}

export interface CreateTeamForm {
  name: string;
  tournament_id: number;
}

export interface CreatePlayerForm {
  name: string;
  rating: number;
  team_id: number;
}

export interface UpdatePlayerForm {
  name?: string;
  rating?: number;
  position?: number;
}

export interface MatchResultForm {
  games: {
    game_id: number;
    result: '1-0' | '0-1' | '1/2-1/2';
  }[];
}

// UI State Types
export interface AppState {
  currentTab: 'schedule' | 'standings' | 'teams' | 'players';
  isAdminMode: boolean;
  isAuthenticated: boolean;
  user: AuthResponse['user'] | null;
  tournament: Tournament | null;
}

// Hook Types
export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
}
export type TabType = 'schedule' | 'standings' | 'teams' | 'best-players';

export interface UseAuthReturn {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminMode: boolean;
  toggleAdminMode: () => void; 
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

// Component Props Types
export interface AdminToggleProps {
  isAdminMode: boolean;
  onToggle: (isAdmin: boolean) => void;
}

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: LoginRequest) => Promise<boolean>;
}

export interface MatchResultProps {
  match: Match;
  onSubmit: (result: MatchResultForm) => Promise<void>;
  isLoading?: boolean;
}

export interface TeamEditorProps {
  team: Team;
  onUpdate: (team: Partial<Team>) => Promise<void>;
  onAddPlayer: (player: CreatePlayerForm) => Promise<void>;
  onUpdatePlayer: (playerId: number, updates: UpdatePlayerForm) => Promise<void>;
  onRemovePlayer: (playerId: number) => Promise<void>;
  isLoading?: boolean;
}