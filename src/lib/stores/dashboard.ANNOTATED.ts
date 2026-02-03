/**
 * ============================================================================
 * DASHBOARD.TS — Dashboard Data Store (Lightweight Duplicate)
 * ============================================================================
 *
 * PURPOSE:
 * A simplified service that provides fixture and player queries for the
 * dashboard page. It's structured as a class instance (like DashboardService
 * in src/lib/services/) rather than a Svelte store.
 *
 * ⚠️ RELATIONSHIP TO dashboardService.ts:
 * This file is a SECOND, smaller DashboardService. The "real" one lives at
 * src/lib/services/dashboardService.ts (878 lines, 20+ methods). This one
 * has 6 methods and covers only the dashboard page's read needs. Both query
 * the same tables with the same hardcoded league_year = '2025/26'.
 *
 * WHY TWO?
 * Likely a refactoring artifact. The large service evolved from this smaller
 * one, or vice versa, and neither was removed. Components that import from
 * here get slightly different behaviour (e.g. getSeasonStats calculates
 * win_percentage client-side, while the large service's version does the
 * same calculation with identical logic). Both can coexist but it would be
 * cleaner to consolidate into one.
 *
 * METHODS:
 *   getCurrentFixture()          — First fixture for '2025/26' (any status)
 *   getUpcomingFixtures(limit)   — Fixtures with status = 'to_play'
 *   getSeasonStats()             — Aggregated W/L/remaining/top players
 *   getAllPlayers()              — Full player list ordered by name
 *   getWeeklyAttendance(week)   — Attendance records with JOIN to players
 *   markAttendance(...)          — Upsert a single attendance record
 *                                  ⚠️ Same onConflict bug as the large service
 *
 * ERROR HANDLING:
 * Unlike the static services (PlayersService, GamesService) which return
 * ApiResponse<T>, this class either returns data or throws. Callers must
 * wrap calls in try/catch.
 */

// src/lib/services/dashboardService.ts
import { supabase } from '$lib/database/supabase';
import type { Fixture, Player, AttendanceRecord, DashboardStats } from '$lib/types/dashboard';

export class DashboardService {
  // ── getCurrentFixture ───────────────────────────────────────────────────
  // Returns the FIRST fixture in the season, regardless of status.
  // .single() means Supabase returns one object (or null + PGRST116 error).
  // Note: this is NOT necessarily the "current" fixture — it's just the
  // earliest week_number. A fixture with status 'completed' could be returned.
  async getCurrentFixture(): Promise<Fixture | null> {
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league_year', '2025/26')       // ⚠️ Hardcoded season
      .order('week_number', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching current fixture:', error);
      return null;   // Swallows the error — caller gets null, not an exception
    }

    return data;
  }

  // ── getUpcomingFixtures ─────────────────────────────────────────────────
  // Fixtures that haven't been played yet. The limit parameter controls
  // how many to fetch (default 5 for the dashboard carousel).
  async getUpcomingFixtures(limit: number = 5): Promise<Fixture[]> {
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league_year', '2025/26')       // ⚠️ Hardcoded season
      .eq('status', 'to_play')
      .order('week_number', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming fixtures:', error);
      throw new Error('Failed to load fixtures');   // This one throws — inconsistent with getCurrentFixture
    }

    return data || [];
  }

  // ── getSeasonStats ──────────────────────────────────────────────────────
  // Builds the season summary card on the dashboard.
  //
  // THREE SEQUENTIAL QUERIES (not parallelised):
  //   1. All fixtures → calculate W/L totals
  //   2. Remaining (to_play) fixtures → count
  //   3. Top 2 players by win_percentage
  //
  // ⚠️ current_position is hardcoded as 1. A real league position would
  // require fetching ALL teams' results and ranking — not implemented.
  //
  // ⚠️ most_improved uses the 2nd-ranked player by win%, which is NOT
  // "most improved" in any meaningful sense. A real implementation would
  // compare current stats to previous season or a rolling window.
  async getSeasonStats(): Promise<DashboardStats> {
    // Query 1: All fixtures (completed + in_progress) for W/L
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('result, team_won')
      .eq('league_year', '2025/26');

    const gamesWon  = fixtures?.filter(f => f.team_won === true).length  || 0;
    const gamesLost = fixtures?.filter(f => f.team_won === false).length || 0;
    const totalGames    = gamesWon + gamesLost;
    const winPercentage = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

    // Query 2: Count remaining fixtures
    const { data: remaining } = await supabase
      .from('fixtures')
      .select('id')
      .eq('league_year', '2025/26')
      .eq('status', 'to_play');

    // Query 3: Top 2 players — first is "top performer", second is "most improved"
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .order('win_percentage', { ascending: false })
      .limit(2);

    return {
      current_position: 1,                                           // ⚠️ Hardcoded
      games_won: gamesWon,
      games_lost: gamesLost,
      win_percentage: winPercentage,
      remaining_fixtures: remaining?.length || 0,
      top_performer: players?.[0] || {} as Player,                  // Fallback to empty object if no players
      most_improved: players?.[1] || {} as Player                   // ⚠️ Not actually "most improved"
    };
  }

  // ── getAllPlayers ────────────────────────────────────────────────────────
  // Simple alphabetical player list. Used by attendance and admin views.
  async getAllPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      throw new Error('Failed to load players');
    }

    return data || [];
  }

  // ── getWeeklyAttendance ─────────────────────────────────────────────────
  // Attendance records for one week, with the related player data JOINed in.
  //
  // The select string `*, player:players(*)` is Supabase's JOIN syntax:
  //   *              → all columns from the attendance table
  //   player:players(*)  → JOIN players table, nest result under key "player"
  // Result shape: { id, player_id, available, selected, ..., player: { id, name, ... } }
  async getWeeklyAttendance(weekNumber: number): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        player:players(*)
      `)
      .eq('week_number', weekNumber)
      .eq('league_year', '2025/26');     // ⚠️ Hardcoded season

    if (error) {
      console.error('Error fetching attendance:', error);
      throw new Error('Failed to load attendance');
    }

    return data || [];
  }

  // ── markAttendance ──────────────────────────────────────────────────────
  // Upsert a single attendance record.
  //
  // ⚠️ BUG: .upsert() without an onConflict column will attempt an INSERT.
  // If a record already exists for this (player_id, week_number), the insert
  // will either create a duplicate or fail depending on whether a unique
  // constraint exists. The attendance table has NO unique constraint on
  // (player_id, week_number, league_year), so this creates duplicates.
  // See the same bug in the large dashboardService.ts.
  async markAttendance(playerId: string, weekNumber: number, available: boolean): Promise<void> {
    const { error } = await supabase
      .from('attendance')
      .upsert({
        player_id: playerId,
        week_number: weekNumber,
        league_year: '2025/26',          // ⚠️ Hardcoded season
        available
      });

    if (error) {
      console.error('Error marking attendance:', error);
      throw new Error('Failed to update attendance');
    }
  }
}

// Pre-instantiated singleton for convenience imports:
//   import { dashboardService } from '$lib/stores/dashboard';
export const dashboardService = new DashboardService();
