// src/routes/attendance/+page.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { teamStore, allPlayers, weeklyAttendance } from '$lib/stores/teamManagement';
  import { dashboardService } from '$lib/services/dashboardService';
  import type { Player, AttendanceRecord } from '$lib/types/dashboard';
  
  let currentWeek: number = 1;
  let loading = true;
  let error: string | null = null;
  let attendance: Map<string, boolean> = new Map();
  let hasChanges = false;
  
  onMount(async () => {
    try {
      // Get current week from fixtures or default to 1
      currentWeek = await dashboardService.getCurrentWeek();
      await loadAttendanceData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load attendance';
    } finally {
      loading = false;
    }
  });
  
  async function loadAttendanceData() {
    await teamStore.loadPlayers();
    await teamStore.loadAttendance(currentWeek);
    
    // Initialize attendance map
    attendance.clear();
    $weeklyAttendance.forEach(record => {
      attendance.set(record.player_id, record.attended);
    });
    
    // Set default attendance for players without records
    $allPlayers.forEach(player => {
      if (!attendance.has(player.id)) {
        attendance.set(player.id, true); // Default to attending
      }
    });
    
    attendance = attendance; // Trigger reactivity
  }
  
  function toggleAttendance(playerId: string) {
    const current = attendance.get(playerId) || false;
    attendance.set(playerId, !current);
    attendance = attendance; // Trigger reactivity
    hasChanges = true;
  }
  
  async function saveAttendance() {
    loading = true;
    error = null;
    
    try {
      const records: Partial<AttendanceRecord>[] = Array.from(attendance.entries()).map(([playerId, attended]) => ({
        player_id: playerId,
        week_number: currentWeek,
        league_year: '2025/26',
        attended
      }));
      
      await dashboardService.saveAttendance(records);
      hasChanges = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save attendance';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Attendance - Week {currentWeek}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Attendance</h1>
        <p class="text-sm text-gray-500">Week {currentWeek}</p>
      </div>
      
      {#if hasChanges}
        <button
          on:click={saveAttendance}
          disabled={loading}
          class="btn-primary px-4 py-2 text-sm font-medium rounded-lg min-h-[44px] 
                 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      {/if}
    </div>
  </header>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
      </div>
    {/if}
    
    <!-- Attendance summary -->
    <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h2>
      
      {#if $allPlayers.length > 0}
        {@const attendingCount = Array.from(attendance.values()).filter(Boolean).length}
        {@const totalPlayers = $allPlayers.length}
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600">{attendingCount}</p>
            <p class="text-sm text-gray-500">Attending</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-red-600">{totalPlayers - attendingCount}</p>
            <p class="text-sm text-gray-500">Unavailable</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-600">{totalPlayers}</p>
            <p class="text-sm text-gray-500">Total Players</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-600">7</p>
            <p class="text-sm text-gray-500">Team Size</p>
          </div>
        </div>
      {:else}
        <div class="text-center py-4">
          <p class="text-gray-500">Loading attendance data...</p>
        </div>
      {/if}
    </div>
    
    <!-- Player attendance list -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-gray-900">Mark Attendance</h2>
      
      {#each $allPlayers as player}
        {@const isAttending = attendance.get(player.id) || false}
        {@const isDropped = player.drop_week === currentWeek}
        
        <div class="bg-white rounded-lg shadow-lg p-4 {isDropped ? 'opacity-60' : ''}">
          <button
            class="w-full flex items-center justify-between touch-manipulation min-h-[60px]"
            on:click={() => !isDropped && toggleAttendance(player.id)}
            disabled={isDropped}
          >
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-blue-600 font-semibold">
                  {player.name.charAt(0)}
                </span>
              </div>
              <div class="text-left">
                <h3 class="font-medium text-gray-900">{player.name}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{player.win_percentage}% win rate</span>
                  {#if isDropped}
                    <span class="text-red-500 font-medium">Must sit out</span>
                  {:else if player.consecutive_losses > 0}
                    <span class="text-orange-500">{player.consecutive_losses} losses</span>
                  {/if}
                </div>
              </div>
            </div>
            
            <!-- Attendance toggle -->
            <div class="flex items-center space-x-3">
              {#if isDropped}
                <span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  Dropped
                </span>
              {:else}
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    checked={isAttending}
                    on:change={() => toggleAttendance(player.id)}
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer 
                              peer-checked:after:translate-x-full peer-checked:after:border-white 
                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                              after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                              peer-checked:bg-green-600"></div>
                </label>
                <span class="text-sm font-medium {isAttending ? 'text-green-600' : 'text-gray-500'}">
                  {isAttending ? 'Available' : 'Unavailable'}
                </span>
              {/if}
            </div>
          </button>
        </div>
      {/each}
    </div>
  </main>
</div>
