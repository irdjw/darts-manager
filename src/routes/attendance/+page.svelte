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

  // STATE MANAGEMENT
  let players: Player[] = [];                    // All active players from database
  let attendance = new Map<string, boolean>();   // Key: player_id, Value: available (true/false)
  let currentWeek = 1;                           // Current week number from fixtures
  let loading = true;                            // Loading state for initial data fetch
  let saving = false;                            // Saving state when user clicks "Save Changes"
  let hasChanges = false;                        // Tracks if user has toggled any attendance
  let error = '';                                // Error message to display to user

  const dashboardService = new DashboardService();

  onMount(() => {
    loadData();
  });

  /**
   * LOAD DATA FUNCTION
   *
   * CALLED: On page mount
   *
   * STEPS:
   * 1. Test database connection by querying players table
   * 2. Get current week number from dashboardService
   * 3. Load all active players from 'players' table
   * 4. Load existing attendance records for current week
   * 5. Initialize attendance Map with existing data or default to 'true' (available)
   *
   * QUERIES:
   * - SELECT count FROM players LIMIT 1 (connection test)
   * - SELECT * FROM players WHERE active = true ORDER BY name
   * - SELECT player_id, available FROM attendance WHERE week_number = X AND league_year = '2025/26'
   *
   * ISSUE: The attendance query filters by league_year, but we previously identified
   * this column might not be indexed or might not exist in all environments
   */
  async function loadData() {
    try {
      loading = true;
      error = '';

      // STEP 1: Test Supabase connection
      // This ensures we can connect before trying to load real data
      const { error: connectionError } = await supabase
        .from('players')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw new Error('Database connection failed: ' + connectionError.message);
      }

      // STEP 2: Get current week number
      // dashboardService.getCurrentWeek() looks at fixtures table to find the next unplayed week
      currentWeek = await dashboardService.getCurrentWeek();

      // STEP 3: Load all active players
      // PLAYERS TABLE QUERY: WHERE active = true
      // Returns: id, name, games_played, win_percentage, etc.
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('name');

      if (playersError) {
        throw new Error('Failed to load players: ' + playersError.message);
      }

      players = playersData || [];

      // STEP 4: Load existing attendance for current week
      // ATTENDANCE TABLE QUERY: WHERE week_number = currentWeek AND league_year = '2025/26'
      // Returns: player_id, available
      //
      // POTENTIAL ISSUE: If league_year doesn't exist or is null in some records,
      // this query might not return all attendance records for the week
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('player_id, available')
        .eq('week_number', currentWeek)
        .eq('league_year', '2025/26');

      // PGRST116 = "No rows returned" - this is OK, means no attendance marked yet
      if (attendanceError && attendanceError.code !== 'PGRST116') {
        throw new Error('Failed to load attendance: ' + attendanceError.message);
      }

      // STEP 5: Initialize attendance Map
      // For each player, check if they have an attendance record
      // If yes, use that value; if no, default to true (available)
      attendance = new Map();
      players.forEach(player => {
        const existingRecord = attendanceData?.find(a => a.player_id === player.id);
        attendance.set(player.id, existingRecord?.available ?? true);
      });

      // Trigger Svelte reactivity
      attendance = attendance;

    } catch (err: any) {
      console.error('Load data error:', err);
      error = err.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  /**
   * TOGGLE ATTENDANCE FUNCTION
   *
   * CALLED: When user clicks on a player's Available/Unavailable button
   *
   * PARAMETERS:
   * - playerId: UUID of the player whose attendance is being toggled
   *
   * LOGIC:
   * 1. Get current value from attendance Map (default to true if not found)
   * 2. Flip the value (!current)
   * 3. Update the Map
   * 4. Mark that changes have been made (shows "Save Changes" button)
   *
   * NOTE: This does NOT save to database yet - just updates local state
   */
  function toggleAttendance(playerId: string) {
    const current = attendance.get(playerId) ?? true;
    attendance.set(playerId, !current);
    attendance = attendance; // Trigger Svelte reactivity
    hasChanges = true;
  }

  /**
   * SAVE ATTENDANCE FUNCTION
   *
   * CALLED: When user clicks "Save Changes" button
   *
   * STRATEGY: Delete-then-Insert
   * We can't use upsert() with onConflict because there's no unique constraint
   * on (player_id, week_number, league_year) in the attendance table.
   *
   * STEPS:
   * 1. Delete all existing attendance records for current week + league year
   * 2. Create new records for all players with current attendance Map values
   * 3. Insert all records in one batch
   *
   * ATTENDANCE RECORDS STRUCTURE:
   * {
   *   player_id: uuid,
   *   week_number: integer,
   *   league_year: varchar ('2025/26'),
   *   available: boolean,
   *   selected: boolean (always false initially - captain sets this later)
   * }
   *
   * POTENTIAL ISSUES:
   * 1. If delete fails but insert succeeds, we could have duplicates
   * 2. If league_year is nullable, the delete might not catch all records
   * 3. No transaction wrapping - not atomic
   * 4. The 'selected' field is initialized to false, which might overwrite
   *    captain's previous team selection
   */
  async function saveAttendance() {
    try {
      saving = true;
      error = '';

      // STEP 1: Delete existing attendance records for this week
      // DELETE FROM attendance WHERE week_number = X AND league_year = '2025/26'
      //
      // CRITICAL ISSUE: This will DELETE records even if they have selected=true!
      // This means if a captain has already selected the team, we're wiping that data!
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('week_number', currentWeek)
        .eq('league_year', '2025/26');

      if (deleteError) {
        throw new Error('Failed to clear existing attendance: ' + deleteError.message);
      }

      // STEP 2: Prepare new attendance records
      // Create one record per player with their current attendance status
      const records = players.map(player => ({
        player_id: player.id,
        week_number: currentWeek,
        league_year: '2025/26',
        available: attendance.get(player.id) ?? true,
        selected: false  // ISSUE: This overwrites captain's team selection!
      }));

      // STEP 3: Insert new records
      // INSERT INTO attendance (player_id, week_number, league_year, available, selected)
      // VALUES (...), (...), ...
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(records);

      if (insertError) {
        throw new Error('Failed to save attendance: ' + insertError.message);
      }

      hasChanges = false;

    } catch (err: any) {
      console.error('Save attendance error:', err);
      error = err.message || 'Failed to save attendance';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Attendance - Week {currentWeek}</title>
</svelte:head>

<!--
  UI STRUCTURE:

  1. HEADER
     - Shows current week number
     - Shows "Save Changes" button if hasChanges is true

  2. ERROR DISPLAY
     - Red alert box if there's an error

  3. LOADING STATE
     - Spinner while loading data

  4. EMPTY STATE
     - Shows if no active players found

  5. PLAYER LIST
     - Shows each player with their:
       * Initial avatar circle
       * Name
       * Win rate and games played
       * Available/Unavailable toggle button
-->

<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900">Attendance</h1>
        <p class="text-sm text-gray-500">Week {currentWeek}</p>
      </div>

      {#if hasChanges}
        <button
          on:click={saveAttendance}
          disabled={saving}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg
                 font-medium transition-colors min-h-[44px] flex items-center"
        >
          {#if saving}
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          {/if}
          Save Changes
        </button>
      {/if}
    </div>
  </header>

  <main class="p-4">
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

    {#if loading}
      <div class="flex justify-center items-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-2 text-gray-600">Loading attendance data...</span>
      </div>
    {:else if players.length === 0}
      <div class="text-center p-8">
        <div class="text-gray-400 text-4xl mb-4">👥</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Players Found</h3>
        <p class="text-gray-600">No active players found in the database.</p>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Player Availability</h2>
          <p class="text-sm text-gray-600">Mark players as available or unavailable for this week</p>
        </div>

        <div class="divide-y divide-gray-200">
          {#each players as player (player.id)}
            {@const isAvailable = attendance.get(player.id) ?? true}
            <div class="flex items-center justify-between p-4 hover:bg-gray-50">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-sm font-medium text-blue-600">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">{player.name}</div>
                  <div class="text-xs text-gray-500">
                    Win Rate: {player.win_percentage}% | Games: {player.games_played}
                  </div>
                </div>
              </div>

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
