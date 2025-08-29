<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import { StatisticsService } from '$lib/services/statisticsService';
  import type { Player } from '$lib/types/dashboard';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import { formatPercentage, getResultBadgeClasses } from '$lib/utils/formatting';

  // Services
  const dashboardService = new DashboardService();
  const statisticsService = new StatisticsService();

  // State
  let loading = true;
  let error: string | null = null;
  let players: Player[] = [];
  let selectedPlayer: Player | null = null;
  let seasonStats = {
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    winPercentage: 0,
    total180s: 0,
    averageScore: 0,
    topPerformer: null as Player | null,
    mostImproved: null as Player | null
  };

  // Filters
  let sortBy: 'name' | 'games_played' | 'win_percentage' | 'total_180s' = 'win_percentage';
  let sortOrder: 'asc' | 'desc' = 'desc';
  let showActiveOnly = false;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = null;
      
      // Load all players
      players = await dashboardService.getAllPlayers();
      
      // Calculate season statistics
      calculateSeasonStats();
      
      // Set default selected player (top performer)
      if (players.length > 0) {
        selectedPlayer = getTopPerformer();
      }
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load statistics';
      console.error('Statistics loading error:', err);
    } finally {
      loading = false;
    }
  }

  function calculateSeasonStats() {
    if (!players.length) return;

    const activePlayers = players.filter(p => !p.drop_week);
    
    seasonStats.totalGames = players.reduce((sum, p) => sum + (p.games_played || 0), 0);
    seasonStats.totalWins = players.reduce((sum, p) => sum + (p.games_won || 0), 0);
    seasonStats.totalLosses = players.reduce((sum, p) => sum + (p.games_lost || 0), 0);
    seasonStats.winPercentage = seasonStats.totalGames > 0 
      ? (seasonStats.totalWins / seasonStats.totalGames) * 100 
      : 0;
    seasonStats.total180s = players.reduce((sum, p) => sum + (p.total_180s || 0), 0);
    
    // Find top performer (highest win percentage with minimum 3 games)
    seasonStats.topPerformer = players
      .filter(p => (p.games_played || 0) >= 3)
      .sort((a, b) => (b.win_percentage || 0) - (a.win_percentage || 0))[0] || null;

    // Most improved (placeholder - would need historical data)
    seasonStats.mostImproved = players
      .filter(p => p.last_result === 'win')
      .sort((a, b) => (b.games_won || 0) - (a.games_won || 0))[0] || null;
  }

  function getTopPerformer(): Player | null {
    return players
      .filter(p => (p.games_played || 0) >= 3)
      .sort((a, b) => (b.win_percentage || 0) - (a.win_percentage || 0))[0] || null;
  }

  function sortPlayers(players: Player[]): Player[] {
    return [...players].sort((a, b) => {
      let aValue = a[sortBy] || 0;
      let bValue = b[sortBy] || 0;
      
      if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  $: filteredPlayers = sortPlayers(
    showActiveOnly 
      ? players.filter(p => !p.drop_week)
      : players
  );
</script>

<svelte:head>
  <title>Statistics - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Team Statistics</h1>
        <p class="text-sm text-gray-500">Season performance overview</p>
      </div>
      
      <button
        on:click={loadData}
        disabled={loading}
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 
               rounded-lg text-sm font-medium min-h-[44px] transition-all touch-manipulation"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </header>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
        <button 
          on:click={loadData}
          class="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    {/if}

    {#if loading}
      <LoadingSpinner message="Loading statistics..." />
    {:else}
      <!-- Season Overview Cards -->
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Season Overview</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Games"
            value={seasonStats.totalGames.toString()}
            subtitle="Matches played"
            icon="🎯"
          />
          <StatsCard
            title="Win Rate"
            value={formatPercentage(seasonStats.winPercentage)}
            subtitle="Team average"
            icon="🏆"
            trend="up"
          />
          <StatsCard
            title="Total 180s"
            value={seasonStats.total180s.toString()}
            subtitle="Maximum scores"
            icon="🎖️"
          />
          <StatsCard
            title="Active Players"
            value={players.filter(p => !p.drop_week).length.toString()}
            subtitle="Available for selection"
            icon="👥"
          />
        </div>
      </section>

      <!-- Top Performers -->
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Top Performers</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#if seasonStats.topPerformer}
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <div class="flex items-center space-x-3 mb-3">
                <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span class="text-yellow-600 font-semibold text-sm">
                    {seasonStats.topPerformer.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">🥇 Best Win Rate</h3>
                  <p class="text-sm text-gray-500">{seasonStats.topPerformer.name}</p>
                </div>
              </div>
              <div class="text-2xl font-bold text-green-600 mb-1">
                {formatPercentage(seasonStats.topPerformer.win_percentage || 0)}
              </div>
              <div class="text-sm text-gray-500">
                {seasonStats.topPerformer.games_won || 0}W - {seasonStats.topPerformer.games_lost || 0}L
              </div>
            </div>
          {/if}

          {#if seasonStats.mostImproved}
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <div class="flex items-center space-x-3 mb-3">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-blue-600 font-semibold text-sm">
                    {seasonStats.mostImproved.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">📈 Most Wins</h3>
                  <p class="text-sm text-gray-500">{seasonStats.mostImproved.name}</p>
                </div>
              </div>
              <div class="text-2xl font-bold text-blue-600 mb-1">
                {seasonStats.mostImproved.games_won || 0}
              </div>
              <div class="text-sm text-gray-500">
                Total wins this season
              </div>
            </div>
          {/if}
        </div>
      </section>

      <!-- Player Statistics -->
      <section>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <h2 class="text-lg font-semibold text-gray-900">Player Statistics</h2>
          
          <!-- Filters and Sort Controls -->
          <div class="flex flex-col sm:flex-row gap-2">
            <label class="flex items-center text-sm">
              <input 
                type="checkbox" 
                bind:checked={showActiveOnly}
                class="mr-2"
              />
              Active only
            </label>
            
            <select 
              bind:value={sortBy}
              class="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="name">Name</option>
              <option value="games_played">Games Played</option>
              <option value="win_percentage">Win %</option>
              <option value="total_180s">180s</option>
            </select>
            
            <select 
              bind:value={sortOrder}
              class="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each filteredPlayers as player (player.id)}
            <div 
              class="bg-white p-4 rounded-lg shadow-lg cursor-pointer border-2 transition-all
                     {selectedPlayer?.id === player.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}"
              on:click={() => selectedPlayer = player}
              on:keydown={(e) => e.key === 'Enter' && (selectedPlayer = player)}
              role="button"
              tabindex="0"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-semibold text-sm">
                      {player.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">{player.name}</h3>
                    {#if player.drop_week}
                      <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Dropped
                      </span>
                    {:else}
                      <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Active
                      </span>
                    {/if}
                  </div>
                </div>
                
                {#if player.last_result}
                  <span class="px-2 py-1 rounded text-xs font-medium {getResultBadgeClasses(player.last_result)}">
                    {player.last_result.charAt(0).toUpperCase() + player.last_result.slice(1)}
                  </span>
                {/if}
              </div>
              
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="text-center">
                  <p class="text-gray-500">Games</p>
                  <p class="font-medium text-gray-900">{player.games_played || 0}</p>
                </div>
                <div class="text-center">
                  <p class="text-gray-500">Win Rate</p>
                  <p class="font-medium text-green-600">{formatPercentage(player.win_percentage || 0)}</p>
                </div>
                <div class="text-center">
                  <p class="text-gray-500">W-L</p>
                  <p class="font-medium text-gray-900">{player.games_won || 0}-{player.games_lost || 0}</p>
                </div>
                <div class="text-center">
                  <p class="text-gray-500">180s</p>
                  <p class="font-medium text-blue-600">{player.total_180s || 0}</p>
                </div>
              </div>
              
              {#if player.consecutive_losses > 0}
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <p class="text-xs text-red-600">
                    ⚠️ {player.consecutive_losses} consecutive loss{player.consecutive_losses > 1 ? 'es' : ''}
                  </p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        
        {#if filteredPlayers.length === 0}
          <div class="text-center py-12">
            <p class="text-gray-500 mb-4">No players found matching your filters</p>
            <button
              on:click={() => { showActiveOnly = false; sortBy = 'name'; }}
              class="text-blue-600 hover:text-blue-700 underline"
            >
              Reset filters
            </button>
          </div>
        {/if}
      </section>

      <!-- Selected Player Detail -->
      {#if selectedPlayer}
        <section class="mt-8">
          <div class="bg-white p-6 rounded-lg shadow-lg">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">
                Detailed Statistics: {selectedPlayer.name}
              </h3>
              <button
                on:click={() => selectedPlayer = null}
                class="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">{selectedPlayer.games_played || 0}</div>
                <div class="text-sm text-gray-500">Total Games</div>
              </div>
              <div class="text-center p-4 bg-green-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{selectedPlayer.games_won || 0}</div>
                <div class="text-sm text-green-600">Games Won</div>
              </div>
              <div class="text-center p-4 bg-red-50 rounded-lg">
                <div class="text-2xl font-bold text-red-600">{selectedPlayer.games_lost || 0}</div>
                <div class="text-sm text-red-600">Games Lost</div>
              </div>
              <div class="text-center p-4 bg-blue-50 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">{selectedPlayer.total_180s || 0}</div>
                <div class="text-sm text-blue-600">Maximum Scores</div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <div class="text-center p-4 border border-gray-200 rounded-lg">
                <div class="text-xl font-bold text-gray-900">{formatPercentage(selectedPlayer.win_percentage || 0)}</div>
                <div class="text-sm text-gray-500">Win Percentage</div>
              </div>
              <div class="text-center p-4 border border-gray-200 rounded-lg">
                <div class="text-xl font-bold text-gray-900">{selectedPlayer.highest_checkout || 0}</div>
                <div class="text-sm text-gray-500">Highest Checkout</div>
              </div>
              <div class="text-center p-4 border border-gray-200 rounded-lg">
                <div class="text-xl font-bold text-gray-900">
                  {selectedPlayer.checkout_attempts > 0 
                    ? formatPercentage((selectedPlayer.checkout_hits || 0) / selectedPlayer.checkout_attempts * 100)
                    : '0%'
                  }
                </div>
                <div class="text-sm text-gray-500">Checkout %</div>
              </div>
            </div>
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>