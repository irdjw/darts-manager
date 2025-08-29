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

export interface GameAssignment {
  gameNumber: number;
  playerId: string | null;
  playerName: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  homeScore: number;
  awayScore: number;
  result: 'win' | 'loss' | null;
}

export interface MatchResult {
  fixtureId: string;
  weekNumber: number;
  gameResults: GameResult[];
  teamResult: 'win' | 'loss';
  homeScore: number;
  awayScore: number;
  completed: boolean;
}

export interface GameResult {
  gameNumber: number;
  playerId: string;
  playerName: string;
  result: 'win' | 'loss';
  homeScore: number;
  awayScore: number;
  gameStats?: any; // PlayerGameStats from scoring system
}