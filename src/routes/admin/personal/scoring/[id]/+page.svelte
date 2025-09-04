<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ScoringEngine from '$lib/components/scoringEngine.svelte';
  import { personalGameService } from '$lib/services/personalGameService';
  import type { PersonalGame } from '$lib/database/types';
  
  let game: PersonalGame | null = null;
  let loading = true;
  let error = '';
  let gameId: string;
  
  // Mock player data - in real implementation, get from session
  const currentPlayer = {
    id: 'current-user-id',
    name: 'You'
  };
  
  $: gameId = $page.params.id || '';
  
  onMount(async () => {
    if (gameId) {
      await loadGame();
    } else {
      error = 'No game ID provided';
      loading = false;
    }
  });
  
  async function loadGame() {
    try {
      loading = true;
      error = '';
      
      // In real implementation, load game details from personalGameService
      // For now, create mock game data
      game = {
        id: gameId,
        player_id: currentPlayer.id,
        opponent_name: 'Practice Opponent',
        game_date: new Date().toISOString().split('T')[0],
        game_won: false,
        legs_played: 0,
        legs_won: 0,
        created_at: new Date().toISOString()
      };
      
    } catch (err: any) {
      error = err.message || 'Failed to load game';
    } finally {
      loading = false;
    }
  }
  
  async function handleGameComplete(event: CustomEvent) {
    const { winner, homeStats, awayStats } = event.detail;
    
    try {
      const gameWon = winner === 'home';
      const playerStats = gameWon ? homeStats : awayStats;
      
      await personalGameService.completePersonalGame(
        gameId,
        gameWon,
        playerStats.legsPlayed,
        playerStats.legsWon,
        playerStats
      );
      
      // Navigate back to personal games list
      goto('/admin/personal');
      
    } catch (err: any) {
      error = err.message || 'Failed to save game results';
    }
  }
  
  function handleGameExit() {
    goto('/admin/personal');
  }
</script>

<svelte:head>
  <title>Personal Practice Game - Scoring</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p class="text-gray-600">Loading game...</p>
      </div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 class="text-xl font-bold text-gray-900 mb-4">Error Loading Game</h2>
        <p class="text-gray-600 mb-6">{error}</p>
        <button
          on:click={handleGameExit}
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Personal Games
        </button>
      </div>
    </div>
  {:else if game}
    <!-- Header -->
    <div class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-900">Personal Practice Game</h1>
          <p class="text-sm text-gray-500">vs {game.opponent_name}</p>
        </div>
        
        <button
          on:click={handleGameExit}
          class="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Exit Game</span>
        </button>
      </div>
    </div>
    
    <!-- Scoring Engine -->
    <div class="p-4">
      <ScoringEngine
        gameId={gameId}
        homePlayer={currentPlayer}
        awayPlayer={{ id: 'opponent', name: game.opponent_name }}
        gameType="practice"
        on:gameComplete={handleGameComplete}
        on:gameExit={handleGameExit}
      />
    </div>
  {/if}
</div>