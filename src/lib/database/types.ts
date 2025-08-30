// Database interface definitions (preserving existing schema)
export interface Player {
  id: string;
  name: string;
  weeks_attended: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  last_game_week: number | null;
  created_at: string;
  total_darts: number;
  total_180s: number;
  win_percentage: number;
  highest_checkout: number;
  checkout_attempts: number;
  checkout_hits: number;
  last_result: 'win' | 'loss' | null;
  consecutive_losses: number;
  drop_week: number | null;
}

export interface Fixture {
  id: string;
  week_number: number;
  opposition: string;
  venue: 'home' | 'away';
  match_date: string;
  result: 'win' | 'loss' | 'draw' | null;
  our_score: number;
  opposition_score: number;
  created_at: string;
  completed: boolean;
}

export interface Attendance {
  id: string;
  player_id: string;
  week_number: number;
  attended: boolean;
  selected: boolean;
  created_at: string;
  // Relations (populated via joins)
  players?: Player;
}

export interface LeagueGame {
  id: string;
  fixture_id: string;
  our_player_id: string;
  opposition_player: string;
  result: 'win' | 'loss' | null;
  our_score: number;
  opposition_score: number;
  game_order: number;
  created_at: string;
  // Relations
  fixtures?: Fixture;
  players?: Player;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'captain' | 'player';
  created_at: string;
}

export interface WarmupSession {
  id: string;
  week_number: number | null;
  format: 'single_leg' | 'best_of_3';
  player_count: number;
  created_at: string;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole['role'];
  created_at: string;
  last_sign_in_at: string | null;
}