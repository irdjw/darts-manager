<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Player, Fixture, AttendanceRecord } from '$lib/types/dashboard';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import { formatDate, formatPercentage, getStatusBadgeClasses } from '$lib/utils/formatting';

  // Services
  const dashboardService = new DashboardService();

  // State
  let loading = true;
  let error: string | null = null;
  let activeTab: 'overview' | 'players' | 'fixtures' | 'users' = 'overview';

  // Data
  let players: Player[] = [];
  let fixtures: Fixture[] = [];
  let systemStats = {
    totalPlayers: 0,
    activePlayers: 0,
    completedFixtures: 0,
    upcomingFixtures: 0,
    totalGames: 0,
    averageAttendance: 0
  };

  // Forms
  let newPlayerName = '';
  let newFixture = {
    week_number: 1,
    opposition: '',
    venue: 'home' as 'home' | 'away',
    match_date: new Date().toISOString().split('T')[0],
    league_year: '2025/26'
  };

  // Modals
  let showAddPlayerModal = false;
  let showAddFixtureModal = false;
  let showPlayerDetailModal = false;
  let selectedPlayer: Player | null = null;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = null;
      
      // Load all data
      await Promise.all([
        loadPlayers(),
        loadFixtures(),
        calculateSystemStats()
      ]);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load admin data';
      console.error('Admin data loading error:', err);
    } finally {
      loading = false;
    }
  }

  async function loadPlayers() {
    players = await dashboardService.getAllPlayers();
  }

  async function loadFixtures() {
    // In a real app, you'd have a service method to get all fixtures
    // For now, we'll get recent results and upcoming fixtures
    const [upcoming, recent] = await Promise.all([
      dashboardService.getUpcomingFixtures(10),
      dashboardService.getRecentResults(10)
    ]);
    fixtures = [...upcoming, ...recent];
  }

  async function calculateSystemStats() {
    systemStats.totalPlayers = players.length;
    systemStats.activePlayers = players.filter(p => !p.drop_week).length;
    systemStats.completedFixtures = fixtures.filter(f => f.status === 'completed').length;
    systemStats.upcomingFixtures = fixtures.filter(f => f.status === 'to_play').length;
    systemStats.totalGames = players.reduce((sum, p) => sum + (p.games_played || 0), 0);
    
    // Calculate average attendance (mock calculation)
    systemStats.averageAttendance = 85; // In real app, this would be calculated from attendance data
  }

  async function addPlayer() {
    if (!newPlayerName.trim()) {
      error = 'Please enter a player name';
      return;
    }

    try {
      // In a real app, you'd call a service method to add the player
      console.log('Adding player:', newPlayerName);
      
      // Mock adding player to list
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: newPlayerName.trim(),
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        win_percentage: 0,
        consecutive_losses: 0,
        highest_checkout: 0,
        total_180s: 0
      };
      
      players = [...players, newPlayer];
      newPlayerName = '';
      showAddPlayerModal = false;
      
      await calculateSystemStats();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add player';
    }
  }

  async function addFixture() {
    if (!newFixture.opposition.trim()) {
      error = 'Please enter opposition team name';
      return;
    }

    try {
      // In a real app, you'd call a service method to add the fixture
      console.log('Adding fixture:', newFixture);
      
      // Mock adding fixture to list
      const fixture: Fixture = {
        id: crypto.randomUUID(),
        week_number: newFixture.week_number,
        opposition: newFixture.opposition.trim(),
        venue: newFixture.venue,
        match_date: newFixture.match_date,
        result: 'to_play',
        status: 'to_play'
      };
      
      fixtures = [fixture, ...fixtures];
      newFixture = {
        week_number: newFixture.week_number + 1,
        opposition: '',
        venue: 'home',
        match_date: new Date().toISOString().split('T')[0],
        league_year: '2025/26'
      };
      showAddFixtureModal = false;
      
      await calculateSystemStats();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add fixture';
    }
  }

  function viewPlayerDetail(player: Player) {
    selectedPlayer = player;
    showPlayerDetailModal = true;
  }

  function resetPlayerStats(player: Player) {
    if (confirm(`Are you sure you want to reset stats for ${player.name}?`)) {
      // In a real app, you'd call a service method
      console.log('Resetting stats for:', player.name);
      
      // Mock reset
      const updatedPlayers = players.map(p => {
        if (p.id === player.id) {
          return {
            ...p,
            games_played: 0,
            games_won: 0,
            games_lost: 0,
            win_percentage: 0,
            consecutive_losses: 0,
            highest_checkout: 0,
            total_180s: 0,
            drop_week: undefined
          };
        }
        return p;
      });
      players = updatedPlayers;
    }
  }

  function deletePlayer(player: Player) {
    if (confirm(`Are you sure you want to delete ${player.name}? This cannot be undone.`)) {
      // In a real app, you'd call a service method
      console.log('Deleting player:', player.name);
      players = players.filter(p => p.id !== player.id);
    }
  }
</script>

<svelte:head>
  <title>Admin Dashboard - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <p class="text-sm text-gray-500">System management</p>
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

  {#if error}
    <div class="px-4 py-2 md:px-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{error}</p>
        <button 
          on:click={() => error = null}
          class="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  {/if}

  <!-- Navigation Tabs -->
  <nav class="bg-white border-b border-gray-200">
    <div class="px-4 md:px-6">
      <div class="flex space-x-8 overflow-x-auto">
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'overview' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'overview'}
        >
          Overview
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'players' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'players'}
        >
          Players
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'fixtures' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'fixtures'}
        >
          Fixtures
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'users' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'users'}
        >
          Users
        </button>
      </div>
    </div>
  </nav>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if loading}
      <LoadingSpinner message="Loading admin data..." />
    {:else if activeTab === 'overview'}
      <!-- System Overview -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-6">System Overview</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Total Players"
            value={systemStats.totalPlayers.toString()}
            subtitle="Registered players"
            icon="👥"
          />
          <StatsCard
            title="Active Players"
            value={systemStats.activePlayers.toString()}
            subtitle="Available for selection"
            icon="✅"
            trend="up"
          />
          <StatsCard
            title="Upcoming Matches"
            value={systemStats.upcomingFixtures.toString()}
            subtitle="Fixtures to play"
            icon="📅"
          />
          <StatsCard
            title="Completed Matches"
            value={systemStats.completedFixtures.toString()}
            subtitle="Season progress"
            icon="🏁"
          />
          <StatsCard
            title="Total Games"
            value={systemStats.totalGames.toString()}
            subtitle="Individual matches"
            icon="🎯"
          />
          <StatsCard
            title="Average Attendance"
            value={formatPercentage(systemStats.averageAttendance)}
            subtitle="Weekly participation"
            icon="📊"
            trend="up"
          />
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              on:click={() => showAddPlayerModal = true}
              class="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-medium
                     min-h-[44px] transition-all touch-manipulation"
            >
              ➕ Add Player
            </button>
            <button
              on:click={() => showAddFixtureModal = true}
              class="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-medium
                     min-h-[44px] transition-all touch-manipulation"
            >
              📅 Add Fixture
            </button>
            <button
              on:click={() => activeTab = 'players'}
              class="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg font-medium
                     min-h-[44px] transition-all touch-manipulation"
            >
              👥 Manage Players
            </button>
            <a
              href="/admin/results"
              class="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg font-medium
                     min-h-[44px] transition-all touch-manipulation flex items-center justify-center text-center"
            >
              🏆 Input Results
            </a>
          </div>
        </div>
      </section>

    {:else if activeTab === 'players'}
      <!-- Player Management -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Player Management</h2>
          <button
            on:click={() => showAddPlayerModal = true}
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium
                   min-h-[44px] transition-all touch-manipulation"
          >
            ➕ Add Player
          </button>
        </div>

        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Games
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each players as player}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span class="text-blue-600 font-medium text-sm">
                            {player.name.charAt(0)}
                          </span>
                        </div>
                        <div class="text-sm font-medium text-gray-900">
                          {player.name}
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.games_played || 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(player.win_percentage || 0)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full
                                   {player.drop_week ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        {player.drop_week ? 'Dropped' : 'Active'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        on:click={() => viewPlayerDetail(player)}
                        class="text-blue-600 hover:text-blue-700"
                      >
                        View
                      </button>
                      <button
                        on:click={() => resetPlayerStats(player)}
                        class="text-yellow-600 hover:text-yellow-700"
                      >
                        Reset
                      </button>
                      <button
                        on:click={() => deletePlayer(player)}
                        class="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    {:else if activeTab === 'fixtures'}
      <!-- Fixture Management -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Fixture Management</h2>
          <button
            on:click={() => showAddFixtureModal = true}
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium
                   min-h-[44px] transition-all touch-manipulation"
          >
            ➕ Add Fixture
          </button>
        </div>

        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opposition
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each fixtures.slice(0, 20) as fixture}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fixture.week_number}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fixture.opposition}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(fixture.match_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fixture.venue === 'home' ? '🏠 Home' : '✈️ Away'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusBadgeClasses(fixture.status)}">
                        {fixture.status === 'to_play' ? 'Upcoming' : 
                         fixture.status === 'completed' ? 'Completed' : 
                         'In Progress'}
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    {:else if activeTab === 'users'}
      <!-- User Management -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-6">User Management</h2>
        <div class="bg-white rounded-lg shadow-lg p-6 text-center">
          <div class="text-gray-500 mb-4">
            <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p>User management functionality</p>
            <p class="text-sm">Coming soon...</p>
          </div>
          <p class="text-sm text-gray-600">
            This section will allow you to manage user accounts, roles, and permissions.
          </p>
        </div>
      </section>
    {/if}
  </main>
</div>

<!-- Add Player Modal -->
{#if showAddPlayerModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Add New Player</h3>
      
      <form on:submit|preventDefault={addPlayer}>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Player Name
          </label>
          <input
            type="text"
            bind:value={newPlayerName}
            placeholder="Enter player name..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            on:click={() => { showAddPlayerModal = false; newPlayerName = ''; }}
            class="px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 
                   rounded-lg min-h-[44px] transition-all touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg
                   min-h-[44px] transition-all touch-manipulation"
          >
            Add Player
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Add Fixture Modal -->
{#if showAddFixtureModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Add New Fixture</h3>
      
      <form on:submit|preventDefault={addFixture}>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Week Number
          </label>
          <input
            type="number"
            bind:value={newFixture.week_number}
            min="1"
            max="50"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Opposition Team
          </label>
          <input
            type="text"
            bind:value={newFixture.opposition}
            placeholder="Enter team name..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Match Date
          </label>
          <input
            type="date"
            bind:value={newFixture.match_date}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Venue
          </label>
          <select
            bind:value={newFixture.venue}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            on:click={() => showAddFixtureModal = false}
            class="px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 
                   rounded-lg min-h-[44px] transition-all touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg
                   min-h-[44px] transition-all touch-manipulation"
          >
            Add Fixture
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Player Detail Modal -->
{#if showPlayerDetailModal && selectedPlayer}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Player Details</h3>
        <button
          on:click={() => showPlayerDetailModal = false}
          class="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <h4 class="font-medium text-gray-900 text-lg">{selectedPlayer.name}</h4>
          <p class="text-sm text-gray-500">Player Statistics</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl font-bold text-gray-900">{selectedPlayer.games_played || 0}</div>
            <div class="text-sm text-gray-600">Games Played</div>
          </div>
          <div class="text-center p-3 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{formatPercentage(selectedPlayer.win_percentage || 0)}</div>
            <div class="text-sm text-green-600">Win Rate</div>
          </div>
          <div class="text-center p-3 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{selectedPlayer.total_180s || 0}</div>
            <div class="text-sm text-blue-600">180s</div>
          </div>
          <div class="text-center p-3 bg-yellow-50 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{selectedPlayer.highest_checkout || 0}</div>
            <div class="text-sm text-yellow-600">Highest Out</div>
          </div>
        </div>
        
        <div class="flex justify-end">
          <button
            on:click={() => showPlayerDetailModal = false}
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg
                   min-h-[44px] transition-all touch-manipulation"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}