export type MatchType = 'practice' | 'competitive';
export type GameFormat = 301 | 501 | 701;
export type LegFormat = 'single' | 'best_of_3' | 'best_of_5' | 'best_of_7';

export interface CustomMatch {
  id: string;
  match_type: MatchType;
  game_format: GameFormat;
  leg_format: LegFormat;
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
}

export interface CreateCustomMatchParams {
  match_type: MatchType;
  game_format: GameFormat;
  leg_format: LegFormat;
  player1_id?: string;
  player1_name: string;
  player1_is_guest?: boolean;
  player2_id?: string;
  player2_name: string;
  player2_is_guest?: boolean;
  first_thrower: 1 | 2;
}

export interface CustomMatchPlayer {
  id?: string;
  name: string;
  is_guest: boolean;
}

export interface CustomMatchSetupForm {
  match_type: MatchType;
  game_format: GameFormat;
  leg_format: LegFormat;
  player1: CustomMatchPlayer;
  player2: CustomMatchPlayer;
  first_thrower: 1 | 2;
}

export interface CustomMatchSummary {
  match: CustomMatch;
  player1_stats: CustomGameStatistics[];
  player2_stats: CustomGameStatistics[];
}