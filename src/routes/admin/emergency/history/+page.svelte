<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Fixture, LeagueGame } from '$lib/database/types';
  
  const dashboardService = new DashboardService();
  
  let fixtures: Fixture[] = [];
  let games: LeagueGame[] = [];
  let selectedFixtureId = '';
  let selectedGameId = '';
  let loading = true;
  let error = '';
  
  onMount(async () => {
    await loadFixtures();
  });
  
  async function loadFixtures() {
    try {
      loading = true;
      error = '';
      
      const { data, error: fetchError } = await dashboardService.supabase
        .from('fixtures')
        .select('*')
        .eq('league_year', '2025/26')
        .order('week_number', { ascending: false });
      
      if (fetchError) throw fetchError;
      fixtures = data || [];
      
    } catch (err: any) {
      error = err.message || 'Failed to load fixtures';
    } finally {
      loading = false;
    }
  }
  
  async function loadGamesForFixture(fixtureId: string) {
    try {
      const { data, error: fetchError } = await dashboardService.supabase
        .from('league_games')
        .select(`
          *,
          players:our_player_id (name)
        `)
        .eq('fixture_id', fixtureId)
        .order('game_number', { ascending: true });
      
      if (fetchError) throw fetchError;
      games = data || [];
      
    } catch (err: any) {
      error = err.message || 'Failed to load games';
      games = [];
    }
  }
  
  function handleFixtureChange() {
    selectedGameId = '';
    games = [];
    if (selectedFixtureId) {
      loadGamesForFixture(selectedFixtureId);
    }
  }
  
  function viewGameDarts() {
    if (selectedGameId) {
      goto(`/admin/emergency/history/darts/${selectedGameId}`);
    }
  }
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB');
  }
  
  function getResultDisplay(result: string | null): string {
    switch (result) {
      case 'win': return '✓ Won';
      case 'loss': return '✗ Lost';
      default: return '- Not Played';
    }
  }
  
  function getResultClass(result: string | null): string {
    switch (result) {
      case 'win': return 'text-green-600';
      case 'loss': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }
</script>

<svelte:head>
  <title>Game History - Emergency Entry</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historical Game Editor</h1>
        <p class="text-gray-600 mt-1">View and edit dart-by-dart history from previous games</p>
      </div>
      
      <button
        on:click={() => goto('/admin/emergency')}
        class="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Emergency Entry</span>
      </button>
    </div>
    
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        {error}
      </div>
    {/if}
    
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-3 text-gray-600">Loading fixtures...</span>
      </div>
    {:else}
      <!-- Fixture Selection -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Select Fixture</h2>
        
        <div class="space-y-4">
          <div>
            <label for="fixture" class="block text-sm font-medium text-gray-700 mb-2">
              Choose Fixture to View
            </label>
            <select
              id="fixture"
              bind:value={selectedFixtureId}
              on:change={handleFixtureChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a fixture...</option>
              {#each fixtures as fixture}
                <option value={fixture.id}>
                  Week {fixture.week_number} - {fixture.opposition} ({fixture.venue}) - {formatDate(fixture.match_date)}
                </option>
              {/each}
            </select>
          </div>
        </div>
      </div>
      
      <!-- Games for Selected Fixture -->
      {#if selectedFixtureId && games.length > 0}
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Games in Fixture</h2>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Game #
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Our Player
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opponent
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each games as game}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Game {game.game_number}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.players?.name || 'Unknown Player'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.opponent_name || 'TBD'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm {getResultClass(game.result)}">
                      {getResultDisplay(game.result)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        on:click={() => {
                          selectedGameId = game.id;
                          viewGameDarts();
                        }}
                        class="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Darts
                      </button>
                      {#if game.result}
                        <button
                          on:click={() => {
                            selectedGameId = game.id;
                            viewGameDarts();
                          }}
                          class="text-green-600 hover:text-green-900"
                        >
                          Edit Darts
                        </button>
                      {:else}
                        <span class="text-gray-400">No Data</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else if selectedFixtureId}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-center py-8">
            <p class="text-gray-500">No games found for this fixture</p>
          </div>
        </div>
      {/if}
      
      <!-- Game Selection for Dart Viewing -->
      {#if games.length > 0}
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">View Game Darts</h2>
          
          <div class="space-y-4">
            <div>
              <label for="game" class="block text-sm font-medium text-gray-700 mb-2">
                Select Game to View/Edit Dart History
              </label>
              <select
                id="game"
                bind:value={selectedGameId}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a game...</option>
                {#each games as game}
                  <option value={game.id}>
                    Game {game.game_number} - {game.players?.name || 'Unknown'} vs {game.opponent_name || 'TBD'} 
                    ({getResultDisplay(game.result)})
                  </option>
                {/each}
              </select>
            </div>
            
            {#if selectedGameId}
              <button
                on:click={viewGameDarts}
                class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View/Edit Dart History
              </button>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>