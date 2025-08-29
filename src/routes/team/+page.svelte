<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Player, Fixture, AttendanceRecord, TeamSelection } from '$lib/types/dashboard';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import MatchCard from '$lib/components/MatchCard.svelte';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import { formatDate, formatPercentage } from '$lib/utils/formatting';

  // Services
  const dashboardService = new DashboardService();

  // State
  let loading = true;
  let error: string | null = null;
  let activeTab: 'overview' | 'selection' | 'attendance' | 'performance' = 'overview';

  // Data
  let players: Player[] = [];
  let upcomingFixtures: Fixture[] = [];
  let currentFixture: Fixture | null = null;
  let currentWeek = 1;
  let teamStats = {
    totalPlayers: 0,
    activePlayers: 0,
    averageWinRate: 0,
    totalGames: 0,
    bestPerformer: null as Player | null
  };

  // Team Selection
  let attendanceRecords: AttendanceRecord[] = [];
  let selectedPlayers: Player[] = [];
  let availablePlayers: Player[] = [];

  // Performance tracking
  let performanceData = {
    recentResults: [] as Fixture[],
    formGuide: [] as string[], // 'W', 'L', 'D' for last 5 games
    dropCandidates: [] as Player[]
  };

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = null;
      
      // Load core data
      await Promise.all([
        loadPlayers(),
        loadFixtures(),
        loadCurrentWeek()
      ]);
      
      // Calculate team statistics
      calculateTeamStats();
      
      // Load attendance if we have a current week
      if (currentWeek) {
        await loadAttendance(currentWeek);
      }
      
      // Load performance data
      await loadPerformanceData();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load team data';
      console.error('Team data loading error:', err);
    } finally {
      loading = false;
    }
  }

  async function loadPlayers() {
    players = await dashboardService.getAllPlayers();
  }

  async function loadFixtures() {
    upcomingFixtures = await dashboardService.getUpcomingFixtures(5);
    currentFixture = await dashboardService.getCurrentFixture();
  }

  async function loadCurrentWeek() {
    if (currentFixture) {
      currentWeek = currentFixture.week_number;
    } else if (upcomingFixtures.length > 0) {
      currentWeek = upcomingFixtures[0].week_number;
    }
  }

  async function loadAttendance(weekNumber: number) {
    try {
      attendanceRecords = await dashboardService.getWeeklyAttendance(weekNumber);
      
      // Separate into available and selected players
      availablePlayers = players.filter(p => {
        const attendance = attendanceRecords.find(a => a.player_id === p.id);
        return attendance?.attended === true;
      });
      
      selectedPlayers = availablePlayers.filter(p => {
        const attendance = attendanceRecords.find(a => a.player_id === p.id);
        return attendance?.selected === true;
      });
    } catch (err) {
      console.warn('Failed to load attendance:', err);
      availablePlayers = players.filter(p => !p.drop_week);
      selectedPlayers = [];
    }
  }

  async function loadPerformanceData() {
    try {
      performanceData.recentResults = await dashboardService.getRecentResults(10);
      
      // Generate form guide from recent results
      performanceData.formGuide = performanceData.recentResults
        .slice(0, 5)
        .map(f => f.team_won ? 'W' : 'L')
        .reverse();
      
      // Identify drop candidates (2+ consecutive losses)
      performanceData.dropCandidates = players.filter(p => 
        (p.consecutive_losses || 0) >= 2 && !p.drop_week
      );
      
    } catch (err) {
      console.warn('Failed to load performance data:', err);
    }
  }

  function calculateTeamStats() {
    teamStats.totalPlayers = players.length;
    teamStats.activePlayers = players.filter(p => !p.drop_week).length;
    
    const activePlayers = players.filter(p => !p.drop_week);
    teamStats.averageWinRate = activePlayers.length > 0 
      ? activePlayers.reduce((sum, p) => sum + (p.win_percentage || 0), 0) / activePlayers.length
      : 0;
    
    teamStats.totalGames = players.reduce((sum, p) => sum + (p.games_played || 0), 0);
    
    // Best performer (highest win rate with min 3 games)
    teamStats.bestPerformer = activePlayers
      .filter(p => (p.games_played || 0) >= 3)
      .sort((a, b) => (b.win_percentage || 0) - (a.win_percentage || 0))[0] || null;
  }

  async function togglePlayerAttendance(player: Player) {
    const existingRecord = attendanceRecords.find(a => a.player_id === player.id);
    
    if (existingRecord) {
      // Update existing record
      const updatedRecords = attendanceRecords.map(a => {
        if (a.player_id === player.id) {
          return { ...a, attended: !a.attended, selected: false };
        }
        return a;
      });
      attendanceRecords = updatedRecords;
    } else {
      // Create new record
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        player_id: player.id,
        week_number: currentWeek,
        league_year: '2025/26',
        attended: true,
        selected: false,
        player: player
      };
      attendanceRecords = [...attendanceRecords, newRecord];
    }
    
    // Recalculate available players
    availablePlayers = players.filter(p => {
      const attendance = attendanceRecords.find(a => a.player_id === p.id);
      return attendance?.attended === true;
    });
  }

  async function togglePlayerSelection(player: Player) {
    const attendanceRecord = attendanceRecords.find(a => a.player_id === player.id);
    
    if (attendanceRecord && attendanceRecord.attended) {
      // Update selection
      const updatedRecords = attendanceRecords.map(a => {
        if (a.player_id === player.id) {
          return { ...a, selected: !a.selected };
        }
        return a;
      });
      attendanceRecords = updatedRecords;
      
      // Recalculate selected players
      selectedPlayers = availablePlayers.filter(p => {
        const attendance = attendanceRecords.find(a => a.player_id === p.id);
        return attendance?.selected === true;
      });
    }
  }

  async function saveAttendanceAndSelection() {
    if (attendanceRecords.length === 0) {
      error = 'No attendance records to save';
      return;
    }
    
    if (selectedPlayers.length === 0) {
      error = 'Please select at least one player for the team';
      return;
    }
    
    if (selectedPlayers.length > 7) {
      error = 'Team can have maximum 7 players';
      return;
    }

    try {
      await dashboardService.saveAttendance(attendanceRecords);
      error = null;
      
      // Show success message
      alert(`Team selection saved! ${selectedPlayers.length} players selected for week ${currentWeek}.`);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save team selection';
    }
  }

  function getFormIndicator(result: string): string {
    switch (result) {
      case 'W': return '🟢';
      case 'L': return '🔴';
      case 'D': return '🟡';
      default: return '⚪';
    }
  }
</script>

<svelte:head>
  <title>Team Management - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Team Management</h1>
        <p class="text-sm text-gray-500">Captain dashboard</p>
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
                 {activeTab === 'selection' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'selection'}
        >
          Team Selection
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'attendance' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'attendance'}
        >
          Attendance
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'performance' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'performance'}
        >
          Performance
        </button>
      </div>
    </div>
  </nav>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if loading}
      <LoadingSpinner message="Loading team data..." />
    {:else if activeTab === 'overview'}
      <!-- Team Overview -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Team Overview</h2>
        
        <!-- Key Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Active Players"
            value={teamStats.activePlayers.toString()}
            subtitle="Available for selection"
            icon="👥"
          />
          <StatsCard
            title="Team Win Rate"
            value={formatPercentage(teamStats.averageWinRate)}
            subtitle="Average across players"
            icon="🏆"
            trend="up"
          />
          <StatsCard
            title="Total Games"
            value={teamStats.totalGames.toString()}
            subtitle="Season to date"
            icon="🎯"
          />
          <StatsCard
            title="Current Form"
            value={performanceData.formGuide.join('')}
            subtitle="Last 5 results"
            icon="📊"
          />
        </div>

        <!-- Current Match Status -->
        {#if currentFixture}
          <div class="mb-8">
            <h3 class="text-md font-semibold text-gray-900 mb-4">Current Match</h3>
            <MatchCard fixture={currentFixture} priority={true} />
          </div>
        {/if}

        <!-- Upcoming Fixtures -->
        {#if upcomingFixtures.length > 0}
          <div class="mb-8">
            <h3 class="text-md font-semibold text-gray-900 mb-4">Upcoming Fixtures</h3>
            <div class="space-y-4">
              {#each upcomingFixtures.slice(0, 3) as fixture}
                <MatchCard {fixture} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Team Health Alerts -->
        {#if performanceData.dropCandidates.length > 0}
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 class="font-medium text-yellow-800 mb-2">⚠️ Drop Risk Alert</h3>
            <p class="text-yellow-700 text-sm mb-3">
              {performanceData.dropCandidates.length} player{performanceData.dropCandidates.length > 1 ? 's' : ''} 
              at risk of being dropped (2+ consecutive losses):
            </p>
            <div class="flex flex-wrap gap-2">
              {#each performanceData.dropCandidates as player}
                <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                  {player.name} ({player.consecutive_losses} losses)
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </section>

    {:else if activeTab === 'selection'}
      <!-- Team Selection -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Team Selection</h2>
            <p class="text-sm text-gray-500">Week {currentWeek} • {selectedPlayers.length}/7 selected</p>
          </div>
          
          <button
            on:click={saveAttendanceAndSelection}
            disabled={selectedPlayers.length === 0}
            class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 
                   rounded-lg font-medium min-h-[44px] transition-all touch-manipulation"
          >
            Save Team
          </button>
        </div>

        <!-- Selection Progress -->
        <div class="bg-white p-4 rounded-lg shadow-lg mb-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">Team Selection Progress</span>
            <span class="text-sm text-gray-500">{selectedPlayers.length} of 7</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style="width: {Math.min((selectedPlayers.length / 7) * 100, 100)}%"
            ></div>
          </div>
        </div>

        <!-- Available Players for Selection -->
        {#if availablePlayers.length > 0}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="font-medium text-gray-900 mb-4">
              Available Players ({availablePlayers.length})
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each availablePlayers as player}
                {@const isSelected = selectedPlayers.find(p => p.id === player.id) !== undefined}
                {@const canSelect = selectedPlayers.length < 7 || isSelected}
                
                <div 
                  class="p-4 border-2 rounded-lg cursor-pointer transition-all
                         {isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                         {!canSelect ? 'opacity-50 cursor-not-allowed' : ''}"
                  on:click={() => canSelect && togglePlayerSelection(player)}
                  on:keydown={(e) => e.key === 'Enter' && canSelect && togglePlayerSelection(player)}
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
                        <h4 class="font-medium text-gray-900">{player.name}</h4>
                        <div class="text-xs text-gray-500">
                          {formatPercentage(player.win_percentage || 0)} win rate
                        </div>
                      </div>
                    </div>
                    
                    {#if isSelected}
                      <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm">✓</span>
                      </div>
                    {:else}
                      <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    {/if}
                  </div>
                  
                  <div class="grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <div class="text-gray-500">Games</div>
                      <div class="font-medium">{player.games_played || 0}</div>
                    </div>
                    <div>
                      <div class="text-gray-500">Won</div>
                      <div class="font-medium text-green-600">{player.games_won || 0}</div>
                    </div>
                    <div>
                      <div class="text-gray-500">180s</div>
                      <div class="font-medium text-blue-600">{player.total_180s || 0}</div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="bg-white rounded-lg shadow-lg p-8 text-center">
            <p class="text-gray-500 mb-4">No players marked as attending yet</p>
            <button
              on:click={() => activeTab = 'attendance'}
              class="text-blue-600 hover:text-blue-700 underline"
            >
              Mark attendance first
            </button>
          </div>
        {/if}
      </section>

    {:else if activeTab === 'attendance'}
      <!-- Attendance Tracking -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Attendance Tracking</h2>
            <p class="text-sm text-gray-500">Week {currentWeek} attendance</p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="font-medium text-gray-900 mb-4">Mark Player Attendance</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each players as player}
              {@const attendanceRecord = attendanceRecords.find(a => a.player_id === player.id)}
              {@const isAttending = attendanceRecord?.attended === true}
              
              <div 
                class="p-4 border-2 rounded-lg cursor-pointer transition-all
                       {isAttending ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                       {player.drop_week ? 'opacity-50' : ''}"
                on:click={() => !player.drop_week && togglePlayerAttendance(player)}
                on:keydown={(e) => e.key === 'Enter' && !player.drop_week && togglePlayerAttendance(player)}
                role="button"
                tabindex="0"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span class="text-blue-600 font-medium text-sm">
                        {player.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{player.name}</div>
                      {#if player.drop_week}
                        <div class="text-xs text-red-500">Dropped</div>
                      {/if}
                    </div>
                  </div>
                  
                  {#if isAttending}
                    <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-sm">✓</span>
                    </div>
                  {:else}
                    <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                  {/if}
                </div>
                
                <div class="text-xs text-gray-500">
                  {formatPercentage(player.win_percentage || 0)} win rate • {player.games_played || 0} games
                </div>
              </div>
            {/each}
          </div>
        </div>
      </section>

    {:else if activeTab === 'performance'}
      <!-- Team Performance -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Team Performance</h2>
        
        <!-- Form Guide -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 class="font-medium text-gray-900 mb-4">Recent Form</h3>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600">Last 5 results:</span>
            {#each performanceData.formGuide as result}
              <span class="text-lg">{getFormIndicator(result)}</span>
            {/each}
            <span class="text-sm text-gray-500 ml-4">
              (Most recent on right)
            </span>
          </div>
        </div>

        <!-- Recent Results -->
        {#if performanceData.recentResults.length > 0}
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 class="font-medium text-gray-900 mb-4">Recent Results</h3>
            <div class="space-y-3">
              {#each performanceData.recentResults.slice(0, 5) as fixture}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div class="font-medium">Week {fixture.week_number} vs {fixture.opposition}</div>
                    <div class="text-sm text-gray-500">{formatDate(fixture.match_date)}</div>
                  </div>
                  <span class="px-2 py-1 rounded text-sm font-medium
                               {fixture.team_won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {fixture.team_won ? 'Won' : 'Lost'}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Player Performance Summary -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="font-medium text-gray-900 mb-4">Player Performance Summary</h3>
          
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Games</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each players.filter(p => (p.games_played || 0) > 0).sort((a, b) => (b.win_percentage || 0) - (a.win_percentage || 0)) as player}
                  <tr>
                    <td class="px-4 py-2 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <span class="text-blue-600 text-xs font-medium">
                            {player.name.charAt(0)}
                          </span>
                        </div>
                        {player.name}
                      </div>
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {player.games_played || 0}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(player.win_percentage || 0)}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap">
                      {#if player.drop_week}
                        <span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Dropped
                        </span>
                      {:else if (player.consecutive_losses || 0) >= 2}
                        <span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          At Risk
                        </span>
                      {:else}
                        <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {/if}
  </main>
</div>