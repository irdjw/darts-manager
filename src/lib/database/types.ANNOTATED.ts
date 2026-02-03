/**
 * ============================================================================
 * DATABASE TYPES — All TypeScript Interfaces for the Database Layer
 * ============================================================================
 *
 * PURPOSE:
 * Single source of truth for every data shape in the application. These
 * interfaces map directly to database tables. When Supabase returns a row,
 * it's typed as one of these interfaces.
 *
 * ORGANISATION (in this file):
 *   1. CORE TYPES         — Player, Fixture, Attendance, LeagueGame
 *   2. AUTH TYPES          — UserRole, AuthUser
 *   3. RESPONSE WRAPPERS   — ApiResponse<T>, PaginatedResponse<T>
 *   4. PERSONAL PRACTICE   — PersonalGame, PersonalStats, PersonalGoal
 *   5. CUSTOM MATCHES      — CustomMatch, CustomDartTracking, CustomGameStatistics
 *
 * RELATION PATTERN:
 * Many interfaces have optional fields like `players?: Player` or
 * `fixtures?: Fixture`. These are populated when the Supabase query
 * includes a JOIN (written as `players(*)` in the select string).
 * If the query doesn't join, these fields are undefined.
 *
 * EXAMPLE:
 *   // Without join — players field is undefined
 *   .select('*')  →  { id: '...', player_id: '...', players: undefined }
 *
 *   // With join — players field is populated
 *   .select('*, players(*)')  →  { id: '...', player_id: '...', players: { name: 'Alice', ... } }
 */

// ==========================================================================
// 1. CORE TYPES — The main entities in the darts league system
// ==========================================================================

/**
 * PLAYER — A member of our darts team
 *
 * TABLE: players
 *
 * FIELDS EXPLAINED:
 * - id:                  UUID primary key
 * - name:                Display name (e.g., "John Smith")
 * - weeks_attended:      How many weeks this player has shown up (season total)
 * - games_played:        Total individual 501 games played this season
 * - games_won / lost:    Individual game results (not leg results)
 * - last_game_week:      Which week they last played in (null if never played)
 * - total_darts:         Total darts thrown across all games this season
 * - total_180s:          Total maximum scores (triple 20 × 3) hit
 * - win_percentage:      games_won / games_played × 100 (stored, not computed)
 * - highest_checkout:    Best finish they've ever hit (e.g., 170 = perfect checkout)
 * - checkout_attempts:   How many times they attempted a finish
 * - checkout_hits:       How many of those attempts succeeded
 * - last_result:         Result of their most recent game ('win' | 'loss' | null)
 * - consecutive_losses:  Current losing streak. Resets to 0 on a win.
 *                        Used by the captain dashboard to flag "drop risk" players.
 * - drop_week:           If set, the week this player was dropped from the squad.
 *                        null = still active. Players with drop_week are greyed out
 *                        in the UI and excluded from team selection.
 *
 * COMPUTED vs STORED:
 * win_percentage is stored in the DB (updated after each game by updatePlayerStats).
 * It's NOT computed on the fly. This is a denormalisation for performance —
 * avoids recalculating on every page load.
 */
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

/**
 * FIXTURE — A team match (our team vs opposition)
 *
 * TABLE: fixtures
 *
 * A fixture is the top-level container for a weekly team match.
 * It contains up to 9 individual games (see LeagueGame).
 *
 * FIELDS:
 * - week_number:         Which week of the season (1-26 typically)
 * - opposition:          Name of the opposing team (e.g., "The Eagles")
 * - venue:               'home' or 'away' — determines where the match is played
 * - match_date:          ISO date string of when the match happens
 * - result:              Overall team result: 'win' | 'loss' | 'draw' | null
 *                        null = not yet played
 * - our_score:           Total individual games WE won (out of 9)
 * - opposition_score:    Total individual games THEY won
 * - completed:           Boolean flag — true once all 9 games are recorded
 *
 * LIFECYCLE: to_play → completed
 * The 'result' field doubles as a status indicator:
 *   null or 'to_play' = upcoming
 *   'win' / 'loss' / 'draw' = completed
 */
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

/**
 * ATTENDANCE — One player's availability record for one week
 *
 * TABLE: attendance
 * UNIQUE: Should be (player_id, week_number) but constraint is missing
 *         (see ATTENDANCE_ISSUES_ANALYSIS.md)
 *
 * TWO-STEP WORKFLOW:
 *   1. Player sets available = true  (via /attendance page)
 *   2. Captain sets selected = true  (via /team or /team-selection)
 *
 * RELATION: players? is populated when the query joins players(*)
 */
export interface Attendance {
  id: string;
  player_id: string;
  week_number: number;
  available: boolean;      // Step 1: Player opted in
  selected: boolean;       // Step 2: Captain picked them
  created_at: string;
  // Relations (populated via joins)
  players?: Player;        // Full player record, if joined
}

/**
 * LEAGUE GAME — One individual 501 match within a fixture
 *
 * TABLE: league_games
 *
 * A fixture has up to 9 of these. Each game is one of our players
 * against one opposition player.
 *
 * FIELDS:
 * - fixture_id:          Which fixture this game belongs to
 * - our_player_id:       UUID of our player (references players table)
 * - opposition_player:   NAME string of the opponent (not a UUID — see games.ts)
 * - result:              This game's result from our player's perspective
 * - our_score:           Legs won by our player (e.g., 3 in best-of-5)
 * - opposition_score:    Legs won by opponent
 * - game_order:          Position in the fixture (1-9). Determines play sequence.
 *
 * RELATIONS: fixtures? and players? populated when joined
 */
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

// ==========================================================================
// 2. AUTH TYPES — User roles and authentication
// ==========================================================================

/**
 * USER ROLE — Permission level for a user
 *
 * TABLE: user_roles
 *
 * ROLE HIERARCHY (most → least privileged):
 * - super_admin: Full access, can do everything
 * - admin:       Can manage players, fixtures, emergency actions
 * - captain:     Can select teams, view all attendance
 * - player:      Can only mark own attendance, view own stats
 *
 * A user can have multiple roles (e.g., a captain who is also a player).
 */
export interface UserRole {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'captain' | 'player';
  created_at: string;
}

/**
 * AUTH USER — The authenticated user's profile
 *
 * Not a DB table per se — assembled from Supabase Auth + user_roles.
 * Used server-side in hooks.server.ts to attach role info to the session.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole['role'];       // Their primary/highest role
  created_at: string;
  last_sign_in_at: string | null;
}

// ==========================================================================
// 3. RESPONSE WRAPPERS — Consistent API response shapes
// ==========================================================================

/**
 * API RESPONSE — Standard wrapper for all database operations
 *
 * USED BY: All database service methods (GamesService, AttendanceService, etc.)
 *
 * WHY THIS PATTERN?
 * Instead of throwing exceptions (which callers must wrap in try/catch),
 * every DB operation returns one of these. The caller checks:
 *   if (response.error) { /* handle error *\/ }
 *   else { /* use response.data *\/ }
 *
 * FIELDS:
 * - data:    The result (null on error)
 * - error:   Error message string (null on success)
 * - loading: Currently unused in most places, but available for UI state
 *
 * GENERIC: <T> is the shape of data on success.
 *   ApiResponse<Player[]>  →  data is Player[] or null
 *   ApiResponse<boolean>   →  data is true/false or null
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * PAGINATED RESPONSE — ApiResponse extended with pagination metadata
 *
 * Used when a query returns a large result set split into pages.
 * Extends ApiResponse<T[]> — so data is always an array.
 *
 * FIELDS:
 * - total:    Total number of records matching the query (before pagination)
 * - page:     Current page number (1-based)
 * - pageSize: How many records per page
 *
 * EXAMPLE:
 *   { data: [player1, player2, ...10 items], total: 47, page: 1, pageSize: 10 }
 *   → "Showing page 1 of 5 (47 total players, 10 per page)"
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ==========================================================================
// 4. PERSONAL PRACTICE — Solo/practice game types
// ==========================================================================

/**
 * PERSONAL GAME — A practice session the player plays outside league matches
 *
 * TABLE: personal_games
 *
 * GAME TYPES:
 * - practice_501:        Standard 501 countdown (same as league, but casual)
 * - around_clock:        Hit 1-20 in order around the dartboard
 * - cricket:             Target specific numbers for points
 * - doubles_practice:    Focus on hitting doubles
 * - checkout_practice:   Focus on finishing combinations
 *
 * opponent_name: Who they played against (could be "Solo" for practice alone)
 */
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

/**
 * PERSONAL STATS — Detailed statistics from a personal practice game
 *
 * TABLE: personal_stats (or game_statistics)
 *
 * Contains every stat tracked during a practice session:
 * averages, high scores, doubles, checkouts, etc.
 * Similar shape to the league game stats but tied to personal_games.
 */
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
  average_score: number;           // Points per dart
  scores_180: number;              // Maximum scores (60+60+60)
  scores_140_plus: number;
  scores_100_plus: number;
  scores_80_plus: number;
  double_attempts: number;
  double_hits: number;
  double_percentage: number;       // double_hits / double_attempts × 100
  checkout_attempts: number;
  checkout_hits: number;
  checkout_percentage: number;
  highest_checkout: number;
  first_dart_average?: number;     // Average of just the first dart each turn
  three_dart_average: number;      // Points per 3-dart turn (the standard "average")
  game_date: string;
  session_duration_minutes?: number;
  created_at: string;
}

/**
 * PERSONAL GOAL — A target the player sets for themselves
 *
 * TABLE: personal_goals
 *
 * GOAL TYPES:
 * - average_improvement:    Improve 3-dart average by X points
 * - checkout_percentage:    Hit X% of checkout attempts
 * - consistency:            Maintain average above X for Y sessions
 * - 180_count:              Hit X number of 180s in a session
 * - custom:                 Free-form goal with description
 *
 * TRACKING:
 * - target_value:   What they're aiming for
 * - current_value:  Where they are now (updated after each session)
 * - achieved:       Has the goal been reached?
 * - achieved_at:    When it was reached (null if not yet)
 */
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

// ==========================================================================
// 5. CUSTOM MATCHES — Ad-hoc matches (practice, friendlies, etc.)
// ==========================================================================

/**
 * CUSTOM MATCH — A non-league match set up by a user
 *
 * TABLE: custom_matches
 *
 * Unlike league games (which are part of fixtures), custom matches are
 * standalone. They can be practice, competitive friendlies, or warmups.
 *
 * PLAYER FIELDS:
 * - player1/player2 can each be either a registered player (has _id) or a
 *   guest (player1_is_guest = true, no _id). Guests are typed in by name only.
 *
 * FORMAT:
 * - game_format:   Starting score (always 501)
 * - leg_format:    How many legs determine the winner
 *     'single'     = first to win 1 leg
 *     'best_of_3'  = first to win 2 legs
 *     'best_of_5'  = first to win 3 legs
 *     'best_of_7'  = first to win 4 legs
 *
 * RESULT TRACKING:
 * - winner: 1 or 2 (which player won), undefined if not finished
 * - legs_won_player1 / player2: current leg scores
 * - total_legs_played: how many legs have been completed
 */
export interface CustomMatch {
  id: string;
  match_type: 'practice' | 'competitive';
  game_format: number;                    // Starting score (501)
  leg_format: 'single' | 'best_of_3' | 'best_of_5' | 'best_of_7';
  player1_id?: string;                    // undefined if guest
  player1_name: string;
  player1_is_guest: boolean;
  player2_id?: string;                    // undefined if guest
  player2_name: string;
  player2_is_guest: boolean;
  first_thrower: 1 | 2;                   // Who throws first
  winner?: 1 | 2;                         // Who won (undefined if in progress)
  legs_won_player1: number;
  legs_won_player2: number;
  total_legs_played: number;
  match_date: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  players1?: Player;                      // Populated if player1 is registered
  players2?: Player;                      // Populated if player2 is registered
}

/**
 * CUSTOM DART TRACKING — Every single dart thrown in a custom match
 *
 * TABLE: custom_dart_tracking
 *
 * Same level of granularity as the league scoring system's DartThrow —
 * records each individual dart with its score, context, and running total.
 *
 * KEY FIELDS:
 * - leg_number / turn_number / dart_number: Position in the match
 *   (leg 2, turn 5, dart 3 = third dart of the fifth turn of the second leg)
 * - player_number: 1 or 2 (which player threw this dart)
 * - dart_score:    Points scored (0 for miss, up to 60 for triple 20)
 * - multiplier:    1 = single, 2 = double, 3 = treble
 * - segment:       Which number on the board (1-20, or 25 for bull)
 * - running_total: Cumulative score for this player in this leg
 * - remaining_score: Score left to checkout (501 - running_total)
 * - is_bust:       Did this dart cause a bust? (score went negative)
 * - is_checkout_attempt: Was the player attempting to finish?
 * - checkout_successful: Did they finish successfully?
 * - is_180:        Was this dart part of a 180 (max score turn)?
 */
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

/**
 * CUSTOM GAME STATISTICS — Per-leg summary stats for a custom match
 *
 * TABLE: custom_game_statistics
 *
 * One row per leg per player. Aggregates all the dart-level data from
 * CustomDartTracking into summary statistics for that leg.
 *
 * USEFUL FOR: "In leg 2, Player 1 averaged 45 with a highest checkout of 86"
 *
 * KEY STATS:
 * - three_dart_average:  Points per 3-dart turn (the headline "average")
 * - highest_score:       Best single turn in this leg
 * - lowest_score:        Worst single turn (excluding busts? — check logic)
 * - checkout_percentage: checkout_hits / checkout_attempts × 100
 * - leg_duration_seconds: How long this leg took to play
 */
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
