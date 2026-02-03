/**
 * ============================================================================
 * TEAM MANAGEMENT STORE - Reactive State for Team Selection
 * ============================================================================
 *
 * PURPOSE:
 * Manages the state and logic for weekly team selection. The captain uses
 * this to see who's available and pick 7 players for the fixture.
 *
 * HOW IT FITS IN THE TEAM SELECTION WORKFLOW:
 *
 *   1. Week starts → attendance records initialized (attendance.ts)
 *   2. Players mark availability → AttendanceService.markAvailability()
 *   3. Captain opens team selection page
 *   4. THIS STORE loads players + attendance, splits into categories  ← HERE
 *   5. Captain picks 7 players → saved via AttendanceService.selectPlayer()
 *
 * ARCHITECTURE:
 * - Four Svelte writable stores hold the reactive state
 * - One teamStore object contains async methods that load/transform data
 * - Components subscribe to the stores and auto-update when data changes
 *
 * DATA FLOW:
 *   DashboardService (fetches from DB)
 *       ↓
 *   teamStore.generateTeamSelection() (transforms + categorises)
 *       ↓
 *   currentSelection store (reactive — UI updates automatically)
 *       ↓
 *   /team-selection/[week]/+page.svelte (renders the UI)
 *
 * DEPENDENCY: DashboardService
 * This store uses DashboardService (not AttendanceService directly) for
 * loading data. DashboardService aggregates queries from multiple tables
 * and is the preferred data source for pages that need combined views.
 */

import { writable } from 'svelte/store';
import { DashboardService } from '$lib/services/dashboardService';
import type { Player, AttendanceRecord, TeamSelection } from '$lib/types/dashboard';

/**
 * DashboardService instance — used to fetch players and attendance.
 * Created once at module load. All methods on this store share it.
 */
const dashboardService = new DashboardService();

// ==========================================================================
// REACTIVE STORES — Svelte state that components subscribe to
// ==========================================================================
//
// SVELTE STORES CRASH COURSE:
// - writable<T>(initialValue) creates a reactive container
// - Components subscribe with: $storeName (auto-subscribes in templates)
// - When .set() or .update() is called, ALL subscribed components re-render
// - This is how the team selection page stays in sync with the data

/**
 * ALL PLAYERS — Every player in the squad, regardless of availability.
 *
 * Used to show the full roster. The team selection page renders this
 * list and marks each player as available/unavailable based on their
 * attendance record.
 *
 * TYPE: Player[] from database/types — includes id, name, email, etc.
 */
export const allPlayers = writable<Player[]>([]);

/**
 * WEEKLY ATTENDANCE — Raw attendance records for the selected week.
 *
 * Each record has: { player_id, week_number, available, selected, player? }
 * The player? field is populated by a JOIN when loaded via DashboardService.
 *
 * This store is the raw data. currentSelection is the processed/categorised
 * version that the UI actually uses.
 */
export const weeklyAttendance = writable<AttendanceRecord[]>([]);

/**
 * CURRENT SELECTION — The main state the UI reads from.
 *
 * Contains players split into meaningful categories:
 * {
 *   week_number: 4,
 *   available_players:   [Alice, Bob, Carol],     // Can be picked
 *   unavailable_players: [Dave, Eve],             // Can't be picked
 *   selected_players:    [Alice, Bob],            // Currently on the team
 *   auto_selected:       [],                      // System-picked (unused currently)
 *   captain_picks:       []                       // Manually picked by captain
 * }
 *
 * Starts as null until generateTeamSelection() runs.
 */
export const currentSelection = writable<TeamSelection | null>(null);

/**
 * SELECTION WEEK — Which week number we're currently selecting for.
 *
 * Set by the URL parameter in /team-selection/[week]/+page.svelte.
 * Defaults to 1 but is updated when the page loads.
 */
export const selectionWeek = writable<number>(1);

// ==========================================================================
// TEAM STORE — Methods for loading and processing team data
// ==========================================================================

/**
 * TEAM STORE OBJECT
 *
 * Contains the async methods that the team selection page calls.
 * These methods fetch data and update the reactive stores above.
 *
 * It's a plain object (not a class) because it doesn't need instances —
 * there's only ever one team selection happening at a time.
 */
export const teamStore = {

  /**
   * LOAD PLAYERS — Fetch all players from the database
   *
   * CALLED BY: Team selection page on mount (onMount lifecycle)
   *
   * FLOW:
   *   1. DashboardService.getAllPlayers() queries: SELECT * FROM players ORDER BY name
   *   2. Result stored in allPlayers writable store
   *   3. Any component subscribed to $allPlayers automatically re-renders
   *
   * NOTE: This is a simple fetch-and-store. The heavy lifting (filtering
   * by availability) happens in generateTeamSelection().
   */
  async loadPlayers() {
    const players = await dashboardService.getAllPlayers();
    allPlayers.set(players);
  },

  /**
   * LOAD ATTENDANCE — Fetch attendance records for a specific week
   *
   * CALLED BY: Team selection page when the week changes
   *
   * PARAMETERS:
   * - weekNumber: Which week to load (e.g., 1, 2, 3... up to ~26 in a season)
   *
   * FLOW:
   *   1. DashboardService.getWeeklyAttendance(weekNumber) queries the attendance
   *      table filtered by week_number, joined with player details
   *   2. Result stored in weeklyAttendance store
   *
   * NOTE: Previously this query also filtered by league_year, but that
   * caused issues and was removed from dashboardService.ts
   */
  async loadAttendance(weekNumber: number) {
    const attendance = await dashboardService.getWeeklyAttendance(weekNumber);
    weeklyAttendance.set(attendance);
  },

  /**
   * GENERATE TEAM SELECTION — The core method. Categorises all players.
   *
   * CALLED BY: Team selection page after players and attendance are loaded
   *
   * PURPOSE:
   * Takes the raw list of players and their attendance records, then
   * splits them into a TeamSelection object the UI can render directly.
   *
   * STEP-BY-STEP:
   *   1. Load ALL players (full squad)
   *   2. Load attendance records for this week
   *   3. For each player, check their attendance record:
   *        - Record exists AND available = true  → available_players[]
   *        - No record OR available = false      → unavailable_players[]
   *   4. Wrap everything into a TeamSelection object
   *   5. Push to currentSelection store (UI updates)
   *
   * CONCRETE EXAMPLE:
   *   Squad of 5 players, week 3:
   *
   *   Players:    [Alice, Bob, Carol, Dave, Eve]
   *   Attendance: [
   *     { player_id: alice, available: true  },
   *     { player_id: bob,   available: true  },
   *     { player_id: carol, available: false },
   *     // Dave has NO record (never marked availability)
   *     // Eve has NO record
   *   ]
   *
   *   Result:
   *     available_players:   [Alice, Bob]          ← captain can pick these
   *     unavailable_players: [Carol, Dave, Eve]    ← cannot be picked
   *
   * AUTO-SELECTION:
   * The auto_selected array is currently always empty. In the future this
   * could auto-select players based on rules (e.g., previous week's winners
   * get priority). The structure is in place but the logic isn't implemented.
   *
   * PARAMETERS:
   * - weekNumber: Week to generate selection for
   *
   * RETURNS: The TeamSelection object (also stored in currentSelection)
   */
  async generateTeamSelection(weekNumber: number): Promise<TeamSelection> {
    // STEP 1: Load all players from database
    const players = await dashboardService.getAllPlayers();

    // STEP 2: Load attendance for this week
    const attendance = await dashboardService.getWeeklyAttendance(weekNumber);

    // STEP 3: Split players into available / unavailable
    //
    // .filter() creates a new array containing only elements that pass the test.
    // For each player, we look up their attendance record and check the flag.

    const available = players.filter(p => {
      // Find this player's attendance record for this week
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      // Available only if record exists AND explicitly set to true
      return attendanceRecord?.available === true;
    });

    const unavailable = players.filter(p => {
      const attendanceRecord = attendance.find(a => a.player_id === p.id);
      // Unavailable if: no record at all, OR record says available = false
      // The ?. (optional chaining) handles the "no record" case gracefully
      return !attendanceRecord || attendanceRecord.available === false;
    });

    // STEP 4: Auto-selection placeholder (not yet implemented)
    const autoSelected: Player[] = [];

    // STEP 5: Assemble the TeamSelection object
    const selection: TeamSelection = {
      week_number: weekNumber,
      selected_players: autoSelected,        // Starts empty — captain picks manually
      available_players: available,          // Pool the captain picks FROM
      unavailable_players: unavailable,      // Shown greyed out in the UI
      auto_selected: autoSelected,           // System picks (future feature)
      captain_picks: []                      // Tracks what captain manually chose
    };

    // STEP 6: Update the reactive store — all subscribed components re-render
    currentSelection.set(selection);

    return selection;
  }
};
