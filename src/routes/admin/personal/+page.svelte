<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import PersonalPracticeHub from '$lib/components/PersonalPracticeHub.svelte';
  
  let currentUserId = '';
  let playerName = 'Practice Player';
  
  onMount(async () => {
    // In real implementation, get current user from session data
    // For now, use a placeholder ID
    currentUserId = 'personal-player-001';
    
    // Could also get player name from session if available
    // playerName = $page.data?.session?.user?.user_metadata?.full_name || 'Practice Player';
  });
</script>

<svelte:head>
  <title>Personal Practice - Admin Panel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Personal Practice Games</h1>
        <p class="text-gray-600 mt-1">Track your individual practice sessions</p>
      </div>
      
      <button
        on:click={() => showNewGameModal = true}
        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        New Practice Game
      </button>
    </div>
    
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        {error}
      </div>
    {/if}
    
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-3 text-gray-600">Loading personal game data...</span>
      </div>
    {:else}
      <!-- Statistics Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-sm font-medium text-gray-500">Total Games</h3>
          <p class="text-2xl font-bold text-gray-900">{summary.totalGames}</p>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-sm font-medium text-gray-500">Games Won</h3>
          <p class="text-2xl font-bold text-green-600">{summary.gamesWon}</p>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-sm font-medium text-gray-500">Win Rate</h3>
          <p class="text-2xl font-bold text-blue-600">{summary.winPercentage}%</p>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-sm font-medium text-gray-500">Total 180s</h3>
          <p class="text-2xl font-bold text-orange-600">{summary.total180s}</p>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-sm font-medium text-gray-500">Highest Checkout</h3>
          <p class="text-2xl font-bold text-purple-600">{summary.highestCheckout}</p>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-sm font-medium text-gray-500">Average Score</h3>
          <p class="text-2xl font-bold text-indigo-600">{summary.averageScore}</p>
        </div>
      </div>
      
      <!-- Recent Games -->
      <div class="bg-white rounded-lg shadow mb-8">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Recent Games</h2>
        </div>
        
        {#if games.length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500">No practice games recorded yet</p>
            <button
              on:click={() => showNewGameModal = true}
              class="mt-4 text-blue-600 hover:text-blue-700"
            >
              Start your first practice game
            </button>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opponent
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Legs
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each games as game}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(game.game_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {game.opponent_name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                   {game.game_won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        {game.game_won ? 'Won' : 'Lost'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {game.legs_won}/{game.legs_played}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
      
      <!-- Detailed Statistics -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Game Statistics</h2>
        </div>
        
        {#if stats.length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500">No detailed statistics available yet</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opponent
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    180s
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Highest Checkout
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Double %
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each stats as stat}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(stat.game_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.opponent_name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.scores_180 || 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.highest_checkout || 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_darts > 0 ? Math.round((stat.total_points / stat.total_darts) * 100) / 100 : 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.double_attempts > 0 ? Math.round((stat.double_hits / stat.double_attempts) * 100) : 0}%
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- New Game Modal -->
{#if showNewGameModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Start New Practice Game</h3>
        
        <div class="mb-4">
          <label for="opponent" class="block text-sm font-medium text-gray-700 mb-2">
            Opponent Name
          </label>
          <input
            id="opponent"
            type="text"
            bind:value={opponentName}
            placeholder="Enter opponent name"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            on:click={closeModal}
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            on:click={startNewGame}
            disabled={!opponentName.trim()}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}