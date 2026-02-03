<!--
  ============================================================================
  ATTENDANCE PAGE — Players Mark Their Own Availability
  ============================================================================

  PURPOSE:
  The page where individual players say "I can play this week" or "I can't."
  Simple toggle per player, with a single "Save Changes" button that persists
  everything at once.

  URL: /attendance

  WHO USES THIS:
  Regular players (not just the captain). Each player comes here before match
  day to mark whether they're available. The captain then sees this data
  in the team selection pages.

  HOW THIS DIFFERS FROM /team (captain dashboard):
  - /team has its own attendance toggle that updates local state and saves
    via DashboardService
  - THIS PAGE uses direct Supabase queries and a delete-then-insert strategy
  - Both ultimately write to the same 'attendance' table

  KEY PATTERNS IN THIS FILE:

  1. MAP-BASED STATE:
     Attendance is stored in a Map<string, boolean> (player_id → available).
     Maps are efficient for key-based lookups. The UI reads from this Map
     to show each player's current status.

  2. DEFERRED SAVE:
     Toggles only update local state. The "Save Changes" button only appears
     when hasChanges is true. This batches all changes into a single DB write.

  3. DELETE-THEN-INSERT SAVE STRATEGY:
     See saveAttendance() for full details. Known issue: this overwrites
     the captain's team selection (selected = false on all re-inserted records).

  ⚠️ KNOWN BUGS (documented in ATTENDANCE_ISSUES_ANALYSIS.md):
  - saveAttendance resets selected = false, wiping captain's picks
  - No unique constraint on (player_id, week_number) means duplicates possible
  - league_year hardcoded as '2025/26' — will break next season
  - No transaction wrapping — delete and insert are not atomic
-->

<script lang="ts">
  /**
   * ATTENDANCE PAGE - Mark player availability for the current week
   *
   * PURPOSE:
   * - Allows players to mark themselves as available or unavailable for matches
   * - Stores attendance records in the 'attendance' table
   * - Used by team selection to determine who can play
   *
   * DATABASE TABLES USED:
   * - players: Read all active players
   * - attendance: Read/write attendance records
   *
   * ATTENDANCE TABLE SCHEMA:
   * - id: uuid (primary key)
   * - player_id: uuid (foreign key to players.id)
   * - league_year: varchar (e.g., '2025/26')
   * - week_number: integer (e.g., 1, 2, 3...)
   * - available: boolean (true = can play, false = unavailable)
   * - selected: boolean (true = chosen for team by captain)
   * - created_at: timestamp
   *
   * NOTE: There is NO unique constraint on (player_id, week_number, league_year)
   * This means duplicates are possible if we're not careful!
   */

  import { onMount } from 'svelte';
  import { supabase } from '$lib/database/supabase';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Player } from '$lib/database/types';

  // ==========================================================================
  // STATE
  // ==========================================================================

  // All active players from the database. Rendered as a list in the UI.
  let players: Player[] = [];

  // MAP-BASED ATTENDANCE STATE:
  // Key = player_id (string UUID), Value = available (boolean)
  //
  // WHY A MAP AND NOT AN ARRAY?
  // We need to look up each player's availability by ID frequently
  // (every time a card renders). Map.get(id) is O(1) vs array.find() which is O(n).
  // For ~15 players the difference is negligible, but it's cleaner code.
  //
  // SVELTE REACTIVITY NOTE:
  // Maps don't trigger Svelte reactivity on .set() alone.
  // We reassign `attendance = attendance` after mutations to force updates.
  let attendance = new Map<string, boolean>();

  // Which week we're marking attendance for. Determined from fixtures.
  let currentWeek = 1;

  // UI state flags
  let loading = true;       // Initial data load in progress
  let saving = false;       // Save operation in progress (shows spinner on button)
  let hasChanges = false;   // User has toggled at least one player → show Save button
  let error = '';           // Error message string (empty = no error)

  // DashboardService: used to get the current week number
  const dashboardService = new DashboardService();

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  onMount(() => {
    loadData();
  });

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  /**
   * LOAD DATA — Fetch players and their attendance for the current week
   *
   * LOADING SEQUENCE (must be in this order):
   *   1. Connection test — fail fast if DB is unreachable
   *   2. Get current week — needed for the attendance query
   *   3. Load players — the list we'll render
   *   4. Load attendance — existing marks for this week
   *   5. Build the Map — merge players + attendance into one lookup structure
   *
   * WHY A CONNECTION TEST FIRST?
   * Supabase queries can fail silently or with cryptic errors if the connection
   * is down. A quick SELECT count gives a clear "connection failed" message
   * before we attempt the real queries.
   *
   * DEFAULT VALUE LOGIC:
   * If a player has no attendance record for this week, they default to
   * available = true. This is a UX choice: it's easier to mark yourself
   * unavailable than to have to actively opt in every week.
   */
  async function loadData() {
    try {
      loading = true;
      error = '';

      // STEP 1: Quick connection test — SELECT count FROM players LIMIT 1
      const { error: connectionError } = await supabase
        .from('players')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw new Error('Database connection failed: ' + connectionError.message);
      }

      // STEP 2: Determine current week from fixtures table
      // getCurrentWeek() finds the next unplayed fixture's week number
      currentWeek = await dashboardService.getCurrentWeek();

      // STEP 3: Load all active players (active = true), alphabetically
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('name');

      if (playersError) {
        throw new Error('Failed to load players: ' + playersError.message);
      }

      players = playersData || [];

      // STEP 4: Load existing attendance records for this week
      //
      // ⚠️ HARDCODED league_year: '2025/26'
      // This will need updating each season. Should be a constant or
      // derived from the current fixture. See ATTENDANCE_ISSUES_ANALYSIS.md.
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('player_id, available')
        .eq('week_number', currentWeek)
        .eq('league_year', '2025/26');

      // PGRST116 = "no rows returned" — fine, means nobody has marked yet
      if (attendanceError && attendanceError.code !== 'PGRST116') {
        throw new Error('Failed to load attendance: ' + attendanceError.message);
      }

      // STEP 5: Build the attendance Map
      // For each player: use existing record if found, otherwise default to true
      attendance = new Map();
      players.forEach(player => {
        const existingRecord = attendanceData?.find(a => a.player_id === player.id);
        // ?? true: if no record exists, default to available
        attendance.set(player.id, existingRecord?.available ?? true);
      });

      // Reassign to trigger Svelte reactivity (Map mutations don't auto-trigger)
      attendance = attendance;

    } catch (err: any) {
      console.error('Load data error:', err);
      error = err.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * TOGGLE ATTENDANCE — Flip one player's available flag
   *
   * CALLED BY: Clicking the Available/Unavailable button next to a player
   *
   * LOCAL ONLY — does not touch the database. Changes are batched and
   * saved when the user clicks "Save Changes".
   *
   * REACTIVITY: Map.set() doesn't trigger Svelte updates, so we
   * reassign the variable (`attendance = attendance`) to force a re-render.
   */
  function toggleAttendance(playerId: string) {
    const current = attendance.get(playerId) ?? true;  // Default true if missing
    attendance.set(playerId, !current);                 // Flip the value
    attendance = attendance;                            // Force Svelte reactivity
    hasChanges = true;                                  // Reveal the Save button
  }

  /**
   * SAVE ATTENDANCE — Persist all changes to the database
   *
   * CALLED BY: "Save Changes" button (only visible when hasChanges is true)
   *
   * ⚠️ DELETE-THEN-INSERT PATTERN:
   * Because there's no unique constraint on (player_id, week_number),
   * we can't use Supabase's .upsert(). Instead:
   *   1. DELETE all records for this week + league_year
   *   2. INSERT fresh records for every player with current Map values
   *
   * WHY NOT UPSERT?
   * Supabase's .upsert({ onConflict: 'player_id,week_number' }) requires a
   * unique constraint on those columns. The attendance table doesn't have one.
   * Adding the constraint would be the proper fix (see issues analysis).
   *
   * ⚠️ CRITICAL BUG — OVERWRITES TEAM SELECTION:
   * The INSERT sets selected = false for ALL records. If the captain has
   * already picked the team (selected = true for 7 players), saving
   * attendance here WIPES that selection. This is a known issue.
   *
   * ⚠️ NOT ATOMIC:
   * The delete and insert are separate queries with no transaction.
   * If the insert fails after the delete succeeds, all attendance data
   * for the week is lost. A proper fix would wrap both in a transaction.
   */
  async function saveAttendance() {
    try {
      saving = true;
      error = '';

      // STEP 1: Wipe existing records for this week
      // ⚠️ This also deletes any selected = true records!
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('week_number', currentWeek)
        .eq('league_year', '2025/26');

      if (deleteError) {
        throw new Error('Failed to clear existing attendance: ' + deleteError.message);
      }

      // STEP 2: Build fresh records from the current Map state
      const records = players.map(player => ({
        player_id: player.id,
        week_number: currentWeek,
        league_year: '2025/26',                         // ⚠️ Hardcoded season
        available: attendance.get(player.id) ?? true,   // Current toggle state
        selected: false                                 // ⚠️ Always false — wipes captain's picks!
      }));

      // STEP 3: Bulk insert all records in one query
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(records);

      if (insertError) {
        throw new Error('Failed to save attendance: ' + insertError.message);
      }

      // Success — hide the Save button
      hasChanges = false;

    } catch (err: any) {
      console.error('Save attendance error:', err);
      error = err.message || 'Failed to save attendance';
    } finally {
      saving = false;
    }
  }
</script>

<!-- ========================================================================
     PAGE TITLE
     ======================================================================== -->
<svelte:head>
  <title>Attendance - Week {currentWeek}</title>
</svelte:head>

<!--
  UI STRUCTURE:
  1. HEADER — Week number + conditional "Save Changes" button
  2. ERROR BANNER — Red box if error is set
  3. LOADING STATE — Inline spinner (not the LoadingSpinner component)
  4. EMPTY STATE — Message if no active players in DB
  5. PLAYER LIST — Each player as a row with name, stats, and toggle button
-->

<div class="min-h-screen bg-gray-50">

  <!-- HEADER -->
  <!-- "Save Changes" button only appears when hasChanges is true.
       The saving spinner inside the button gives feedback during the DB write. -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900">Attendance</h1>
        <p class="text-sm text-gray-500">Week {currentWeek}</p>
      </div>

      <!-- Conditional Save button: only shows after a toggle has been made -->
      {#if hasChanges}
        <button
          on:click={saveAttendance}
          disabled={saving}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg
                 font-medium transition-colors min-h-[44px] flex items-center"
        >
          <!-- Inline spinner while saving (replaces the button text visually) -->
          {#if saving}
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          {/if}
          Save Changes
        </button>
      {/if}
    </div>
  </header>

  <main class="p-4">
    <!-- ERROR BANNER — only shown if error string is non-empty -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex items-center">
          <div class="text-red-500 mr-2">⚠️</div>
          <div>
            <p class="text-red-800 font-medium">Error</p>
            <p class="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- LOADING STATE — inline spinner (this page doesn't use LoadingSpinner component) -->
    {#if loading}
      <div class="flex justify-center items-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-2 text-gray-600">Loading attendance data...</span>
      </div>

    <!-- EMPTY STATE — no active players at all -->
    {:else if players.length === 0}
      <div class="text-center p-8">
        <div class="text-gray-400 text-4xl mb-4">👥</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Players Found</h3>
        <p class="text-gray-600">No active players found in the database.</p>
      </div>

    <!-- MAIN PLAYER LIST -->
    {:else}
      <div class="bg-white rounded-lg shadow">
        <!-- Section header inside the card -->
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Player Availability</h2>
          <p class="text-sm text-gray-600">Mark players as available or unavailable for this week</p>
        </div>

        <!-- Player rows — each separated by a horizontal line -->
        <!-- (player.id) in {#each} is a keyed block: Svelte uses the ID to
             efficiently update DOM when the list changes, rather than
             re-rendering every row from scratch -->
        <div class="divide-y divide-gray-200">
          {#each players as player (player.id)}
            <!-- Compute this player's current availability from the Map -->
            {@const isAvailable = attendance.get(player.id) ?? true}

            <div class="flex items-center justify-between p-4 hover:bg-gray-50">
              <!-- LEFT: Avatar + name + stats -->
              <div class="flex items-center">
                <!-- Avatar: first letter in a blue circle -->
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-sm font-medium text-blue-600">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">{player.name}</div>
                  <!-- Win rate and games as context — helps captain see who's worth picking -->
                  <div class="text-xs text-gray-500">
                    Win Rate: {player.win_percentage}% | Games: {player.games_played}
                  </div>
                </div>
              </div>

              <!-- RIGHT: Toggle button — green "Available" or red "Unavailable" -->
              <!-- Clicking flips the state in the Map (local only until Save) -->
              <button
                on:click={() => toggleAttendance(player.id)}
                class="flex items-center space-x-2 px-3 py-2 rounded-md transition-colors min-h-[44px]
                       {isAvailable
                         ? 'bg-green-100 text-green-800 hover:bg-green-200'
                         : 'bg-red-100 text-red-800 hover:bg-red-200'}"
              >
                <span class="text-lg">
                  {isAvailable ? '✅' : '❌'}
                </span>
                <span class="text-sm font-medium">
                  {isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </main>
</div>
