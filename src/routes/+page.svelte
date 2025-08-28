<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import QuickActions from '$lib/components/QuickActions.svelte';
  import type { Fixture, DashboardStats } from '$lib/types/dashboard';
  
  let loading = true;
  let error = '';
  let currentFixture: Fixture | null = null;
  let stats: DashboardStats | null = null;
  
  const dashboardService = new DashboardService();
  
  onMount(async () => {
    try {
      loading = true;
      error = '';
      
      // Fetch real data from Supabase
      const [fixtureData, statsData] = await Promise.all([
        dashboardService.getCurrentFixture(),
        dashboardService.getSeasonStats()
      ]);
      
      currentFixture = fixtureData;
      stats = statsData;
      
      console.log('Dashboard data loaded:', { currentFixture, stats });
      
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      error = err.message || 'Failed to load dashboard data';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-16">
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">IW</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-gray-900">Dashboard</h1>
          <p class="text-sm text-gray-500">Isaac Wilson Darts Team</p>
        </div>
      </div>
    </div>
  </header>

  <main class="px-4 py-6">
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex items-center">
          <div class="text-red-400 mr-3">⚠️</div>
          <p class="text-sm text-red-800">{error}</p>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        <!-- Next Match -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Next Match</h2>
          {#if currentFixture}
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Week {currentFixture.week_number}</h3>
                  <p class="text-gray-700 font-medium">vs {currentFixture.opposition || 'TBD'}</p>
                  <p class="text-sm text-gray-500 mt-1">
                    {currentFixture.match_date ? new Date(currentFixture.match_date).toLocaleDateString('en-GB') : 'Date TBD'} • 
                    {currentFixture.venue === 'home' ? 'Home' : 'Away'}
                  </p>
                </div>
                <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Upcoming
                </span>
              </div>
            </div>
          {:else}
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <p class="text-gray-500 text-center">No upcoming fixtures found</p>
            </div>
          {/if}
        </section>
        
        <!-- Quick Actions -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <QuickActions />
        </section>
        
        <!-- Stats -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Season Overview</h2>
          {#if stats}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-white p-4 rounded-lg shadow-lg text-center">
                <h3 class="text-lg font-semibold text-gray-900">League Position</h3>
                <p class="text-3xl font-bold text-blue-600">{stats.current_position}</p>
              </div>
              
              <div class="bg-white p-4 rounded-lg shadow-lg text-center">
                <h3 class="text-lg font-semibold text-gray-900">Win Rate</h3>
                <p class="text-3xl font-bold text-green-600">{stats.win_percentage}%</p>
              </div>
              
              <div class="bg-white p-4 rounded-lg shadow-lg text-center">
                <h3 class="text-lg font-semibold text-gray-900">Games Record</h3>
                <p class="text-lg text-gray-700">{stats.games_won}W - {stats.games_lost}L</p>
              </div>
            </div>
            
            <!-- Additional Stats -->
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white p-4 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Remaining Fixtures</h3>
                <p class="text-2xl font-bold text-orange-600">{stats.remaining_fixtures}</p>
              </div>
              
              <div class="bg-white p-4 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Top Performer</h3>
                <p class="text-lg text-gray-700">{stats.top_performer?.name || 'N/A'}</p>
                {#if stats.top_performer?.win_percentage}
                  <p class="text-sm text-gray-500">{stats.top_performer.win_percentage}% win rate</p>
                {/if}
              </div>
            </div>
          {:else}
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <p class="text-gray-500 text-center">No season statistics available</p>
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </main>
</div>