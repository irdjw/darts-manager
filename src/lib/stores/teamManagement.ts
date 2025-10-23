/**
 * TEAM MANAGEMENT STORE
 *
 * PURPOSE:
 * - Manages team selection state and logic
 * - Generates team recommendations based on attendance
 * - Provides reactive stores for team selection UI
 *
 * USED BY:
 * - /team-selection/[week]/+page.svelte (team selection page)
 *
 * DATABASE DEPENDENCIES:
 * - players table (via DashboardService)
 * - attendance table (via DashboardService)
 *
 * WORKFLOW:
 * 1. Load all players
 * 2. Load attendance for specific week
 * 3. Generate team selection (available vs unavailable)
 * 4. Captain can then select 7 players from available list
 */

import { writable } from 'svelte/store';
import { DashboardService } from '$lib/services/dashboardService';
import type { Player, AttendanceRecord, TeamSelection } from '$lib/types/dashboard';

const dashboardService = new DashboardService();

/**
 * REACTIVE STORES
 *
 * These are Svelte writable stores that components can subscribe to
 * When the value changes, all subscribed components automatically update
 */

// All players in the system (regardless of availability)
export const allPlayers = writable<Player[]>([]);

// Attendance records for a specific week
// Each record has: { player_id, week_number, available, selected }
export const weeklyAttendance = writable<AttendanceRecord[]>([]);

// Current team selection state
// Contains: available_players[], selected_players[], auto_selected[], etc.
export const currentSelection = writable<TeamSelection | null>(null);

// The week number we're selecting for
export const selectionWeek = writable<number>(1);

/**
 * TEAM STORE OBJECT
 *
 * Contains methods for team management operations
 * These are called by the team selection page
 */
export const teamStore = {
  /**
   * LOAD PLAYERS
   *
   * CALLED: When team selection page mounts
   *
   * FLOW:
   * 1. Calls DashboardService.getAllPlayers()
   * 2. Updates allPlayers store with result
   *
   * DATABASE QUERY:
   * SELECT * FROM players ORDER BY name
   */
  async loadPlayers() {
    const players = await dashboardService.getAllPlayers();
    allPlayers.set(players);
  },

  /**
   * LOAD ATTENDANCE
   *
   * CALLED: When team selection page needs attendance for a specific week
   *
   * PARAMETERS:
   * - weekNumber: The week to load attendance for (e.g., 1, 2, 3...)
   *
   * FLOW:
   * 1. Calls DashboardService.getWeeklyAttendance(weekNumber)
   * 2. Updates weeklyAttendance store with result
   *
   * DATABASE QUERY:
   * SELECT *, player:players(*) FROM attendance
   * WHERE week_number = X
   *
   * NOTE: This query was previously filtering by league_year but that was
   * causing issues, so it was removed in dashboardService.ts
   */
  async loadAttendance(weekNumber: number) {
    const attendance = await dashboardService.getWeeklyAttendance(weekNumber);
    weeklyAttendance.set(attendance);
  },

  /**
   * GENERATE TEAM SELECTION
   *
   * CALLED: When team selection page loads
   *
   * PURPOSE:
   * Creates a TeamSelection object that divides all players into:
   * - available_players: Players who marked themselves as available
   * - unavailable_players: Players who are not available
   * - auto_selected: Players automatically picked (currently empty)
   * - selected_players: Current team selection
   * - captain_picks: Players manually picked by captain
   *
   * PARAMETERS:
   * - weekNumber: Week to generate selection for
   *
   * RETURNS:
   * TeamSelection object with categorized player lists
   *
   * FLOW:
   * 1. Load all players from database
   * 2. Load attendance records for this week
   * 3. Filter players into available/unavailable based on attendance
   * 4. Create TeamSelection object
   * 5. Update currentSelection store
   *
   * LOGIC FOR AVAILABLE:
   * - Find attendance record for player by player_id
   * - If record exists and available = true -> AVAILABLE
   * - If no record or available = false -> UNAVAILABLE
   *
   * NOTE: Currently no auto-selection logic
   * In the future, this might auto-select previous week's winners
   */
  async generateTeamSelection(weekNumber: number): Promise<TeamSelection> {
    // STEP 1: Load all players
    const players = await dashboardService.getAllPlayers();

    // STEP 2: Load attendance for this week
    const attendance = await dashboardService.getWeeklyAttendance(weekNumber);

    // STEP 3: Split players into available/unavailable
    // Captain can pick from ALL players who are in attendance (regardless of previous performance)
    const available = players.filter(p => {
      // Find this player's attendance record
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      // Player is available if their record says available = true
      return attendanceRecord?.available === true;
    });

    const unavailable = players.filter(p => {
      // Find this player's attendance record
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      // Player is unavailable if:
      // - No attendance record exists, OR
      // - Attendance record has available = false
      return !attendanceRecord || attendanceRecord.available === false;
    });

    // STEP 4: No auto-selection - captain picks from all attendees
    const autoSelected: Player[] = [];

    // STEP 5: Create TeamSelection object
    const selection: TeamSelection = {
      week_number: weekNumber,
      selected_players: autoSelected,        // Start with auto-selected (currently empty)
      available_players: available,          // Players who can be picked
      unavailable_players: unavailable,      // Players who can't be picked
      auto_selected: autoSelected,           // Players auto-picked by system
      captain_picks: []                      // Players manually picked by captain
    };

    // STEP 6: Update reactive store
    currentSelection.set(selection);

    return selection;
  }
};
