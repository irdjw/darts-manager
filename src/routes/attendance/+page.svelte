<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/database/supabase';
  import { DashboardService } from '$lib/services/dashboardService'; // Fixed import path
  import type { Player } from '$lib/database/types';

  let players: Player[] = [];
  let attendance = new Map<string, boolean>();
  let currentWeek = 1;
  let loading = true;
  let saving = false;
  let hasChanges = false;
  let error = '';

  const dashboardService = new DashboardService();

  onMount(() => {
    loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = '';

      // Test Supabase connection
      const { error: connectionError } = await supabase
        .from('players')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw new Error('Database connection failed: ' + connectionError.message);
      }

      // Get current week
      currentWeek = await dashboardService.getCurrentWeek();

      // Load all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('name');

      if (playersError) {
        throw new Error('Failed to load players: ' + playersError.message);
      }

      players = playersData || [];

      // Load existing attendance for current week
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('player_id, available')
        .eq('week_number', currentWeek)
        .eq('league_year', '2025/26');

      if (attendanceError && attendanceError.code !== 'PGRST116') {
        throw new Error('Failed to load attendance: ' + attendanceError.message);
      }

      // Initialize attendance map
      attendance = new Map();
      players.forEach(player => {
        const existingRecord = attendanceData?.find(a => a.player_id === player.id);
        attendance.set(player.id, existingRecord?.available ?? true);
      });

      attendance = attendance; // Trigger reactivity

    } catch (err: any) {
      console.error('Load data error:', err);
      error = err.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  function toggleAttendance(playerId: string) {
    const current = attendance.get(playerId) ?? true;
    attendance.set(playerId, !current);
    attendance = attendance;
    hasChanges = true;
  }

  async function saveAttendance() {
    try {
      saving = true;
      error = '';

      // Prepare attendance records
      const records = players.map(player => ({
        player_id: player.id,
        week_number: currentWeek,
        league_year: '2025/26',
        available: attendance.get(player.id) ?? true,
        created_at: new Date().toISOString()
      }));

      // Save to database
      const { error: saveError } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'player_id,week_number,league_year'
        });

      if (saveError) {
        throw new Error('Failed to save attendance: ' + saveError.message);
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