<script lang="ts">
  import { onMount } from 'svelte';
  
  let loading = true;
  let currentWeek = 1;
  let attendance = new Map();
  let hasChanges = false;
  
  let players = [
    { id: '1', name: 'Tracey', win_percentage: 75, drop_week: null },
    { id: '2', name: 'Jordan', win_percentage: 68, drop_week: null },
    { id: '3', name: 'Taffy', win_percentage: 82, drop_week: null },
    { id: '4', name: 'Ross', win_percentage: 71, drop_week: null },
    { id: '5', name: 'Layton', win_percentage: 65, drop_week: null }
  ];
  
  onMount(() => {
    players.forEach(player => {
      attendance.set(player.id, true);
    });
    attendance = attendance;
    loading = false;
  });
  
  function toggleAttendance(playerId) {
    const current = attendance.get(playerId) || false;
    attendance.set(playerId, !current);
    attendance = attendance;
    hasChanges = true;
  }
  
  async function saveAttendance() {
    loading = true;
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    hasChanges = false;
    loading = false;
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
          disabled={loading}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg 
                 font-medium min-h-[44px] disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      {/if}
    </div>
  </header>

  <main class="px-4 py-6">
    <!-- Summary -->
    <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h2>
      
      {#if players.length > 0}
        {@const attendingCount = Array.from(attendance.values()).filter(Boolean).length}
        {@const totalPlayers = players.length}
        
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
      {/if}
    </div>
    
    <!-- Player List -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-gray-900">Mark Attendance</h2>
      
      {#each players as player}
        {@const isAttending = attendance.get(player.id) || false}
        {@const isDropped = player.drop_week === currentWeek}
        
        <div class="bg-white rounded-lg shadow-lg p-4">
          <button
            class="w-full flex items-center justify-between min-h-[60px]"
            on:click={() => !isDropped && toggleAttendance(player.id)}
            disabled={isDropped}
          >
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-blue-600 font-semibold">
                  {player.name.charAt(0)}
                </span>
              </div>
              <div class="text-left">
                <h3 class="font-medium text-gray-900">{player.name}</h3>
                <p class="text-sm text-gray-500">
                  {isDropped ? 'Must sit out' : `${player.win_percentage}% win rate`}
                </p>
              </div>
            </div>
            
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
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer 
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
