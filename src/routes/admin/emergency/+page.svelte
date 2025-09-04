<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Player, Fixture } from '$lib/database/types';
  
  const dashboardService = new DashboardService();
  
  let players: Player[] = [];
  let loading = true;
  let error = '';
  let saving = false;
  
  // Emergency entry form data
  let weekNumber = 1;
  let opposingTeam = '';
  let selectedPlayerId = '';
  let gameType: 'league' | 'practice' = 'league';
  let venue: 'home' | 'away' = 'home';
  let matchDate = new Date().toISOString().split('T')[0];
  
  onMount(async () => {
    await loadData();
  });
  
  async function loadData() {
    try {
      loading = true;
      error = '';
      
      players = await dashboardService.getAllPlayers();
      
    } catch (err: any) {
      error = err.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  }
  
  async function createEmergencyEntry() {
    if (!opposingTeam.trim() || !selectedPlayerId) {
      error = 'Please fill in all required fields';
      return;
    }
    
    try {
      saving = true;
      error = '';
      
      // Create emergency fixture if league game
      if (gameType === 'league') {
        const fixtureData = {
          week_number: weekNumber,
          opposition: opposingTeam.trim(),
          venue: venue,
          match_date: matchDate,
          result: 'to_play',
          our_score: 0,
          opposition_score: 0,
          league_year: '2025/26',
          status: 'to_play'
        };
        
        const { data: fixture, error: fixtureError } = await dashboardService.supabase
          .from('fixtures')
          .insert(fixtureData)
          .select('id')
          .single();
        
        if (fixtureError) throw fixtureError;
        
        // Navigate to match management with the created fixture
        goto(`/match/${fixture.id}`);
      } else {
        // Navigate to practice scoring
        goto(`/scoring/emergency?player=${selectedPlayerId}&opponent=${encodeURIComponent(opposingTeam)}&type=${gameType}`);
      }
      
    } catch (err: any) {
      error = err.message || 'Failed to create emergency entry';
      saving = false;
    }
  }
  
  function resetForm() {
    weekNumber = 1;
    opposingTeam = '';
    selectedPlayerId = '';
    gameType = 'league';
    venue = 'home';
    matchDate = new Date().toISOString().split('T')[0];
    error = '';
  }
</script>

<svelte:head>
  <title>Emergency Entry - Admin Panel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Emergency Entry System</h1>
      <p class="text-gray-600 mt-1">Create emergency fixtures and games when things go wrong</p>
    </div>
    
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        {error}
      </div>
    {/if}
    
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-3 text-gray-600">Loading data...</span>
      </div>
    {:else}
      <!-- Emergency Entry Form -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Create Emergency Entry</h2>
        
        <div class="space-y-4">
          <!-- Game Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Game Type
            </label>
            <div class="flex space-x-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  bind:group={gameType}
                  value="league"
                  class="mr-2"
                />
                League Match
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  bind:group={gameType}
                  value="practice"
                  class="mr-2"
                />
                Practice Game
              </label>
            </div>
          </div>
          
          {#if gameType === 'league'}
            <!-- Week Number (League only) -->
            <div>
              <label for="week" class="block text-sm font-medium text-gray-700 mb-2">
                Week Number
              </label>
              <input
                id="week"
                type="number"
                bind:value={weekNumber}
                min="1"
                max="20"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <!-- Venue (League only) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Venue
              </label>
              <div class="flex space-x-4">
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={venue}
                    value="home"
                    class="mr-2"
                  />
                  Home
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={venue}
                    value="away"
                    class="mr-2"
                  />
                  Away
                </label>
              </div>
            </div>
            
            <!-- Match Date (League only) -->
            <div>
              <label for="date" class="block text-sm font-medium text-gray-700 mb-2">
                Match Date
              </label>
              <input
                id="date"
                type="date"
                bind:value={matchDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          {/if}
          
          <!-- Opposing Team -->
          <div>
            <label for="opponent" class="block text-sm font-medium text-gray-700 mb-2">
              Opposing Team/Player
            </label>
            <input
              id="opponent"
              type="text"
              bind:value={opposingTeam}
              placeholder="Enter opposing team or player name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <!-- Player Selection -->
          <div>
            <label for="player" class="block text-sm font-medium text-gray-700 mb-2">
              Select Player
            </label>
            <select
              id="player"
              bind:value={selectedPlayerId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a player...</option>
              {#each players as player}
                <option value={player.id}>{player.name}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 mt-6">
          <button
            on:click={resetForm}
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Reset Form
          </button>
          <button
            on:click={createEmergencyEntry}
            disabled={saving || !opposingTeam.trim() || !selectedPlayerId}
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : gameType === 'league' ? 'Create Match' : 'Start Practice'}
          </button>
        </div>
      </div>
      
      <!-- Historical Game Viewer/Editor -->
      <div class="bg-white rounded-lg shadow p-6 mt-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Historical Game Editor</h2>
        <p class="text-gray-600 mb-4">
          View and edit dart-by-dart history from previous games stored in the dart_tracking table.
        </p>
        
        <button
          on:click={() => goto('/admin/emergency/history')}
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Game History
        </button>
      </div>
    {/if}
  </div>
</div>