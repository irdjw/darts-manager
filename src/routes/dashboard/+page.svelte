<script lang="ts">
  import { onMount } from 'svelte';
  import QuickActions from '$lib/components/QuickActions.svelte';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let loading = true;
  
  $: userRole = data?.userRole || 'player';
  let currentFixture = {
    week_number: 1,
    opposition: 'Sample Team',
    match_date: '2025-01-15',
    venue: 'home'
  };
  
  let stats = {
    current_position: 1,
    win_percentage: 75,
    games_won: 12,
    games_lost: 4,
    remaining_fixtures: 15
  };
  
  onMount(() => {
    setTimeout(() => loading = false, 500);
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
          </div>
          <p class="text-sm text-gray-500 hidden lg:block">Isaac Wilson Darts Team</p>
        </div>
      </div>
      
      <!-- Logout button for larger screens -->
      <div class="hidden lg:block">
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
    {:else}
      <div class="space-y-6">
        <!-- Next Match -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Next Match</h2>
          <a 
            href="/match/{currentFixture.id || 'current'}"
            class="block bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow 
                   hover:ring-2 hover:ring-blue-500 hover:ring-opacity-20 cursor-pointer group"
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Week {currentFixture.week_number}
                </h3>
                <p class="text-gray-700 font-medium">vs {currentFixture.opposition}</p>
                <p class="text-sm text-gray-500 mt-1">
                  {new Date(currentFixture.match_date).toLocaleDateString('en-GB')} • 
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
        </section>
        
        <!-- Quick Actions -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <QuickActions {userRole} />
        </section>
        
        <!-- Stats -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Season Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white p-4 rounded-lg shadow-lg text-center">
              <p class="text-2xl font-bold text-blue-600">{stats.current_position}st</p>
              <p class="text-sm text-gray-500">League Position</p>
            </div>
            
            <div class="bg-white p-4 rounded-lg shadow-lg text-center">
              <p class="text-2xl font-bold text-green-600">{stats.win_percentage}%</p>
              <p class="text-sm text-gray-500">{stats.games_won}W / {stats.games_lost}L</p>
            </div>
            
            <div class="bg-white p-4 rounded-lg shadow-lg text-center">
              <p class="text-2xl font-bold text-orange-600">{stats.remaining_fixtures}</p>
              <p class="text-sm text-gray-500">Fixtures Left</p>
            </div>
          </div>
        </section>
      </div>
    {/if}
  </main>
</div>
