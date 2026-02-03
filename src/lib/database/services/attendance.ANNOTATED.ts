/**
 * ============================================================================
 * ATTENDANCE SERVICE - Player Availability & Team Selection Database Layer
 * ============================================================================
 *
 * PURPOSE:
 * Manages all database operations for the weekly attendance system. This is
 * how the captain knows who's available each week and who's been picked for
 * the team.
 *
 * HOW LEAGUE DARTS ATTENDANCE WORKS:
 * Each week before a match, players mark themselves as available or not.
 * The captain then reviews the available players and selects 7 for the team.
 * This two-step process (availability → selection) is modelled by two
 * boolean columns on every attendance record:
 *   - available: Did the player say they can play this week?
 *   - selected: Did the captain pick them for the team?
 *
 * DATABASE TABLE: attendance
 * COLUMNS: id, player_id, week_number, available, selected, created_at
 * UNIQUE CONSTRAINT: (player_id, week_number) — one record per player per week
 *
 * METHOD GROUPS:
 * 1. QUERY METHODS    — Read attendance data (lines ~60-115)
 * 2. AVAILABILITY     — Players mark themselves available (lines ~120-190)
 * 3. SELECTION        — Captain selects the team (lines ~195-275)
 * 4. INITIALIZATION   — Set up a new week (lines ~280-315)
 * 5. STATISTICS       — Compute attendance stats (lines ~320-395)
 * 6. ADMIN            — Delete records (lines ~400-420)
 *
 * STATIC METHODS:
 * All methods are static — call directly without instantiation:
 *   AttendanceService.markAvailability(playerId, weekNumber, true)
 *
 * CONSISTENT PATTERN:
 * Every method returns ApiResponse<T>:
 *   - Success: { data: <result>, error: null, loading: false }
 *   - Failure: { data: null, error: <message>, loading: false }
 */

import { supabase, handleDatabaseError } from '../supabase.js';
import type { Attendance, Player, ApiResponse } from '../types.js';

export class AttendanceService {

  // ==========================================================================
  // QUERY METHODS — Read attendance records
  // ==========================================================================

  /**
   * GET BY WEEK — All attendance records for a specific week
   *
   * CALLED BY: Team selection page, captain dashboard
   *
   * RETURNS: All player attendance records for the week, ordered alphabetically
   * by player name. The players(*) join populates each record with full player
   * details (name, email, etc.) so the UI can display names directly.
   *
   * EXAMPLE:
   *   const { data } = await AttendanceService.getByWeek(3);
   *   // data = [
   *   //   { player_id: 'abc', week_number: 3, available: true,  selected: true,  players: { name: 'Alice' } },
   *   //   { player_id: 'def', week_number: 3, available: true,  selected: false, players: { name: 'Bob' } },
   *   //   { player_id: 'ghi', week_number: 3, available: false, selected: false, players: { name: 'Carol' } }
   *   // ]
   */
  static async getByWeek(weekNumber: number): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, players(*)')                 // Join full player records
        .eq('week_number', weekNumber)           // Filter to requested week
        .order('players(name)');                 // Alphabetical by player name

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * GET BY PLAYER — All attendance records for a specific player (all weeks)
   *
   * CALLED BY: Player profile, attendance history view
   *
   * RETURNS: Records ordered newest week first. Useful for showing a player's
   * attendance history: "Available weeks 1-5, missed weeks 6-7..."
   */
  static async getByPlayer(playerId: string): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('player_id', playerId)
        .order('week_number', { ascending: false });   // Most recent week first

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * GET AVAILABLE PLAYERS — Only players who marked themselves available
   *
   * CALLED BY: Captain's team selection view (shows the "pickable" pool)
   *
   * This is a filtered version of getByWeek — adds .eq('available', true).
   * The captain sees only these players when choosing the team.
   */
  static async getAvailablePlayers(weekNumber: number): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, players(*)')
        .eq('week_number', weekNumber)
        .eq('available', true)                   // KEY FILTER: only available players
        .order('players(name)');

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * GET SELECTED PLAYERS — Only players the captain has picked for the team
   *
   * CALLED BY: Match day lineup display, fixture page
   *
   * Returns the confirmed team for the week — the 7 players who will play.
   */
  static async getSelectedPlayers(weekNumber: number): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, players(*)')
        .eq('week_number', weekNumber)
        .eq('selected', true)                    // KEY FILTER: only selected players
        .order('players(name)');

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // AVAILABILITY — Players mark themselves available/unavailable
  // ==========================================================================

  /**
   * MARK AVAILABILITY — A player says "I can/can't play this week"
   *
   * CALLED BY: Attendance page (/attendance), player's own profile
   *
   * UPSERT PATTERN (important!):
   * This method uses a manual check-then-act approach:
   *   1. Look for an existing record for this player+week
   *   2. If found → UPDATE the 'available' field
   *   3. If not found → INSERT a new record
   *
   * WHY NOT USE Supabase's .upsert()?
   * There were issues with the onConflict parameter in earlier versions.
   * The check-first approach is more explicit and reliable, even if it
   * requires two queries. For a single player action, this is fine.
   *
   * PARAMETERS:
   * - playerId:    UUID of the player marking availability
   * - weekNumber:  Which week they're marking for
   * - available:   true = "I'm available", false = "I can't make it"
   *
   * EXAMPLE:
   *   // John says he's available for week 4
   *   await AttendanceService.markAvailability('player-john', 4, true);
   *
   *   // Later, John changes his mind
   *   await AttendanceService.markAvailability('player-john', 4, false);
   */
  static async markAvailability(
    playerId: string,
    weekNumber: number,
    available: boolean
  ): Promise<ApiResponse<Attendance>> {
    try {
      // STEP 1: Check if a record already exists for this player+week
      const { data: existing, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('player_id', playerId)
        .eq('week_number', weekNumber)
        .single();                               // Expect at most one row

      // STEP 2A: Record exists — just update the available flag
      if (existing) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ available })                 // Only change this one field
          .eq('player_id', playerId)
          .eq('week_number', weekNumber)
          .select('*, players(*)')               // Return updated record with player details
          .single();

        if (error) throw error;

        console.log('✅ Attendance updated successfully:', data);

        return {
          data,
          error: null,
          loading: false
        };
      }

      // STEP 2B: No record exists — create one
      // New records start with selected: false (captain hasn't picked yet)
      const attendanceData = {
        player_id: playerId,
        week_number: weekNumber,
        available,
        selected: false                          // Not yet selected by captain
      };

      const { data, error } = await supabase
        .from('attendance')
        .insert([attendanceData])
        .select('*, players(*)')
        .single();

      if (error) {
        console.error('Mark availability error:', error);
        throw error;
      }

      console.log('✅ Attendance marked successfully:', data);

      return {
        data,
        error: null,
        loading: false
      };
    } catch (err) {
      console.error('markAvailability error:', err);
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // SELECTION — Captain picks the team
  // ==========================================================================

  /**
   * SELECT PLAYER — Captain adds/removes a single player from the team
   *
   * CALLED BY: Captain dashboard, team selection page (toggle button)
   *
   * NOTE: This assumes the attendance record already exists (player has
   * already marked availability). It just flips the 'selected' flag.
   *
   * PARAMETERS:
   * - playerId:   Which player to select/deselect
   * - weekNumber: Which week's team
   * - selected:   true = add to team, false = remove from team
   *
   * EXAMPLE:
   *   // Captain picks Alice for the team
   *   await AttendanceService.selectPlayer('player-alice', 4, true);
   *
   *   // Captain changes mind, removes Alice
   *   await AttendanceService.selectPlayer('player-alice', 4, false);
   */
  static async selectPlayer(
    playerId: string,
    weekNumber: number,
    selected: boolean
  ): Promise<ApiResponse<Attendance>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ selected })                    // Flip selected flag
        .eq('player_id', playerId)
        .eq('week_number', weekNumber)
        .select('*, players(*)')
        .single();

      if (error) throw error;

      console.log(`✅ Player ${selected ? 'selected' : 'deselected'} successfully:`, data);

      return {
        data,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * BULK SELECT PLAYERS — Replace the entire team selection in one operation
   *
   * CALLED BY: Team selection page "Confirm Team" button
   *
   * CLEAR-THEN-SET PATTERN:
   * Instead of individually toggling each player, this method:
   *   1. DESELECT ALL players for the week (set selected = false)
   *   2. SELECT only the specified players (set selected = true)
   *
   * WHY THIS APPROACH?
   * It's atomic from the UI's perspective — the captain confirms a full team
   * of 7, and this replaces whatever was previously selected. No need to
   * calculate diffs (who was added, who was removed).
   *
   * PARAMETERS:
   * - playerIds:  Array of UUIDs for the 7 players to select
   * - weekNumber: Which week's team is being set
   *
   * EXAMPLE:
   *   const team = ['player-alice', 'player-bob', 'player-carol', ...]; // 7 players
   *   await AttendanceService.bulkSelectPlayers(team, 4);
   *   // Result: Only these 7 players have selected = true for week 4
   */
  static async bulkSelectPlayers(
    playerIds: string[],
    weekNumber: number
  ): Promise<ApiResponse<Attendance[]>> {
    try {
      // STEP 1: Clear all selections for this week
      // This ensures a clean slate before setting the new team
      await supabase
        .from('attendance')
        .update({ selected: false })
        .eq('week_number', weekNumber);          // All players this week → deselected

      // STEP 2: Select only the specified players
      if (playerIds.length > 0) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ selected: true })
          .eq('week_number', weekNumber)
          .in('player_id', playerIds)            // .in() matches any ID in the array
          .select('*, players(*)');

        if (error) throw error;

        console.log('✅ Team selected successfully:', data);

        return {
          data: data || [],
          error: null,
          loading: false
        };
      }

      // Edge case: empty playerIds array — just cleared everyone, return empty
      return {
        data: [],
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // INITIALIZATION — Set up attendance for a new week
  // ==========================================================================

  /**
   * INITIALIZE WEEK — Create blank attendance records for all players
   *
   * CALLED BY: Admin when setting up a new league week, or automatically
   * when a new fixture is created
   *
   * WHY INITIALIZE?
   * Rather than creating records on-the-fly as players mark availability,
   * this pre-creates a record for every player. This means:
   * - The UI can show ALL players (available and unavailable) from the start
   * - Players who never mark availability still appear as "unavailable"
   * - The captain sees the full squad, not just those who checked in
   *
   * ALL RECORDS START AS:
   * - available: false  (must actively opt in)
   * - selected: false   (captain hasn't picked yet)
   *
   * PARAMETERS:
   * - weekNumber: The new week to initialize
   * - playerIds:  Array of all player UUIDs in the squad
   *
   * EXAMPLE:
   *   const allPlayers = ['player-1', 'player-2', ..., 'player-15'];
   *   await AttendanceService.initializeWeek(5, allPlayers);
   *   // Creates 15 attendance records for week 5, all available=false, selected=false
   */
  static async initializeWeek(
    weekNumber: number,
    playerIds: string[]
  ): Promise<ApiResponse<Attendance[]>> {
    try {
      // Build an array of attendance records — one per player
      const attendanceRecords = playerIds.map(playerId => ({
        player_id: playerId,
        week_number: weekNumber,
        available: false,       // Must actively opt in
        selected: false         // Not yet picked
      }));

      // Bulk insert all records in a single query (efficient)
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendanceRecords)
        .select('*, players(*)');

      if (error) {
        console.error('Initialize week error:', error);
        throw error;
      }

      console.log('✅ Week initialized successfully:', data);

      return {
        data: data || [],
        error: null,
        loading: false
      };
    } catch (err) {
      console.error('initializeWeek error:', err);
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // STATISTICS — Computed attendance metrics
  // ==========================================================================

  /**
   * GET PLAYER ATTENDANCE STATS — How reliable is this player?
   *
   * CALLED BY: Captain dashboard "Performance" tab, player profiles
   *
   * CALCULATES (client-side, from raw records):
   * - totalWeeks:            How many weeks have records (season length so far)
   * - weeksAvailable:        How many times they said "I'm available"
   * - weeksSelected:         How many times the captain picked them
   * - availabilityPercentage: weeksAvailable / totalWeeks × 100
   *   → "How often does this player show up?"
   * - selectionPercentage:   weeksSelected / weeksAvailable × 100
   *   → "Of the times they're available, how often are they picked?"
   *   NOTE: Divides by weeksAvailable (not totalWeeks) — this measures
   *   how in-demand they are among available players, not overall.
   *
   * EXAMPLE OUTPUT:
   * {
   *   totalWeeks: 8,
   *   weeksAvailable: 6,          // Available 6 of 8 weeks
   *   weeksSelected: 5,           // Picked 5 of those 6 times
   *   availabilityPercentage: 75, // 6/8 = 75%
   *   selectionPercentage: 83.3   // 5/6 = 83.3%
   * }
   */
  static async getPlayerAttendanceStats(playerId: string): Promise<ApiResponse<{
    totalWeeks: number;
    weeksAvailable: number;
    weeksSelected: number;
    availabilityPercentage: number;
    selectionPercentage: number;
  }>> {
    try {
      // Only need the two boolean columns — no joins needed
      const { data, error } = await supabase
        .from('attendance')
        .select('available, selected')
        .eq('player_id', playerId);

      if (error) throw error;

      const records = data || [];
      const totalWeeks = records.length;
      const weeksAvailable = records.filter(r => r.available).length;
      const weeksSelected = records.filter(r => r.selected).length;

      const stats = {
        totalWeeks,
        weeksAvailable,
        weeksSelected,
        // Guard against division by zero with ternary
        availabilityPercentage: totalWeeks > 0 ? (weeksAvailable / totalWeeks) * 100 : 0,
        // Selection % is out of available weeks, not total weeks
        selectionPercentage: weeksAvailable > 0 ? (weeksSelected / weeksAvailable) * 100 : 0
      };

      return {
        data: stats,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  /**
   * GET WEEKS SINCE LAST PLAYED — How long has it been since this player played?
   *
   * CALLED BY: Captain dashboard "drop risk" calculation
   * If a player hasn't played in 3+ weeks, they may be flagged as a drop risk.
   *
   * LOGIC:
   * 1. Find the most recent week where this player was selected (selected = true)
   * 2. Subtract that week from currentWeek to get the gap
   * 3. If no selected weeks found → returns null (never played)
   *
   * PGRST116 ERROR CODE:
   * Supabase returns this code when .single() finds no rows.
   * We explicitly allow this (it just means they've never been selected)
   * rather than treating it as an error.
   *
   * EXAMPLE:
   *   // Current week is 6, player last played in week 4
   *   const { data } = await AttendanceService.getWeeksSinceLastPlayed('player-abc', 6);
   *   // data = 2  (week 6 - week 4)
   *
   *   // Player has never been selected
   *   const { data } = await AttendanceService.getWeeksSinceLastPlayed('player-new', 6);
   *   // data = null
   */
  static async getWeeksSinceLastPlayed(playerId: string, currentWeek: number): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('week_number')
        .eq('player_id', playerId)
        .eq('selected', true)                              // Only weeks they actually played
        .order('week_number', { ascending: false })        // Most recent first
        .limit(1)                                          // Just the latest one
        .single();                                         // Unwrap from array

      // PGRST116 = "no rows found" — not a real error, just means never played
      if (error && error.code !== 'PGRST116') throw error;

      // If we found a week, calculate the gap; otherwise null
      const weeksSince = data ? currentWeek - data.week_number : null;

      return {
        data: weeksSince,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }

  // ==========================================================================
  // ADMIN — Destructive operations
  // ==========================================================================

  /**
   * DELETE ATTENDANCE — Remove an attendance record entirely
   *
   * CALLED BY: Admin emergency page only
   *
   * WARNING: Permanent deletion. Use only when a record was created
   * in error (e.g., duplicate week initialization).
   *
   * NOTE: Takes the attendance record's own ID (not player_id + week_number).
   */
  static async deleteAttendance(attendanceId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', attendanceId);

      if (error) throw error;

      console.log('✅ Attendance deleted successfully');

      return {
        data: true,
        error: null,
        loading: false
      };
    } catch (err) {
      return {
        data: null,
        error: handleDatabaseError(err),
        loading: false
      };
    }
  }
}
