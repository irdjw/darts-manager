<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import QuickActions from '$lib/components/QuickActions.svelte';
  import ImpersonationPanel from '$lib/components/ImpersonationPanel.svelte';
  import type { PageData } from './$types';
  import type { Fixture, DashboardStats } from '$lib/types/dashboard';
  
  export let data: PageData;
  
  let loading = true;
  let showImpersonationPanel = false;
  let error = '';
  let currentFixture: Fixture | null = null;
  let stats: DashboardStats | null = null;
  
  const dashboardService = new DashboardService();
  
  $: userRole = data?.userRole || 'player';
  $: originalRole = data?.originalRole || 'player';
  $: isImpersonating = data?.isImpersonating || false;
  
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
  <!-- Page Header (visible on all screen sizes) -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <!-- Hide logo on mobile (shown in global header) -->
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center lg:block hidden">
          <span class="text-white text-sm font-bold">IW</span>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-lg font-bold text-gray-900">Dashboard</h1>
            <span class="px-2 py-1 text-xs font-medium rounded-full capitalize
                        {userRole === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                         userRole === 'admin' ? 'bg-red-100 text-red-800' :
                         userRole === 'captain' ? 'bg-blue-100 text-blue-800' :
                         'bg-gray-100 text-gray-800'}">
              {userRole.replace('_', ' ')}
            </span>
            {#if isImpersonating}
              <span class="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                Testing Mode
              </span>
            {/if}
          </div>
          <p class="text-sm text-gray-500 hidden lg:block">Isaac Wilson Darts Team</p>
        </div>
      </div>
      
      <!-- Controls for larger screens -->
      <div class="flex items-center space-x-3">
        <!-- Impersonation controls for super admin -->
        {#if originalRole === 'super_admin' && !isImpersonating}
          <button
            on:click={() => showImpersonationPanel = true}
            class="flex items-center space-x-2 px-4 py-2 border border-purple-300 rounded-lg 
                   text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
            <span>View As User</span>
          </button>
        {:else if isImpersonating}
          <button
            on:click={() => showImpersonationPanel = true}
            class="flex items-center space-x-2 px-4 py-2 border border-orange-300 rounded-lg 
                   text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Stop Testing</span>
          </button>
        {/if}
        
        <!-- Logout button -->
        <form action="/logout" method="post">
          <button
            type="submit"
            class="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg 
                   text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </form>
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
            <a 
              href="/match/{currentFixture.id}"
              class="block bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow 
                     hover:ring-2 hover:ring-blue-500 hover:ring-opacity-20 cursor-pointer group"
            >
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Week {currentFixture.week_number}
                  </h3>
                  <p class="text-gray-700 font-medium">vs {currentFixture.opposition || 'TBD'}</p>
                  <p class="text-sm text-gray-500 mt-1">
                    {currentFixture.match_date ? new Date(currentFixture.match_date).toLocaleDateString('en-GB') : 'Date TBD'} • 
                    {currentFixture.venue === 'home' ? 'Home' : 'Away'}
                  </p>
                  <p class="text-xs text-blue-600 mt-2 group-hover:underline">
                    Click to manage match →
                  </p>
                </div>
                <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Upcoming
                </span>
              </div>
            </a>
          {:else}
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <p class="text-gray-500 text-center">No upcoming fixtures found</p>
            </div>
          {/if}
        </section>
        
        <!-- Quick Actions -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <QuickActions {userRole} />
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

<!-- Impersonation Panel -->
{#if originalRole === 'super_admin'}
  <ImpersonationPanel 
    {userRole}
    bind:visible={showImpersonationPanel}
    on:role-changed={() => {
      // Panel handles page reload, so this is just for completeness
    }}
  />
{/if}
