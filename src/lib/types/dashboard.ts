export interface Fixture {
  id: string;
  week_number: number;
  match_date: string;
  opposition: string;
  venue: 'home' | 'away';
  result: 'win' | 'loss' | 'to_play';
  status: 'completed' | 'to_play' | 'in_progress';
  team_won?: boolean;
}

export interface Player {
  id: string;
  name: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_percentage: number;
  consecutive_losses: number;
  drop_week?: number;
  last_result?: 'win' | 'loss';
  highest_checkout: number;
  total_180s: number;
}

export interface AttendanceRecord {
  id: string;
  player_id: string;
  week_number: number;
  league_year: string;
  attended: boolean;
  selected: boolean;
  player?: Player;
}

export interface TeamSelection {
  week_number: number;
  selected_players: Player[];
  available_players: Player[];
  unavailable_players: Player[];
  auto_selected: Player[]; // Previous winners
  captain_picks: Player[];
}

export interface DashboardStats {
  current_position: number;
  games_won: number;
  games_lost: number;
  win_percentage: number;
  remaining_fixtures: number;
  top_performer: Player;
  most_improved: Player;
}