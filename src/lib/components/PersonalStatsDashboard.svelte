<!-- PersonalStatsDashboard.svelte - Comprehensive personal statistics dashboard -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { personalGameService } from '../services/personalGameService';
  import type { PersonalStats, PersonalGame, PersonalGoal } from '../database/types';

  // Props
  export let playerId: string;
  export let playerName: string = 'Personal Player';

  // Data state
  let statsSummary: any = null;
  let recentGames: PersonalStats[] = [];
  let personalGoals: PersonalGoal[] = [];
  let performanceAnalytics: any = null;
  let loading: boolean = true;
  let error: string | null = null;

  // UI state
  let selectedTimeframe: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month';
  let selectedGameType: PersonalGame['game_type'] | 'all' = 'all';
  let showGoals: boolean = true;

  // Load dashboard data
  onMount(async () => {
    await loadDashboardData();
  });

  async function loadDashboardData() {
    try {
      loading = true;
      error = null;

      // Load all data in parallel
      const [summary, games, goals, analytics] = await Promise.all([
        personalGameService.getPersonalStatsSummary(playerId, selectedGameType === 'all' ? undefined : selectedGameType),
        personalGameService.getPersonalStats(playerId, { limit: 20, gameType: selectedGameType === 'all' ? undefined : selectedGameType }),
        personalGameService.getPersonalGoals(playerId),
        personalGameService.getPerformanceAnalytics(playerId, getAnalyticsDays())
      ]);

      statsSummary = summary;
      recentGames = games;
      personalGoals = goals;
      performanceAnalytics = analytics;

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      error = err.message || 'Failed to load statistics';
    } finally {
      loading = false;
    }
  }

  // Get number of days for analytics based on timeframe
  function getAnalyticsDays(): number {
    switch (selectedTimeframe) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  }

  // Handle filter changes
  async function onFilterChange() {
    await loadDashboardData();
  }

  // Format percentage
  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Format score
  function formatScore(value: number): string {
    return value.toFixed(1);
  }

  // Get trend color
  function getTrendColor(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  // Get trend icon
  function getTrendIcon(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }

  // Get game type label
  function getGameTypeLabel(gameType: PersonalGame['game_type']): string {
    const labels = {
      'practice_501': '501 Practice',
      'around_clock': 'Around Clock',
      'cricket': 'Cricket',
      'doubles_practice': 'Doubles',
      'checkout_practice': 'Checkout'
    };
    return labels[gameType] || gameType;
  }

  // Get goal type label
  function getGoalTypeLabel(goalType: PersonalGoal['goal_type']): string {
    const labels = {
      'average_improvement': 'Average Improvement',
      'checkout_percentage': 'Checkout %',
      'consistency': 'Consistency',
      '180_count': '180 Count',
      'custom': 'Custom Goal'
    };
    return labels[goalType] || goalType;
  }

  // Format date
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Get performance level
  function getPerformanceLevel(average: number): { level: string; color: string } {
    if (average >= 60) return { level: 'Elite', color: 'text-purple-400' };
    if (average >= 50) return { level: 'Expert', color: 'text-green-400' };
    if (average >= 40) return { level: 'Advanced', color: 'text-blue-400' };
    if (average >= 30) return { level: 'Intermediate', color: 'text-yellow-400' };
    if (average >= 20) return { level: 'Beginner', color: 'text-orange-400' };
    return { level: 'Learning', color: 'text-gray-400' };
  }

  // Calculate goal progress percentage
  function getGoalProgress(goal: PersonalGoal): number {
    if (goal.target_value === 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  }
</script>

<div class="min-h-screen bg-gray-900 text-white p-4">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-orange-400 mb-2">
      📊 Personal Statistics
    </h1>
    <p class="text-gray-300">
      Track your dart throwing progress and achievements
    </p>
  </div>

  <!-- Filters -->
  <div class="bg-gray-800 rounded-xl p-4 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Timeframe Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Time Period
        </label>
        <select
          bind:value={selectedTimeframe}
          on:change={onFilterChange}
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <!-- Game Type Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Game Type
        </label>
        <select
          bind:value={selectedGameType}
          on:change={onFilterChange}
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="all">All Types</option>
          <option value="practice_501">501 Practice</option>
          <option value="around_clock">Around Clock</option>
          <option value="cricket">Cricket</option>
          <option value="doubles_practice">Doubles Practice</option>
          <option value="checkout_practice">Checkout Practice</option>
        </select>
      </div>
    </div>
  </div>

  {#if loading}
    <!-- Loading State -->
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p class="text-gray-400">Loading your statistics...</p>
    </div>

  {:else if error}
    <!-- Error State -->
    <div class="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center">
      <p class="text-red-300 mb-4">❌ {error}</p>
      <button
        on:click={loadDashboardData}
        class="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition-all"
      >
        Try Again
      </button>
    </div>

  {:else}
    <!-- Statistics Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-orange-400 mb-1">
          {statsSummary.totalGames}
        </div>
        <div class="text-sm text-gray-400">Games Played</div>
      </div>

      <div class="bg-gray-800 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-green-400 mb-1">
          {formatPercentage(statsSummary.winPercentage)}
        </div>
        <div class="text-sm text-gray-400">Win Rate</div>
      </div>

      <div class="bg-gray-800 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-blue-400 mb-1">
          {formatScore(statsSummary.threeDartAverage)}
        </div>
        <div class="text-sm text-gray-400">3-Dart Avg</div>
      </div>

      <div class="bg-gray-800 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-yellow-400 mb-1">
          {statsSummary.total180s}
        </div>
        <div class="text-sm text-gray-400">Total 180s</div>
      </div>
    </div>

    <!-- Performance Overview -->
    <div class="bg-gray-800 rounded-xl p-6 mb-6">
      <h2 class="text-xl font-bold text-orange-400 mb-4">Performance Overview</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Current Level -->
        <div>
          <h3 class="font-semibold mb-3">Current Level</h3>
          <div class="flex items-center gap-3 mb-4">
            <div class="text-3xl">🎯</div>
            <div>
              <div class="font-bold {getPerformanceLevel(statsSummary.threeDartAverage).color} text-lg">
                {getPerformanceLevel(statsSummary.threeDartAverage).level}
              </div>
              <div class="text-sm text-gray-400">
                {formatScore(statsSummary.threeDartAverage)} average
              </div>
            </div>
          </div>

          <!-- Key Stats -->
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-400">Checkout %:</span>
              <span class="text-white font-semibold">{formatPercentage(statsSummary.checkoutPercentage)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Double %:</span>
              <span class="text-white font-semibold">{formatPercentage(statsSummary.doublePercentage)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Highest Checkout:</span>
              <span class="text-white font-semibold">{statsSummary.highestCheckout}</span>
            </div>
          </div>
        </div>

        <!-- Improvement Trend -->
        <div>
          <h3 class="font-semibold mb-3">Progress Trend</h3>
          <div class="text-center p-4 bg-gray-700 rounded-lg">
            <div class="text-4xl mb-2">
              {getTrendIcon(statsSummary.improvement.trend)}
            </div>
            <div class="font-bold {getTrendColor(statsSummary.improvement.trend)} text-lg mb-1">
              {statsSummary.improvement.trend.charAt(0).toUpperCase() + statsSummary.improvement.trend.slice(1)}
            </div>
            <div class="text-sm text-gray-400">
              {statsSummary.improvement.percentage}% change
            </div>
          </div>

          <!-- Recent Form -->
          <div class="mt-4">
            <div class="text-sm text-gray-400 mb-2">Recent Form (Last 10 Games)</div>
            <div class="flex gap-1">
              {#each statsSummary.recentForm as won}
                <div class="w-4 h-4 rounded-full {won ? 'bg-green-500' : 'bg-red-500'}"></div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Personal Goals -->
    {#if showGoals && personalGoals.length > 0}
      <div class="bg-gray-800 rounded-xl p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-orange-400">Personal Goals</h2>
          <button
            on:click={() => showGoals = !showGoals}
            class="text-gray-400 hover:text-white transition-colors"
          >
            {showGoals ? 'Hide' : 'Show'}
          </button>
        </div>

        <div class="space-y-4">
          {#each personalGoals.slice(0, 3) as goal}
            <div class="bg-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium">{goal.description}</span>
                {#if goal.achieved}
                  <span class="text-green-400 text-sm">✅ Achieved</span>
                {:else}
                  <span class="text-gray-400 text-sm">{getGoalProgress(goal)}%</span>
                {/if}
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full bg-gray-600 rounded-full h-2 mb-2">
                <div 
                  class="h-2 rounded-full transition-all duration-500
                         {goal.achieved ? 'bg-green-500' : 'bg-orange-500'}"
                  style="width: {getGoalProgress(goal)}%"
                ></div>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-gray-400">
                  {getGoalTypeLabel(goal.goal_type)}
                </span>
                <span class="text-gray-300">
                  {goal.current_value} / {goal.target_value}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Game Type Performance -->
    {#if performanceAnalytics?.gameTypeSummary && performanceAnalytics.gameTypeSummary.length > 0}
      <div class="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 class="text-xl font-bold text-orange-400 mb-4">Performance by Game Type</h2>
        
        <div class="space-y-3">
          {#each performanceAnalytics.gameTypeSummary as gameType}
            <div class="bg-gray-700 rounded-lg p-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-medium">{getGameTypeLabel(gameType.gameType)}</span>
                  <span class="text-sm text-gray-400 ml-2">
                    ({gameType.games} games)
                  </span>
                </div>
                <div class="text-right">
                  <div class="font-bold {gameType.winRate >= 50 ? 'text-green-400' : 'text-red-400'}">
                    {gameType.winRate}%
                  </div>
                  <div class="text-xs text-gray-400">Win Rate</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Recent Games -->
    <div class="bg-gray-800 rounded-xl p-6">
      <h2 class="text-xl font-bold text-orange-400 mb-4">Recent Games</h2>
      
      {#if recentGames.length === 0}
        <div class="text-center py-8">
          <div class="text-4xl mb-3">🎯</div>
          <p class="text-gray-400 mb-4">No games played yet</p>
          <p class="text-sm text-gray-500">
            Start a practice session to see your statistics here
          </p>
        </div>
      {:else}
        <div class="space-y-3 max-h-96 overflow-y-auto">
          {#each recentGames as game}
            <div class="bg-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <div class="text-lg">
                    {game.game_won ? '✅' : '❌'}
                  </div>
                  <div>
                    <span class="font-medium">{getGameTypeLabel(game.game_type)}</span>
                    <span class="text-sm text-gray-400 ml-2">
                      vs {game.opponent_name}
                    </span>
                  </div>
                </div>
                <div class="text-sm text-gray-400">
                  {formatDate(game.game_date)}
                </div>
              </div>

              <div class="grid grid-cols-4 gap-4 text-sm">
                <div class="text-center">
                  <div class="font-semibold text-white">{formatScore(game.three_dart_average)}</div>
                  <div class="text-gray-400">Average</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-yellow-400">{game.scores_180}</div>
                  <div class="text-gray-400">180s</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-green-400">{formatPercentage(game.checkout_percentage)}</div>
                  <div class="text-gray-400">Checkout</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-blue-400">{game.total_darts}</div>
                  <div class="text-gray-400">Darts</div>
                </div>
              </div>

              {#if game.session_duration_minutes}
                <div class="mt-2 text-xs text-gray-500">
                  Session: {game.session_duration_minutes} minutes
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #374151;
  }

  ::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  /* Prevent zoom on double tap */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Focus states */
  select:focus, button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }
</style>