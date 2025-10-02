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
  available: boolean;
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
  error: string | null;
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

// Personal practice game types
export interface PersonalGame {
  id: string;
  player_id: string;
  opponent_name: string;
  game_type: 'practice_501' | 'around_clock' | 'cricket' | 'doubles_practice' | 'checkout_practice';
  game_date: string;
  game_won: boolean;
  legs_played: number;
  legs_won: number;
  total_time_minutes?: number;
  notes?: string;
  created_at: string;
}

export interface PersonalStats {
  id: string;
  player_id: string;
  player_name: string;
  game_id: string;
  game_type: PersonalGame['game_type'];
  opponent_name: string;
  game_won: boolean;
  legs_played: number;
  legs_won: number;
  total_darts: number;
  total_points: number;
  average_score: number;
  scores_180: number;
  scores_140_plus: number;
  scores_100_plus: number;
  scores_80_plus: number;
  double_attempts: number;
  double_hits: number;
  double_percentage: number;
  checkout_attempts: number;
  checkout_hits: number;
  checkout_percentage: number;
  highest_checkout: number;
  first_dart_average?: number;
  three_dart_average: number;
  game_date: string;
  session_duration_minutes?: number;
  created_at: string;
}

export interface PersonalGoal {
  id: string;
  player_id: string;
  goal_type: 'average_improvement' | 'checkout_percentage' | 'consistency' | '180_count' | 'custom';
  target_value: number;
  current_value: number;
  deadline_date?: string;
  description: string;
  achieved: boolean;
  created_at: string;
  achieved_at?: string;
}

// Custom Match Types
export interface CustomMatch {
  id: string;
  match_type: 'practice' | 'competitive';
  game_format: number;
  leg_format: 'single' | 'best_of_3' | 'best_of_5' | 'best_of_7';
  player1_id?: string;
  player1_name: string;
  player1_is_guest: boolean;
  player2_id?: string;
  player2_name: string;
  player2_is_guest: boolean;
  first_thrower: 1 | 2;
  winner?: 1 | 2;
  legs_won_player1: number;
  legs_won_player2: number;
  total_legs_played: number;
  match_date: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  players1?: Player;
  players2?: Player;
}

export interface CustomDartTracking {
  id: string;
  custom_match_id: string;
  leg_number: number;
  turn_number: number;
  dart_number: 1 | 2 | 3;
  player_number: 1 | 2;
  dart_score: number;
  multiplier: 1 | 2 | 3;
  segment?: number;
  running_total: number;
  remaining_score: number;
  is_bust: boolean;
  is_checkout_attempt: boolean;
  checkout_successful: boolean;
  is_180: boolean;
  thrown_at: string;
  // Relations
  custom_matches?: CustomMatch;
}

export interface CustomGameStatistics {
  id: string;
  custom_match_id: string;
  leg_number: number;
  player_number: 1 | 2;
  leg_won: boolean;
  total_darts: number;
  three_dart_average: number;
  highest_score: number;
  lowest_score: number;
  total_180s: number;
  scores_140_plus: number;
  scores_100_plus: number;
  scores_60_plus: number;
  checkout_attempts: number;
  checkout_hits: number;
  checkout_percentage: number;
  highest_checkout: number;
  leg_duration_seconds?: number;
  completed_at: string;
  // Relations
  custom_matches?: CustomMatch;
}