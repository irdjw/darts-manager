<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { DashboardService } from '$lib/services/dashboardService';
  import ScoringEngine from '$lib/components/scoringEngine.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import type { Fixture, Player } from '$lib/types/dashboard';
  import type { PlayerGameStats } from '$lib/types/scoring';
  import { formatDate, getVenueDisplay } from '$lib/utils/formatting';

  // Services
  const dashboardService = new DashboardService();

  // State
  let loading = true;
  let error: string | null = null;
  let fixture: Fixture | null = null;
  let homePlayer: Player | null = null;
  let awayPlayer: Player | null = null;
  let fixtureId: string;
  let gameInProgress = false;
  let gameCompleted = false;
  let matchStats: PlayerGameStats[] = [];

  // Match Configuration
  let selectedHomePlayer: string = '';
  let selectedAwayPlayer: string = '';
  let availablePlayers: Player[] = [];

  $: fixtureId = $page.params.id || '';

  onMount(async () => {
    if (fixtureId) {
      await loadFixture();
      await loadPlayers();
    } else {
      error = 'No fixture ID provided';
      loading = false;
    }
  });

  async function loadFixture() {
    try {
      // In a real app, you'd have a service method to get fixture by ID
      // For now, we'll simulate this by checking current fixture or creating a mock
      const currentFixture = await dashboardService.getCurrentFixture();
      
      if (currentFixture && currentFixture.id === fixtureId) {
        fixture = currentFixture;
      } else {
        // Create a mock fixture for testing
        fixture = {
          id: fixtureId,
          week_number: 1,
          match_date: new Date().toISOString(),
          opposition: 'Test Opposition',
          venue: 'home',
          result: 'to_play',
          status: 'in_progress'
        };
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load fixture';
      console.error('Fixture loading error:', err);
    }
  }

  async function loadPlayers() {
    try {
      // Get all available players for the match
      const allPlayers = await dashboardService.getAllPlayers();
      availablePlayers = allPlayers.filter(p => !p.drop_week);
      
      // Auto-select players if we have attendance data for this week
      if (fixture) {
        try {
          const attendance = await dashboardService.getWeeklyAttendance(fixture.week_number);
          const selectedAttendees = attendance.filter(a => a.selected && a.attended);
          
          if (selectedAttendees.length >= 2) {
            selectedHomePlayer = selectedAttendees[0].player_id;
            selectedAwayPlayer = selectedAttendees[1].player_id;
          }
        } catch (attendanceErr) {
          console.warn('Could not load attendance data:', attendanceErr);
        }
      }
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load players';
      console.error('Players loading error:', err);
    } finally {
      loading = false;
    }
  }

  function startMatch() {
    if (!selectedHomePlayer || !selectedAwayPlayer) {
      error = 'Please select both players';
      return;
    }

    if (selectedHomePlayer === selectedAwayPlayer) {
      error = 'Please select different players';
      return;
    }

    homePlayer = availablePlayers.find(p => p.id === selectedHomePlayer) || null;
    awayPlayer = availablePlayers.find(p => p.id === selectedAwayPlayer) || null;

    if (!homePlayer || !awayPlayer) {
      error = 'Selected players not found';
      return;
    }

    gameInProgress = true;
    gameCompleted = false;
    error = null;
  }

  function handleGameComplete(stats: PlayerGameStats[]) {
    matchStats = stats;
    gameCompleted = true;
    gameInProgress = false;

    // In a real app, you would save the match results to the database
    console.log('Match completed:', stats);
  }

  function handleScoreUpdate(homeScore: number, awayScore: number) {
    // Real-time score updates could be displayed in the UI
    console.log('Score update:', { homeScore, awayScore });
  }

  function resetMatch() {
    gameInProgress = false;
    gameCompleted = false;
    matchStats = [];
    homePlayer = null;
    awayPlayer = null;
    selectedHomePlayer = '';
    selectedAwayPlayer = '';
    error = null;
  }

  function finishAndSave() {
    // In a real app, save results to database
    // For now, just navigate back
    goto('/dashboard');
  }
</script>

<svelte:head>
  <title>Match Scoring - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Match Scoring</h1>
        {#if fixture}
          <p class="text-sm text-gray-500">
            Week {fixture.week_number} vs {fixture.opposition}
          </p>
        {/if}
      </div>
      
      <div class="flex space-x-2">
        {#if gameInProgress}
          <button
            on:click={resetMatch}
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium 
                   min-h-[44px] transition-all touch-manipulation"
          >
            Reset
          </button>
        {:else}
          <button
            on:click={() => goto('/dashboard')}
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium 
                   min-h-[44px] transition-all touch-manipulation"
          >
            Back
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
        <button 
          on:click={() => error = null}
          class="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Dismiss
        </button>
      </div>
    {/if}

    {#if loading}
      <LoadingSpinner message="Loading match data..." />
    {:else if gameCompleted}
      <!-- Match Results -->
      <section>
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-green-600 mb-2">Match Complete!</h2>
            {#if fixture}
              <p class="text-gray-600">
                Week {fixture.week_number} vs {fixture.opposition}
              </p>
            {/if}
          </div>

          {#if matchStats.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {#each matchStats as playerStats}
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-lg">
                      {playerStats.playerName}
                    </h3>
                    <span class="px-3 py-1 rounded-full text-sm font-medium
                                {playerStats.gameWon ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      {playerStats.gameWon ? 'Winner' : 'Runner-up'}
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="text-center">
                      <div class="font-semibold text-xl">{playerStats.average.toFixed(1)}</div>
                      <div class="text-gray-600">Average</div>
                    </div>
                    <div class="text-center">
                      <div class="font-semibold text-xl">{playerStats.totalDarts}</div>
                      <div class="text-gray-600">Darts</div>
                    </div>
                    <div class="text-center">
                      <div class="font-semibold text-xl">{playerStats.scores180}</div>
                      <div class="text-gray-600">180s</div>
                    </div>
                    <div class="text-center">
                      <div class="font-semibold text-xl">{playerStats.doublePercentage.toFixed(1)}%</div>
                      <div class="text-gray-600">Double %</div>
                    </div>
                    <div class="text-center">
                      <div class="font-semibold text-xl">{playerStats.highestCheckout}</div>
                      <div class="text-gray-600">High Out</div>
                    </div>
                    <div class="text-center">
                      <div class="font-semibold text-xl">{playerStats.checkoutPercentage.toFixed(1)}%</div>
                      <div class="text-gray-600">Checkout %</div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <div class="flex justify-center mt-6">
            <button
              on:click={finishAndSave}
              class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium
                     min-h-[44px] transition-all touch-manipulation"
            >
              Save Results & Return
            </button>
          </div>
        </div>
      </section>
    {:else if gameInProgress && homePlayer && awayPlayer}
      <!-- Active Scoring -->
      <section>
        {#if fixture}
          <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-semibold text-gray-900">
                  Week {fixture.week_number} vs {fixture.opposition}
                </h2>
                <p class="text-sm text-gray-600">
                  {formatDate(fixture.match_date)} • {getVenueDisplay(fixture.venue)}
                </p>
              </div>
              <span class="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                In Progress
              </span>
            </div>
          </div>
        {/if}

        <ScoringEngine
          gameId={fixtureId}
          homePlayerName={homePlayer.name}
          awayPlayerName={awayPlayer.name}
          isLeagueMatch={true}
          onGameComplete={handleGameComplete}
          onScoreUpdate={handleScoreUpdate}
        />
      </section>
    {:else}
      <!-- Player Selection -->
      <section>
        {#if fixture}
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Match Details</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Week</label>
                <div class="mt-1 text-lg font-semibold">{fixture.week_number}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Opposition</label>
                <div class="mt-1 text-lg font-semibold">{fixture.opposition}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Venue</label>
                <div class="mt-1 text-lg font-semibold">{getVenueDisplay(fixture.venue)}</div>
              </div>
            </div>
          </div>
        {/if}

        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">Select Players</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Home Player Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Our Player
              </label>
              <select 
                bind:value={selectedHomePlayer}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select player...</option>
                {#each availablePlayers as player}
                  <option value={player.id}>
                    {player.name} ({player.win_percentage || 0}% win rate)
                  </option>
                {/each}
              </select>
              
              {#if selectedHomePlayer}
                {@const player = availablePlayers.find(p => p.id === selectedHomePlayer)}
                {#if player}
                  <div class="mt-2 p-3 bg-blue-50 rounded-lg">
                    <div class="text-sm text-blue-800">
                      <div class="font-medium">{player.name}</div>
                      <div class="flex justify-between mt-1">
                        <span>Games: {player.games_played || 0}</span>
                        <span>Win Rate: {player.win_percentage || 0}%</span>
                      </div>
                      <div class="flex justify-between">
                        <span>180s: {player.total_180s || 0}</span>
                        <span>High Out: {player.highest_checkout || 0}</span>
                      </div>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>

            <!-- Away Player Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Opposition Player
              </label>
              <select 
                bind:value={selectedAwayPlayer}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select player...</option>
                {#each availablePlayers as player}
                  <option value={player.id}>
                    {player.name} ({player.win_percentage || 0}% win rate)
                  </option>
                {/each}
              </select>
              
              {#if selectedAwayPlayer}
                {@const player = availablePlayers.find(p => p.id === selectedAwayPlayer)}
                {#if player}
                  <div class="mt-2 p-3 bg-red-50 rounded-lg">
                    <div class="text-sm text-red-800">
                      <div class="font-medium">{player.name}</div>
                      <div class="flex justify-between mt-1">
                        <span>Games: {player.games_played || 0}</span>
                        <span>Win Rate: {player.win_percentage || 0}%</span>
                      </div>
                      <div class="flex justify-between">
                        <span>180s: {player.total_180s || 0}</span>
                        <span>High Out: {player.highest_checkout || 0}</span>
                      </div>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          </div>

          <div class="flex justify-center mt-8">
            <button
              on:click={startMatch}
              disabled={!selectedHomePlayer || !selectedAwayPlayer || selectedHomePlayer === selectedAwayPlayer}
              class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-8 py-3 
                     rounded-lg font-medium text-lg min-h-[44px] transition-all touch-manipulation"
            >
              Start Match
            </button>
          </div>

          {#if availablePlayers.length === 0}
            <div class="text-center py-8">
              <p class="text-gray-500 mb-4">No active players available</p>
              <button
                on:click={loadPlayers}
                class="text-blue-600 hover:text-blue-700 underline"
              >
                Refresh players
              </button>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </main>
</div>