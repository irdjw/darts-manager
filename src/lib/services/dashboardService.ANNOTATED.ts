/**
 * ============================================================================
 * DASHBOARD SERVICE — The Hub Service for All Dashboard Data
 * ============================================================================
 *
 * PURPOSE:
 * Central service that aggregates data from multiple tables for the main
 * dashboard and team management pages. If a page needs data from players +
 * fixtures + attendance combined, it uses DashboardService rather than
 * calling each individual service separately.
 *
 * WHY A SEPARATE SERVICE?
 * Other services are table-focused (GamesService → league_games table,
 * AttendanceService → attendance table). DashboardService is PAGE-focused —
 * it assembles the exact data shapes each page needs. This keeps pages
 * simple: one service call instead of five.
 *
 * INSTANCE PATTERN:
 * Unlike GamesService/AttendanceService (static methods), DashboardService
 * uses instance methods. You create one instance and call methods on it:
 *   const dashboardService = new DashboardService();
 *   const fixture = await dashboardService.getCurrentFixture();
 *
 * RETRY PATTERN:
 * Several write operations wrap in retryDatabaseOperation() which:
 *   - Retries up to 3 times on network/timeout errors
 *   - Exponential backoff: 1s, 2s, 4s between attempts
 *   - Does NOT retry on constraint violations or validation errors
 *
 * ⚠️ KNOWN ISSUES (scattered throughout):
 * 1. league_year '2025/26' is hardcoded in 10+ places — breaks next season
 * 2. saveAttendance uses onConflict on a non-existent unique constraint
 * 3. completeFixture uses Promise.allSettled (not a real DB transaction)
 * 4. calculateLeaguePosition is a rough estimate, not actual league table
 *
 * METHOD GROUPS:
 *   FIXTURE QUERIES      — getCurrentFixture, getUpcomingFixtures, etc.
 *   ATTENDANCE           — getWeeklyAttendance, saveAttendance
 *   PLAYER QUERIES       — getAllPlayers, getPlayerStatsSummary
 *   SEASON STATS         — getSeasonStats (the big aggregator)
 *   GAME MANAGEMENT      — saveLeagueGame, saveGameAssignment, etc.
 *   FIXTURE COMPLETION   — completeFixture (the big transaction)
 *   PRIVATE HELPERS      — calculateLeaguePosition, getDefaultPlayer
 */

import { supabase, handleDatabaseError, retryDatabaseOperation } from '$lib/database/supabase';
import type { Player } from '$lib/database/types';
import type { Fixture, AttendanceRecord, DashboardStats } from '$lib/types/dashboard';
import type { PlayerGameStats } from '$lib/types/scoring';

export class DashboardService {

  // ==========================================================================
  // FIXTURE QUERIES — Read fixture/match data
  // ==========================================================================

  /**
   * GET CURRENT FIXTURE — The next unplayed match
   *
   * CALLED BY: Dashboard hero section, team-selection router, attendance page
   *
   * LOGIC:
   * Finds the fixture with the lowest week_number where result = 'to_play'.
   * This is the "current" match — either happening now or coming up next.
   *
   * RETURNS: Single Fixture object, or null if all fixtures are completed.
   *
   * PGRST116: Supabase's "no rows found" error from .single().
   * We explicitly handle this as "no current fixture" (returns null)
   * rather than treating it as an error.
   *
   * ⚠️ HARDCODED: league_year = '2025/26'
   */
  async getCurrentFixture(): Promise<Fixture | null> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')          // ⚠️ Hardcoded season
        .eq('result', 'to_play')               // Only unplayed fixtures
        .order('week_number', { ascending: true })  // Lowest week first
        .limit(1)
        .single();                              // Unwrap from array (throws PGRST116 if empty)

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current fixture:', error);
        throw error;
      }

      return data || null;
    } catch (err: any) {
      console.error('getCurrentFixture error:', err);
      if (err.code === 'PGRST116') {
        return null;                            // All fixtures played — that's fine
      }
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * GET UPCOMING FIXTURES — Next N unplayed fixtures
   *
   * CALLED BY: Dashboard fixture list, Overview tab
   *
   * PARAMETERS:
   * - limit: How many fixtures to return (default 5)
   *
   * Same as getCurrentFixture but returns an array and doesn't use .single().
   */
  async getUpcomingFixtures(limit: number = 5): Promise<Fixture[]> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .eq('result', 'to_play')
        .order('week_number', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching upcoming fixtures:', error);
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('getUpcomingFixtures error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * GET ALL FIXTURES — Every fixture this season (played and unplayed)
   *
   * CALLED BY: Season overview, league table calculations
   *
   * Returns the full season schedule in week order.
   */
  async getAllFixtures(): Promise<Fixture[]> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .order('week_number', { ascending: true });

      if (error) {
        console.error('Error fetching all fixtures:', error);
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('getAllFixtures error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * GET RECENT RESULTS — Last N completed fixtures (newest first)
   *
   * CALLED BY: Performance tab "Recent Results" section
   *
   * PARAMETERS:
   * - limit: How many results to return (default 5)
   *
   * Filters to result = 'completed' and sorts descending by week.
   */
  async getRecentResults(limit: number = 5): Promise<Fixture[]> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .eq('result', 'completed')             // Only finished fixtures
        .order('week_number', { ascending: false })  // Most recent first
        .limit(limit);

      if (error) {
        console.error('Error fetching recent results:', error);
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('getRecentResults error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * GET CURRENT WEEK — Determine which week number we're in
   *
   * CALLED BY: Attendance page (to know which week to show)
   *
   * PRIMARY: Look up the lowest unplayed fixture's week_number
   * FALLBACK: If no fixtures exist or DB fails, calculate from season start date.
   *   Season starts August 1st. Week = weeks since then + 1.
   *   This is a rough estimate — real week numbers come from the fixtures table.
   *
   * ⚠️ HARDCODED: Season start date '2025-08-01'
   */
  async getCurrentWeek(): Promise<number> {
    try {
      const { data: currentFixture } = await supabase
        .from('fixtures')
        .select('week_number')
        .eq('league_year', '2025/26')
        .eq('result', 'to_play')
        .order('week_number', { ascending: true })
        .limit(1)
        .single();

      return currentFixture ? currentFixture.week_number : 1;

    } catch (err: any) {
      console.error('getCurrentWeek error:', err);
      // DATE-BASED FALLBACK: calculate week from season start
      const seasonStart = new Date('2025-08-01');
      const now = new Date();
      const weeksDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.max(1, weeksDiff + 1);       // At least week 1
    }
  }

  // ==========================================================================
  // ATTENDANCE — Read and write attendance records
  // ==========================================================================

  /**
   * GET WEEKLY ATTENDANCE — All attendance records for one week
   *
   * CALLED BY: teamManagement store, captain dashboard
   *
   * RETURNS: Array of AttendanceRecord with nested player data.
   *
   * JOIN SYNTAX:
   *   player:players(*)
   * This renames the join to 'player' (singular) in the result.
   * So each record has: { player_id: '...', player: { name: 'Alice', ... } }
   *
   * NOTE: Does NOT filter by league_year (removed — was causing issues).
   * If multiple seasons' data exists, this returns ALL of them for the week.
   *
   * PGRST116: Returns empty array if no attendance records exist yet.
   */
  async getWeeklyAttendance(weekNumber: number): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          player:players(*)
        `)                                     // Join players table, alias as 'player'
        .eq('week_number', weekNumber);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching attendance:', error);
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('getWeeklyAttendance error:', err);
      if (err.code === 'PGRST116') {
        return [];                             // No records yet — not an error
      }
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * SAVE ATTENDANCE — Bulk upsert attendance records
   *
   * CALLED BY: Captain dashboard "Save Team" button
   *
   * ⚠️ KNOWN BUG — THIS METHOD WILL FAIL:
   * It uses .upsert() with onConflict: 'player_id,week_number' but the
   * attendance table has NO unique constraint on those columns.
   * Supabase/PostgreSQL will return error PGRST204.
   *
   * ROOT CAUSE: The unique constraint was never created on the table.
   * The attendance page (/attendance) works around this by using
   * delete-then-insert instead of upsert.
   *
   * FIX OPTIONS:
   * 1. Add constraint: ALTER TABLE attendance ADD CONSTRAINT unique_player_week
   *    UNIQUE (player_id, week_number)
   * 2. Replace upsert with delete-then-insert (like the attendance page does)
   * 3. Use the check-first pattern from AttendanceService.markAvailability()
   *
   * RETRY: Wraps in retryDatabaseOperation() for network resilience.
   */
  async saveAttendance(records: Partial<AttendanceRecord>[]): Promise<void> {
    try {
      if (!records || records.length === 0) {
        throw new Error('No attendance records provided');
      }

      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('attendance')
          .upsert(records, {
            // ⚠️ BUG: This constraint doesn't exist on the table!
            onConflict: 'player_id,week_number'
          });

        if (error) {
          console.error('Error saving attendance:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('saveAttendance error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  // ==========================================================================
  // PLAYER QUERIES — Read player data
  // ==========================================================================

  /**
   * GET ALL PLAYERS — Every player in the squad (active + dropped)
   *
   * CALLED BY: Team selection, attendance page, performance table
   *
   * NOTE: Returns ALL players, including dropped ones (drop_week is set).
   * The UI is responsible for filtering/greying out dropped players.
   * Ordered alphabetically by name.
   *
   * ⚠️ DUPLICATION: PlayersService.getAll() in database/services/players.ts
   * does the same query. This exists because DashboardService is the
   * preferred data source for pages (centralised imports).
   */
  async getAllPlayers(): Promise<Player[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('getAllPlayers error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * GET PLAYER STATS SUMMARY — Aggregate stats across all players
   *
   * CALLED BY: Dashboard stats widgets
   *
   * COMPUTES (client-side from player records):
   * - totalPlayers:    Squad size
   * - activePlayers:   Players without a drop_week
   * - topScorer:       Player with most 180s (not highest win rate!)
   * - averageWinRate:  Mean win_percentage across all players
   *
   * GRACEFUL FALLBACK: Returns zeroed-out stats on error rather than
   * throwing. Dashboard should still render even if this fails.
   */
  async getPlayerStatsSummary(): Promise<{
    totalPlayers: number;
    activePlayers: number;
    topScorer: Player | null;
    averageWinRate: number;
  }> {
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('*');

      if (error) {
        console.error('Error fetching player stats:', error);
        throw error;
      }

      const totalPlayers = players?.length || 0;
      // Active = no drop_week set (null means not dropped)
      const activePlayers = players?.filter(p => p.drop_week === null).length || 0;
      // Top scorer by 180s — reduce finds the player with the highest total_180s
      const topScorer = players?.reduce((top, player) =>
        (!top || player.total_180s > top.total_180s) ? player : top
      , null as Player | null) || null;

      // Average win rate across ALL players (including dropped)
      const averageWinRate = totalPlayers > 0
        ? players.reduce((sum, p) => sum + (p.win_percentage || 0), 0) / totalPlayers
        : 0;

      return {
        totalPlayers,
        activePlayers,
        topScorer,
        averageWinRate: Math.round(averageWinRate * 100) / 100  // Round to 2 decimal places
      };
    } catch (err: any) {
      console.error('getPlayerStatsSummary error:', err);
      // Fallback: return zeros instead of crashing the dashboard
      return {
        totalPlayers: 0,
        activePlayers: 0,
        topScorer: null,
        averageWinRate: 0
      };
    }
  }

  // ==========================================================================
  // SEASON STATS — Big aggregator for the dashboard
  // ==========================================================================

  /**
   * GET SEASON STATS — Comprehensive season summary for the dashboard
   *
   * CALLED BY: Main dashboard hero section
   *
   * THIS IS THE BIG ONE. It runs 4 separate queries:
   *   1. All fixtures → calculates wins/losses/win%
   *   2. Remaining (unplayed) fixtures → shows "X games left"
   *   3. Top players by win% (min 3 games) → "Top Performer"
   *   4. Recent players by consecutive_losses → "Most Improved"
   *
   * WHY 4 QUERIES INSTEAD OF ONE?
   * Supabase's JS client doesn't support complex SQL (GROUP BY, subqueries,
   * window functions). So we fetch raw data and compute in JS.
   * For a league with ~26 fixtures, this is plenty fast.
   *
   * RETURNS: DashboardStats object with:
   * - current_position:     Estimated league position (see calculateLeaguePosition)
   * - games_won / lost:     Fixture-level wins and losses
   * - win_percentage:       Team win% this season
   * - remaining_fixtures:   How many fixtures are left to play
   * - top_performer:        Player with best win% (min 3 games)
   * - most_improved:        Player with fewest consecutive losses + high win%
   *
   * FALLBACK: Returns zeroed-out stats on error. Dashboard gracefully
   * degrades rather than showing a blank page.
   */
  async getSeasonStats(): Promise<DashboardStats> {
    try {
      // QUERY 1: All fixtures this season — for win/loss calculation
      const { data: fixtures, error: fixturesError } = await supabase
        .from('fixtures')
        .select('result, team_won, status')
        .eq('league_year', '2025/26');

      if (fixturesError) {
        console.error('Error fetching fixtures for stats:', fixturesError);
      }

      // Filter to completed fixtures only, then count wins/losses
      const completedFixtures = fixtures?.filter(f => f.status === 'completed') || [];
      const gamesWon = completedFixtures.filter(f => f.team_won === true).length;
      const gamesLost = completedFixtures.filter(f => f.team_won === false).length;
      const totalGames = gamesWon + gamesLost;
      const winPercentage = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

      // QUERY 2: Count remaining (unplayed) fixtures
      const { data: remaining, error: remainingError } = await supabase
        .from('fixtures')
        .select('id')                          // Minimal select — just counting
        .eq('league_year', '2025/26')
        .eq('result', 'to_play');

      if (remainingError) {
        console.error('Error fetching remaining fixtures:', remainingError);
      }

      // QUERY 3: Top performers — sorted by win%, minimum 3 games played
      // The min games filter prevents a player who won their only game
      // from showing as "100% win rate" top performer.
      const { data: topPlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .gte('games_played', 3)                // At least 3 games
        .order('win_percentage', { ascending: false })  // Best win% first
        .order('games_won', { ascending: false })       // Tiebreaker: most wins
        .limit(5);

      if (playersError) {
        console.error('Error fetching top players:', playersError);
      }

      // QUERY 4: "Most improved" heuristic
      // Players sorted by: fewest consecutive losses first, then highest win%.
      // This approximates "who's playing well recently" without tracking
      // historical averages per period.
      const { data: recentPlayers, error: recentError } = await supabase
        .from('players')
        .select('*')
        .gte('games_played', 2)
        .order('consecutive_losses', { ascending: true })   // Fewest losses first
        .order('win_percentage', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent players:', recentError);
      }

      // Estimate league position from win percentage
      const currentPosition = this.calculateLeaguePosition(winPercentage, gamesWon);

      return {
        current_position: currentPosition,
        games_won: gamesWon,
        games_lost: gamesLost,
        win_percentage: winPercentage,
        remaining_fixtures: remaining?.length || 0,
        // First element of sorted arrays = best. Fallback to placeholder if empty.
        top_performer: topPlayers?.[0] || this.getDefaultPlayer('Top Performer'),
        most_improved: recentPlayers?.[0] || this.getDefaultPlayer('Most Improved')
      };
    } catch (err: any) {
      console.error('getSeasonStats error:', err);
      // Full fallback — dashboard can still render
      return {
        current_position: 1,
        games_won: 0,
        games_lost: 0,
        win_percentage: 0,
        remaining_fixtures: 0,
        top_performer: this.getDefaultPlayer('Top Performer'),
        most_improved: this.getDefaultPlayer('Most Improved')
      };
    }
  }

  // ==========================================================================
  // GAME MANAGEMENT — Save and manage individual game records
  // ==========================================================================

  /**
   * SAVE LEAGUE GAME — Record a game result for a fixture
   *
   * CALLED BY: Scoring page after a game finishes
   *
   * OPPONENT NAME LOGIC:
   * If opponent_name is provided, use it directly.
   * If not, derive it from the fixture's opposition field:
   *   "[Opposition Team] Player [Game Number]"
   *   e.g., "The Eagles Player 3"
   * This means you can call it with just the IDs and it figures out the name.
   *
   * Uses upsert with onConflict: 'fixture_id,game_number'
   * This assumes a unique constraint exists on (fixture_id, game_number)
   * in league_games — unlike attendance, this one should work.
   */
  async saveLeagueGame(gameData: {
    fixture_id: string;
    game_number: number;
    our_player_id: string;
    opponent_name?: string;
    result: 'win' | 'loss';
  }): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        let opponentName = gameData.opponent_name;

        // Derive opponent name from fixture if not provided
        if (!opponentName) {
          const { data: fixture, error: fixtureError } = await supabase
            .from('fixtures')
            .select('opposition')
            .eq('id', gameData.fixture_id)
            .single();

          if (fixtureError) {
            console.error('Error fetching fixture for opponent name:', fixtureError);
            throw fixtureError;
          }

          // Format: "The Eagles Player 3"
          opponentName = fixture?.opposition
            ? `${fixture.opposition} Player ${gameData.game_number}`
            : `Opposition Player ${gameData.game_number}`;
        }

        const { error } = await supabase
          .from('league_games')
          .upsert({
            fixture_id: gameData.fixture_id,
            game_number: gameData.game_number,
            our_player_id: gameData.our_player_id,
            opponent_name: opponentName,
            result: gameData.result,
          }, {
            onConflict: 'fixture_id,game_number'  // Update if same game already exists
          });

        if (error) {
          console.error('Error saving league game:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('saveLeagueGame error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * SAVE GAME STATISTICS — Record detailed stats for a completed game
   *
   * CALLED BY: Game completion flow (after scoring finishes)
   *
   * INSERTS into game_statistics table — this is the per-game stats archive.
   * Every stat from the game (darts, 180s, doubles, checkouts) is recorded
   * here for historical analysis.
   *
   * OPPONENT NAME: Same derivation logic as saveLeagueGame.
   *
   * FIELDS MAPPED:
   * PlayerGameStats (from scoring types) → game_statistics columns
   * Each field is mapped one-to-one. See the insert object for the full list.
   */
  async saveGameStatistics(stats: PlayerGameStats, fixtureId: string, gameNumber?: number): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // Get opposition team name from fixture
        const { data: fixture, error: fixtureError } = await supabase
          .from('fixtures')
          .select('opposition')
          .eq('id', fixtureId)
          .single();

        if (fixtureError) {
          console.error('Error fetching fixture for opponent name:', fixtureError);
          throw fixtureError;
        }

        // Build opponent name: "The Eagles Player 3" or just "The Eagles Player"
        const opponentName = fixture?.opposition && gameNumber
          ? `${fixture.opposition} Player ${gameNumber}`
          : fixture?.opposition
          ? `${fixture.opposition} Player`
          : 'Opposition Player';

        // INSERT the full stats record — one row per game played
        const { error } = await supabase
          .from('game_statistics')
          .insert({
            player_id: stats.playerId,
            player_name: stats.playerName,
            game_type: 'league',
            fixture_id: fixtureId,
            game_date: new Date().toISOString().split('T')[0],  // "2026-02-03"
            league_year: '2025/26',                              // ⚠️ Hardcoded
            opponent_type: 'team',
            opponent_name: opponentName,
            game_won: stats.gameWon,
            legs_played: stats.legsPlayed,
            legs_won: stats.legsWon,
            total_darts: stats.totalDarts,
            total_points: stats.totalPoints,
            scores_180: stats.scores180,
            scores_140_plus: stats.scores140Plus,
            scores_100_plus: stats.scores100Plus,
            scores_80_plus: stats.scores80Plus,
            double_attempts: stats.doubleAttempts,
            double_hits: stats.doubleHits,
            checkout_attempts: stats.checkoutAttempts,
            checkout_hits: stats.checkoutHits,
            highest_checkout: stats.highestCheckout
          });

        if (error) {
          console.error('Error saving game statistics:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('saveGameStatistics error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * UPDATE PLAYER STATS — Increment a player's season totals after a game
   *
   * CALLED BY: Game completion flow, after saveGameStatistics
   *
   * PATTERN: Read-Modify-Write
   *   1. Fetch current player record
   *   2. Add new game's stats to existing totals
   *   3. Write updated totals back
   *
   * STATS UPDATED:
   * - games_played +1
   * - games_won +1 (if win) or games_lost +1 (if loss)
   * - total_darts += this game's darts
   * - total_180s += this game's 180s
   * - highest_checkout = max(existing, this game's)
   * - checkout_attempts / hits += this game's
   * - last_result = 'win' or 'loss'
   * - consecutive_losses: reset to 0 on win, +1 on loss
   * - win_percentage: recalculated (games_won / games_played × 100)
   *
   * WIN PERCENTAGE PRECISION:
   * Math.round(x * 100) / 100 rounds to 2 decimal places.
   * But the calculation multiplies by 100 twice — this looks like a bug.
   * Likely should be: Math.round((won / played) * 100 * 100) / 100
   * which gives e.g., 66.67 (percent to 2 decimals).
   */
  async updatePlayerStats(playerId: string, gameResult: 'win' | 'loss', gameStats: Partial<PlayerGameStats>): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // STEP 1: Read current player record
        const { data: player, error: fetchError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (fetchError) throw fetchError;

        // STEP 2: Calculate new totals by adding this game's stats
        const updatedStats = {
          games_played: (player.games_played || 0) + 1,
          games_won: (player.games_won || 0) + (gameResult === 'win' ? 1 : 0),
          games_lost: (player.games_lost || 0) + (gameResult === 'loss' ? 1 : 0),
          total_darts: (player.total_darts || 0) + (gameStats.totalDarts || 0),
          total_180s: (player.total_180s || 0) + (gameStats.scores180 || 0),
          // highest_checkout: keep the better of existing and new
          highest_checkout: Math.max(player.highest_checkout || 0, gameStats.highestCheckout || 0),
          checkout_attempts: (player.checkout_attempts || 0) + (gameStats.checkoutAttempts || 0),
          checkout_hits: (player.checkout_hits || 0) + (gameStats.checkoutHits || 0),
          last_result: gameResult,
          // Consecutive losses: reset on win, increment on loss
          consecutive_losses: gameResult === 'win' ? 0 : (player.consecutive_losses || 0) + 1
        };

        // Recalculate win percentage from updated totals
        const win_percentage = updatedStats.games_played > 0
          ? Math.round((updatedStats.games_won / updatedStats.games_played) * 100 * 100) / 100
          : 0;

        // STEP 3: Write updated record back to DB
        const { error: updateError } = await supabase
          .from('players')
          .update({ ...updatedStats, win_percentage })
          .eq('id', playerId);

        if (updateError) {
          console.error('Error updating player stats:', updateError);
          throw updateError;
        }
      });
    } catch (err: any) {
      console.error('updatePlayerStats error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  // ==========================================================================
  // GAME ASSIGNMENTS — Map players to game slots in a fixture
  // ==========================================================================

  /**
   * GET LEAGUE GAME ASSIGNMENTS — Which player is in which game slot
   *
   * CALLED BY: Match setup page (shows "Game 1: John vs ?, Game 2: ...")
   *
   * RETURNS: Array of game assignments with an is_completed flag.
   *
   * COMPLETION CHECK:
   * Checks the game_statistics table to see if stats have been saved
   * for each player. If yes, the game is "completed" — the result is real.
   * This is a cross-table check: league_games has the assignment,
   * game_statistics has the proof it was actually played.
   */
  async getLeagueGameAssignments(fixtureId: string): Promise<Array<{
    game_number: number;
    our_player_id: string;
    opponent_name?: string;
    result?: 'win' | 'loss';
    is_completed?: boolean;
  }>> {
    try {
      // Get the game slot assignments
      const { data, error } = await supabase
        .from('league_games')
        .select(`
          game_number,
          our_player_id,
          opponent_name,
          result,
          created_at
        `)
        .eq('fixture_id', fixtureId)
        .order('game_number', { ascending: true });

      if (error) {
        console.error('Error fetching league game assignments:', error);
        throw error;
      }

      // Cross-reference with game_statistics to determine which games are done
      const { data: completedGames, error: statsError } = await supabase
        .from('game_statistics')
        .select('game_session_id, player_id')
        .eq('fixture_id', fixtureId);

      if (statsError) {
        console.warn('Could not fetch game statistics:', statsError);
      }

      // Build a Set of player IDs who have stats saved (= completed games)
      const completedPlayerIds = new Set(completedGames?.map(g => g.player_id) || []);

      // Merge: add is_completed flag to each assignment
      return (data || []).map(game => ({
        ...game,
        is_completed: completedPlayerIds.has(game.our_player_id)
      }));
    } catch (err: any) {
      console.error('getLeagueGameAssignments error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * SAVE GAME ASSIGNMENT — Assign a player to a specific game slot
   *
   * CALLED BY: Match setup page (captain assigns players to game positions)
   *
   * UPSERT PATTERN (manual check-first):
   *   1. Check if a game already exists for this fixture + game_number
   *   2. If yes → UPDATE the player assignment
   *   3. If no  → INSERT a new game record
   *
   * Uses .maybeSingle() instead of .single() — returns null instead of
   * throwing PGRST116 when no row is found.
   *
   * OPPONENT NAME: Auto-generated as "[Opposition] Player [N]"
   */
  async saveGameAssignment(fixtureId: string, gameNumber: number, playerId: string): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // Get opposition team name
        const { data: fixture } = await supabase
          .from('fixtures')
          .select('opposition')
          .eq('id', fixtureId)
          .single();

        const opponentName = fixture?.opposition
          ? `${fixture.opposition} Player ${gameNumber}`
          : `Opposition Player ${gameNumber}`;

        // Check if this game slot already has a record
        const { data: existingGame } = await supabase
          .from('league_games')
          .select('id')
          .eq('fixture_id', fixtureId)
          .eq('game_number', gameNumber)
          .maybeSingle();               // null if not found (no error)

        if (existingGame) {
          // UPDATE existing — just swap the player
          const { error } = await supabase
            .from('league_games')
            .update({
              our_player_id: playerId,
              opponent_name: opponentName,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingGame.id);

          if (error) throw error;
          console.log('✅ Game assignment updated:', gameNumber);
        } else {
          // INSERT new — create the game slot
          const { error } = await supabase
            .from('league_games')
            .insert({
              fixture_id: fixtureId,
              game_number: gameNumber,
              our_player_id: playerId,
              opponent_name: opponentName,
              result: null,              // Not yet played
              our_score: 0,
              opposition_score: 0,
              created_at: new Date().toISOString()
            });

          if (error) throw error;
          console.log('✅ Game assignment created:', gameNumber);
        }
      });
    } catch (err: any) {
      console.error('saveGameAssignment error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * REMOVE GAME ASSIGNMENT — Remove a player from a game slot
   *
   * CALLED BY: Match setup page (captain removes a player from a position)
   *
   * Simply deletes the league_games row for this fixture + game_number.
   */
  async removeGameAssignment(fixtureId: string, gameNumber: number): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('league_games')
          .delete()
          .eq('fixture_id', fixtureId)
          .eq('game_number', gameNumber);

        if (error) {
          console.error('Error removing game assignment:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('removeGameAssignment error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  /**
   * UPDATE GAME RESULT — Set the win/loss result for a specific game
   *
   * CALLED BY: Admin results page (for manual result entry/correction)
   *
   * Simple UPDATE — just sets the result field on an existing game record.
   */
  async updateGameResult(fixtureId: string, gameNumber: number, result: 'win' | 'loss'): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('league_games')
          .update({ result })
          .eq('fixture_id', fixtureId)
          .eq('game_number', gameNumber);

        if (error) {
          console.error('Error updating game result:', error);
          throw error;
        }
      });
    } catch (err: any) {
      console.error('updateGameResult error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  // ==========================================================================
  // FIXTURE COMPLETION — The big "end of match" operation
  // ==========================================================================

  /**
   * COMPLETE FIXTURE — Record all results and mark fixture as done
   *
   * CALLED BY: Match completion flow (after all 9 games are scored)
   *
   * THIS IS THE BIGGEST OPERATION IN THE APP. It does everything needed
   * to close out a fixture:
   *   1. Determine overall match result (wins vs losses)
   *   2. Update fixture status to 'completed' with team_won flag
   *   3. Upsert each individual game result
   *   4. Save game statistics for each game (if provided)
   *   5. Update each player's season stats
   *
   * "PSEUDO-TRANSACTION" PATTERN:
   * All operations are collected into an array and run via Promise.allSettled().
   * This runs them all concurrently (fast!) but is NOT a real database
   * transaction. If step 3 succeeds but step 5 fails, the fixture is marked
   * complete but player stats are wrong.
   *
   * WHY NOT A REAL TRANSACTION?
   * Supabase's JS client doesn't support multi-statement transactions
   * directly. A proper fix would use a PostgreSQL RPC function (supabase.rpc())
   * that wraps everything in BEGIN/COMMIT.
   *
   * MATCH RESULT CALCULATION:
   * Simple majority: if wins > losses, team won.
   * In a 9-game fixture, you need 5+ wins. Draws shouldn't happen but
   * the code handles them (teamWon = wins > losses, so a 4-4-1 draw
   * would show as a loss — worth investigating).
   *
   * PARAMETERS:
   * - fixtureId:  Which fixture to complete
   * - gameResults: Array of 9 game results with optional stats
   */
  async completeFixture(fixtureId: string, gameResults: Array<{
    gameNumber: number;
    playerId: string;
    playerName: string;
    result: 'win' | 'loss';
    stats?: PlayerGameStats;
  }>): Promise<void> {
    try {
      await retryDatabaseOperation(async () => {
        // Get opposition team name (used for opponent_name fields)
        const { data: fixture, error: fixtureError } = await supabase
          .from('fixtures')
          .select('opposition')
          .eq('id', fixtureId)
          .single();

        if (fixtureError) {
          console.error('Error fetching fixture for opponent name:', fixtureError);
          throw fixtureError;
        }

        // Collect all DB operations into an array for concurrent execution
        const operations = [];

        // CALCULATE MATCH RESULT
        const wins = gameResults.filter(g => g.result === 'win').length;
        const losses = gameResults.filter(g => g.result === 'loss').length;
        const teamWon = wins > losses;  // ⚠️ See note about draws above

        // OPERATION 1: Update the fixture record itself
        operations.push(
          supabase
            .from('fixtures')
            .update({
              result: teamWon ? 'win' : 'loss',
              status: 'completed',
              team_won: teamWon
            })
            .eq('id', fixtureId)
        );

        // OPERATIONS 2-N: Save each game + stats + player updates
        for (const game of gameResults) {
          const opponentName = fixture?.opposition
            ? `${fixture.opposition} Player ${game.gameNumber}`
            : `Opposition Player ${game.gameNumber}`;

          // Upsert the game result
          operations.push(
            supabase
              .from('league_games')
              .upsert({
                fixture_id: fixtureId,
                game_number: game.gameNumber,
                our_player_id: game.playerId,
                opponent_name: opponentName,
                result: game.result
              }, {
                onConflict: 'fixture_id,game_number'
              })
          );

          // If stats are provided, save them and update the player
          if (game.stats) {
            operations.push(
              this.saveGameStatistics(game.stats, fixtureId, game.gameNumber)
            );
            operations.push(
              this.updatePlayerStats(game.playerId, game.result, game.stats)
            );
          }
        }

        // RUN ALL OPERATIONS CONCURRENTLY
        // allSettled (not all) — continues even if some fail, then checks results
        const results = await Promise.allSettled(operations);

        // Check for any failures
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          console.error('Some operations failed during fixture completion:', failures);
          throw new Error('Failed to complete fixture - some operations failed');
        }
      });
    } catch (err: any) {
      console.error('completeFixture error:', err);
      throw new Error(handleDatabaseError(err));
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * CALCULATE LEAGUE POSITION — Rough estimate from win percentage
   *
   * ⚠️ SIMPLIFIED: This is NOT a real league table calculation.
   * A real one would compare all teams' records. This just maps
   * our win% to a position (1-6) using fixed thresholds.
   *
   * THRESHOLDS:
   *   80%+ → Position 1 (top of league)
   *   70%+ → Position 2
   *   ...
   *   <40% → Position 6 (bottom)
   */
  private calculateLeaguePosition(winPercentage: number, gamesWon: number): number {
    if (winPercentage >= 80) return 1;
    if (winPercentage >= 70) return 2;
    if (winPercentage >= 60) return 3;
    if (winPercentage >= 50) return 4;
    if (winPercentage >= 40) return 5;
    return 6;
  }

  /**
   * GET DEFAULT PLAYER — Placeholder player object when no real data
   *
   * Used by getSeasonStats() when no top performer or most improved
   * player exists (e.g., start of season with no games played).
   *
   * Returns a Player with all stats at zero and the provided name
   * as a display label (e.g., "Top Performer", "Most Improved").
   */
  private getDefaultPlayer(name: string): Player {
    return {
      id: '',
      name,
      weeks_attended: 0,
      games_played: 0,
      games_won: 0,
      games_lost: 0,
      last_game_week: null,
      created_at: new Date().toISOString(),
      total_darts: 0,
      total_180s: 0,
      win_percentage: 0,
      highest_checkout: 0,
      checkout_attempts: 0,
      checkout_hits: 0,
      last_result: null,
      consecutive_losses: 0,
      drop_week: null
    };
  }
}
