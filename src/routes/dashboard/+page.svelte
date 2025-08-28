// src/routes/dashboard/+page.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { dashboardStore, currentFixture, dashboardStats, loading, error, nextMatch } from '$lib/stores/dashboard';
  import MatchCard from '$lib/components/MatchCard.svelte';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import QuickActions from '$lib/components/QuickActions.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ErrorAlert from '$lib/components/ErrorAlert.svelte';
  
  onMount(() => {
    dashboardStore.loadDashboard();
  });
</script>

<svelte:head>
  <title>Dashboard - Isaac Wilson Darts Team</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-16">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">IW</span>
        </div>
        <div>
          <h1 class="text-lg md:text-xl font-bold text-gray-900">Dashboard</h1>
          <p class="text-xs md:text-sm text-gray-500">Isaac Wilson Darts Team</p>
        </div>
      </div>
      
      <!-- Quick refresh button -->
      <button
        on:click={dashboardStore.loadDashboard}
        class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] 
               flex items-center justify-center transition-all touch-manipulation"
        aria-label="Refresh dashboard"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </header>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if $error}
      <ErrorAlert message={$error} onClose={dashboardStore.clearError} />
    {/if}
    
    {#if $loading}
      <LoadingSpinner message="Loading dashboard..." />
    {:else}
      <!-- Mobile-first grid layout -->
      <div class="space-y-6">
        <!-- Next Match Section -->
        {#if $nextMatch}
          <section>
            <h2 class="text-base md:text-lg font-semibold text-gray-900 mb-3">Next Match</h2>
            <MatchCard fixture={$nextMatch} priority={true} />
          </section>
        {/if}
        
        <!-- Quick Actions -->
        <section>
          <h2 class="text-base md:text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <QuickActions />
        </section>
        
        <!-- Season Statistics -->
        {#if $dashboardStats}
          <section>
            <h2 class="text-base md:text-lg font-semibold text-gray-900 mb-3">Season Overview</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard
                title="League Position"
                value={$dashboardStats.current_position}
                subtitle="Current standing"
                color="blue"
                icon="trophy"
              />
              
              <StatsCard
                title="Win Rate"
                value="{$dashboardStats.win_percentage}%"
                subtitle="{$dashboardStats.games_won}W / {$dashboardStats.games_lost}L"
                color="green"
                icon="target"
              />
              
              <StatsCard
                title="Fixtures Left"
                value={$dashboardStats.remaining_fixtures}
                subtitle="This season"
                color="orange"
                icon="calendar"
              />
            </div>
          </section>
          
          <!-- Player Performance -->
          <section>
            <h2 class="text-base md:text-lg font-semibold text-gray-900 mb-3">Player Highlights</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="card bg-white p-4 md:p-6 rounded-lg shadow-lg">
                <h3 class="font-medium text-gray-900 mb-2">Top Performer</h3>
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span class="text-green-600 font-semibold text-sm">
                      {$dashboardStats.top_performer.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$dashboardStats.top_performer.name}</p>
                    <p class="text-sm text-gray-500">{$dashboardStats.top_performer.win_percentage}% win rate</p>
                  </div>
                </div>
              </div>
              
              <div class="card bg-white p-4 md:p-6 rounded-lg shadow-lg">
                <h3 class="font-medium text-gray-900 mb-2">Most Improved</h3>
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-semibold text-sm">
                      {$dashboardStats.most_improved.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{$dashboardStats.most_improved.name}</p>
                    <p class="text-sm text-gray-500">Recent form trending up</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  /* Additional mobile-specific styles */
  @media (max-width: 640px) {
    main {
      padding-bottom: 6rem; /* Space for mobile navigation */
    }
  }
</style>