<!-- PersonalPracticeHub.svelte - Complete personal practice system hub -->
<script lang="ts">
  import { onMount } from 'svelte';
  import PersonalStatsTracker from './PersonalStatsTracker.svelte';
  import PersonalStatsDashboard from './PersonalStatsDashboard.svelte';
  import PersonalGoalTracker from './PersonalGoalTracker.svelte';
  import { personalGameService } from '../services/personalGameService';
  import type { PersonalStats, PersonalGame } from '../database/types';

  // Props
  export let playerId: string = 'personal-player-001';
  export let playerName: string = 'Practice Player';

  // Navigation state
  let currentView: 'dashboard' | 'practice' | 'goals' | 'history' = 'dashboard';
  let quickStats: any = null;
  let isSessionActive: boolean = false;

  // Navigation items
  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: '📊', 
      description: 'View your statistics and progress' 
    },
    { 
      id: 'practice', 
      label: 'Practice', 
      icon: '🎯', 
      description: 'Start a new practice session' 
    },
    { 
      id: 'goals', 
      label: 'Goals', 
      icon: '🏆', 
      description: 'Set and track your goals' 
    },
    { 
      id: 'history', 
      label: 'History', 
      icon: '📈', 
      description: 'View game history and trends' 
    }
  ];

  onMount(async () => {
    await loadQuickStats();
  });

  async function loadQuickStats() {
    try {
      quickStats = await personalGameService.getPersonalStatsSummary(playerId);
    } catch (error) {
      console.error('Failed to load quick stats:', error);
      quickStats = {
        totalGames: 0,
        gamesWon: 0,
        winPercentage: 0,
        threeDartAverage: 0,
        total180s: 0,
        improvement: { trend: 'stable', percentage: 0 }
      };
    }
  }

  function handleSessionComplete(stats: PersonalStats) {
    // Session completed, refresh stats and go to dashboard
    loadQuickStats();
    currentView = 'dashboard';
    isSessionActive = false;
    
    // Show completion message
    showSessionComplete(stats);
  }

  function showSessionComplete(stats: PersonalStats) {
    // Simple completion feedback (could be enhanced with a modal)
    const message = stats.game_won 
      ? `🎉 Great session! ${stats.three_dart_average.toFixed(1)} average with ${stats.total_darts} darts thrown.`
      : `Good practice! ${stats.three_dart_average.toFixed(1)} average with ${stats.total_darts} darts thrown.`;
    
    // Could implement a more sophisticated notification system
    alert(message);
  }

  function startQuickPractice(gameType: PersonalGame['game_type']) {
    currentView = 'practice';
    isSessionActive = true;
  }

  // Get trend icon for improvement
  function getTrendIcon(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }

  // Get trend color
  function getTrendColor(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }
</script>

<div class="min-h-screen bg-gray-900 text-white">
  {#if currentView === 'practice' && isSessionActive}
    <!-- Full-screen practice session -->
    <PersonalStatsTracker 
      {playerId}
      {playerName}
      onSessionComplete={handleSessionComplete}
    />
  {:else}
    <!-- Main Hub Interface -->
    
    <!-- Header with Quick Stats -->
    <div class="bg-gradient-to-r from-orange-600 to-red-600 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">
            🎯 Personal Practice
          </h1>
          <p class="text-orange-100">
            Welcome back, {playerName}!
          </p>
        </div>
        
        {#if quickStats}
          <div class="text-right">
            <div class="text-2xl font-bold text-white">
              {quickStats.threeDartAverage.toFixed(1)}
            </div>
            <div class="text-sm text-orange-100">
              3-Dart Average
            </div>
          </div>
        {/if}
      </div>

      {#if quickStats}
        <!-- Quick Stats Row -->
        <div class="grid grid-cols-4 gap-3 text-center">
          <div class="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div class="text-lg font-bold text-white">{quickStats.totalGames}</div>
            <div class="text-xs text-orange-100">Games</div>
          </div>
          <div class="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div class="text-lg font-bold text-white">{quickStats.winPercentage}%</div>
            <div class="text-xs text-orange-100">Win Rate</div>
          </div>
          <div class="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div class="text-lg font-bold text-white">{quickStats.total180s}</div>
            <div class="text-xs text-orange-100">180s</div>
          </div>
          <div class="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div class="text-lg font-bold {getTrendColor(quickStats.improvement?.trend || 'stable')}">
              {getTrendIcon(quickStats.improvement?.trend || 'stable')}
            </div>
            <div class="text-xs text-orange-100">Trend</div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-gray-800 shadow-lg">
      <div class="flex overflow-x-auto">
        {#each navItems as item}
          <button
            on:click={() => currentView = item.id}
            class="flex-1 min-w-0 p-4 text-center transition-all duration-200
                   {currentView === item.id 
                     ? 'bg-orange-500 text-white border-b-2 border-orange-300' 
                     : 'text-gray-300 hover:text-white hover:bg-gray-700'}"
            style="touch-action: manipulation;"
          >
            <div class="text-xl mb-1">{item.icon}</div>
            <div class="font-medium text-sm">{item.label}</div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1">
      {#if currentView === 'dashboard'}
        <!-- Dashboard View -->
        <PersonalStatsDashboard {playerId} {playerName} />

      {:else if currentView === 'practice'}
        <!-- Practice Selection -->
        <div class="p-6">
          <h2 class="text-2xl font-bold text-orange-400 mb-6">
            Choose Practice Type
          </h2>

          <!-- Quick Start Options -->
          <div class="grid gap-4 mb-8">
            <button
              on:click={() => startQuickPractice('practice_501')}
              class="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 text-left transition-all active:scale-95"
              style="touch-action: manipulation;"
            >
              <div class="flex items-center gap-4">
                <div class="text-4xl">🎯</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-white mb-1">501 Practice</h3>
                  <p class="text-gray-400 text-sm">Standard 501 game for general improvement</p>
                </div>
                <div class="text-orange-400">→</div>
              </div>
            </button>

            <button
              on:click={() => startQuickPractice('doubles_practice')}
              class="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 text-left transition-all active:scale-95"
              style="touch-action: manipulation;"
            >
              <div class="flex items-center gap-4">
                <div class="text-4xl">🎪</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-white mb-1">Doubles Practice</h3>
                  <p class="text-gray-400 text-sm">Focus on improving your doubles accuracy</p>
                </div>
                <div class="text-orange-400">→</div>
              </div>
            </button>

            <button
              on:click={() => startQuickPractice('checkout_practice')}
              class="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 text-left transition-all active:scale-95"
              style="touch-action: manipulation;"
            >
              <div class="flex items-center gap-4">
                <div class="text-4xl">🏁</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-white mb-1">Checkout Practice</h3>
                  <p class="text-gray-400 text-sm">Practice finishing from common positions</p>
                </div>
                <div class="text-orange-400">→</div>
              </div>
            </button>

            <button
              on:click={() => startQuickPractice('around_clock')}
              class="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 text-left transition-all active:scale-95"
              style="touch-action: manipulation;"
            >
              <div class="flex items-center gap-4">
                <div class="text-4xl">🕐</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-white mb-1">Around the Clock</h3>
                  <p class="text-gray-400 text-sm">Hit numbers 1-20 in sequence for accuracy</p>
                </div>
                <div class="text-orange-400">→</div>
              </div>
            </button>

            <button
              on:click={() => startQuickPractice('cricket')}
              class="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 text-left transition-all active:scale-95"
              style="touch-action: manipulation;"
            >
              <div class="flex items-center gap-4">
                <div class="text-4xl">🦗</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-white mb-1">Cricket Practice</h3>
                  <p class="text-gray-400 text-sm">Practice hitting cricket numbers (20,19,18,17,16,15,Bull)</p>
                </div>
                <div class="text-orange-400">→</div>
              </div>
            </button>
          </div>

          <!-- Practice Tips -->
          <div class="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4">
            <h4 class="font-semibold text-blue-300 mb-2">💡 Practice Tips</h4>
            <ul class="text-sm text-blue-200 space-y-1">
              <li>• Start each session with a specific goal in mind</li>
              <li>• Focus on consistency rather than just high scores</li>
              <li>• Take breaks between intensive practice sessions</li>
              <li>• Review your statistics to identify areas for improvement</li>
            </ul>
          </div>
        </div>

      {:else if currentView === 'goals'}
        <!-- Goals View -->
        <PersonalGoalTracker {playerId} {playerName} />

      {:else if currentView === 'history'}
        <!-- History View (simplified for now) -->
        <div class="p-6">
          <h2 class="text-2xl font-bold text-orange-400 mb-6">
            Game History & Trends
          </h2>
          
          <div class="bg-gray-800 rounded-xl p-6 text-center">
            <div class="text-4xl mb-3">📈</div>
            <h3 class="font-bold text-lg text-white mb-2">Detailed History Coming Soon</h3>
            <p class="text-gray-400 mb-4">
              Advanced charts and trend analysis will be available in the next update.
            </p>
            <p class="text-sm text-gray-500">
              For now, check your dashboard for recent game summaries and performance trends.
            </p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Prevent zoom on double tap */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* Smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Focus states */
  button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }

  /* Custom scrollbar for navigation */
  .overflow-x-auto::-webkit-scrollbar {
    height: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-track {
    background: #374151;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 1.5px;
  }
</style>