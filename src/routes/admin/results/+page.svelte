<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Fixture, Player } from '$lib/types/dashboard';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let loading = true;
  let error = '';
  let successMessage = '';
  let completedFixtures: Fixture[] = [];
  let allPlayers: Player[] = [];
  let selectedFixture: Fixture | null = null;
  let gameResults: Array<{
    gameNumber: number;
    playerId: string;
    playerName: string;
    result: 'win' | 'loss';
  }> = [];
  let teamResult: 'win' | 'loss' = 'win';
  let homeScore = 0;
  let awayScore = 0;
  
  const dashboardService = new DashboardService();
  
  onMount(async () => {
    await loadData();
  });
  
  async function loadData() {
    try {
      loading = true;
      error = '';
      
      // Load completed fixtures and players
      const [players] = await Promise.all([
        dashboardService.getAllPlayers()
      ]);
      
      allPlayers = players;
      
      // Load completed fixtures (you might need to create this method)
      await loadCompletedFixtures();
      
    } catch (err: any) {
      console.error('Results page load error:', err);
      error = err.message || 'Failed to load results data';
    } finally {
      loading = false;
    }
  }
  
  async function loadCompletedFixtures() {
    // This is a placeholder - you'll need to implement this in your dashboard service
    // For now, we'll create some mock data to demonstrate the interface
    completedFixtures = [
      {
        id: '1',
        week_number: 1,
        match_date: '2025-01-08',
        opposition: 'The Crown',
        venue: 'away',
        result: 'to_play',
        status: 'completed'
      },
      {
        id: '2', 
        week_number: 2,
        match_date: '2025-01-15',
        opposition: 'Red Lion',
        venue: 'home',
        result: 'to_play', 
        status: 'completed'
      }
    ];
  }
  
  function selectFixture(fixture: Fixture) {
    selectedFixture = fixture;
    // Initialize game results for 6 games
    gameResults = Array.from({ length: 6 }, (_, i) => ({
      gameNumber: i + 1,
      playerId: '',
      playerName: '',
      result: 'win'
    }));
    homeScore = 0;
    awayScore = 0;
    calculateScores();
  }
  
  function updatePlayerSelection(gameIndex: number, playerId: string) {
    const player = allPlayers.find(p => p.id === playerId);
    if (player) {
      gameResults[gameIndex].playerId = playerId;
      gameResults[gameIndex].playerName = player.name;
    }
    calculateScores();
  }
  
  function calculateScores() {
    homeScore = gameResults.filter(g => g.result === 'win').length;
    awayScore = gameResults.filter(g => g.result === 'loss').length;
    teamResult = homeScore > awayScore ? 'win' : 'loss';
  }
  
  async function submitResults() {
    if (!selectedFixture) return;
    
    try {
      loading = true;
      error = '';
      successMessage = '';
      
      // Validate all games have players selected
      const incompleteGames = gameResults.filter(g => !g.playerId);
      if (incompleteGames.length > 0) {
        error = 'Please select players for all games';
        return;
      }
      
      // Here you would submit the results to your database
      // This is a placeholder for the actual implementation
      console.log('Submitting results:', {
        fixtureId: selectedFixture.id,
        gameResults,
        teamResult,
        homeScore,
        awayScore
      });
      
      successMessage = `Results submitted successfully for Week ${selectedFixture.week_number} vs ${selectedFixture.opposition}`;
      selectedFixture = null;
      gameResults = [];
      
      // Refresh the completed fixtures list
      await loadCompletedFixtures();
      
    } catch (err: any) {
      console.error('Submit results error:', err);
      error = err.message || 'Failed to submit results';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Results Input - Admin Panel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Results Input</h1>
      <p class="mt-2 text-gray-600">Input results for previous matches</p>
    </div>

    <!-- Success/Error Messages -->
    {#if successMessage}
      <div class="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
        <div class="flex items-center">
          <div class="text-green-400 mr-3">✅</div>
          <p class="text-sm text-green-800">{successMessage}</p>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex items-center">
          <div class="text-red-400 mr-3">⚠️</div>
          <p class="text-sm text-red-800">{error}</p>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-3 text-gray-600">Loading...</span>
      </div>
    {:else if !selectedFixture}
      <!-- Fixture Selection -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Select Match to Input Results</h2>
        </div>
        
        <div class="p-6">
          {#if completedFixtures.length === 0}
            <p class="text-gray-500 text-center py-8">No completed fixtures available for results input</p>
          {:else}
            <div class="grid gap-4">
              {#each completedFixtures as fixture}
                <button
                  on:click={() => selectFixture(fixture)}
                  class="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div class="flex justify-between items-start">
                    <div>
                      <h3 class="font-semibold text-gray-900">Week {fixture.week_number}</h3>
                      <p class="text-gray-600">vs {fixture.opposition}</p>
                      <p class="text-sm text-gray-500">
                        {new Date(fixture.match_date).toLocaleDateString('en-GB')} • 
                        {fixture.venue === 'home' ? 'Home' : 'Away'}
                      </p>
                    </div>
                    <span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                      Click to input results
                    </span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Results Input Form -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              Week {selectedFixture.week_number} vs {selectedFixture.opposition}
            </h2>
            <p class="text-sm text-gray-600">
              {new Date(selectedFixture.match_date).toLocaleDateString('en-GB')} • 
              {selectedFixture.venue === 'home' ? 'Home' : 'Away'}
            </p>
          </div>
          <button
            on:click={() => { selectedFixture = null; gameResults = []; }}
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="p-6">
          <!-- Game Results -->
          <div class="space-y-4">
            {#each gameResults as game, index}
              <div class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div class="flex-shrink-0">
                  <span class="font-semibold text-gray-900">Game {game.gameNumber}</span>
                </div>
                
                <div class="flex-1">
                  <select
                    bind:value={game.playerId}
                    on:change={() => updatePlayerSelection(index, game.playerId)}
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Player</option>
                    {#each allPlayers as player}
                      <option value={player.id}>{player.name}</option>
                    {/each}
                  </select>
                </div>
                
                <div class="flex space-x-2">
                  <label class="flex items-center">
                    <input
                      type="radio"
                      bind:group={game.result}
                      value="win"
                      on:change={calculateScores}
                      class="mr-2"
                    />
                    <span class="text-green-600 font-medium">Win</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      type="radio"
                      bind:group={game.result}
                      value="loss"
                      on:change={calculateScores}
                      class="mr-2"
                    />
                    <span class="text-red-600 font-medium">Loss</span>
                  </label>
                </div>
              </div>
            {/each}
          </div>
          
          <!-- Match Summary -->
          <div class="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-2">Match Summary</h3>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-blue-600">{homeScore}</div>
                <div class="text-sm text-gray-600">Our Score</div>
              </div>
              <div>
                <div class="text-lg font-bold text-gray-600">-</div>
                <div class="text-sm text-gray-600">vs</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-red-600">{awayScore}</div>
                <div class="text-sm text-gray-600">{selectedFixture.opposition}</div>
              </div>
            </div>
            <div class="mt-4 text-center">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {teamResult === 'win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                Team {teamResult === 'win' ? 'Victory' : 'Defeat'}
              </span>
            </div>
          </div>
          
          <!-- Submit Button -->
          <div class="mt-6 flex justify-end">
            <button
              on:click={submitResults}
              disabled={loading || gameResults.some(g => !g.playerId)}
              class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Results'}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>