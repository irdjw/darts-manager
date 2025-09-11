<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import ScoringEngine from '$lib/components/scoringEngine.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { customMatchService } from '$lib/services/customMatchService';
  import type { CustomMatch, CustomGameStatistics } from '$lib/database/types';
  
  $: matchId = $page.params.id;
  
  let match: CustomMatch | null = null;
  let statistics: CustomGameStatistics[] = [];
  let loading = true;
  let error = '';
  let view: 'playing' | 'results' = 'playing';
  
  onMount(async () => {
    if (matchId) {
      await loadMatch();
    }
  });
  
  async function loadMatch() {
    try {
      loading = true;
      error = '';
      
      const summary = await customMatchService.getMatchSummary(matchId);
      if (!summary) {
        error = 'Match not found';
        return;
      }
      
      match = summary.match;
      statistics = [...summary.player1_stats, ...summary.player2_stats];
      
      // If match is completed, show results
      if (match.completed) {
        view = 'results';
      }
      
    } catch (err: any) {
      console.error('Error loading match:', err);
      error = err.message || 'Failed to load match';
    } finally {
      loading = false;
    }
  }
  
  function handleMatchComplete() {
    view = 'results';
    loadMatch(); // Reload to get final statistics
  }
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function formatLegFormat(legFormat: string): string {
    switch (legFormat) {
      case 'single': return 'Single Leg';
      case 'best_of_3': return 'Best of 3';
      case 'best_of_5': return 'Best of 5';
      case 'best_of_7': return 'Best of 7';
      default: return legFormat;
    }
  }
  
  function getPlayerStats(playerNumber: 1 | 2): CustomGameStatistics[] {
    return statistics.filter(s => s.player_number === playerNumber);
  }
  
  function calculateOverallStats(playerStats: CustomGameStatistics[]) {
    if (playerStats.length === 0) return null;
    
    const totalDarts = playerStats.reduce((sum, s) => sum + s.total_darts, 0);
    const total180s = playerStats.reduce((sum, s) => sum + s.total_180s, 0);
    const totalCheckoutAttempts = playerStats.reduce((sum, s) => sum + s.checkout_attempts, 0);
    const totalCheckoutHits = playerStats.reduce((sum, s) => sum + s.checkout_hits, 0);
    const highestScore = Math.max(...playerStats.map(s => s.highest_score), 0);
    const highestCheckout = Math.max(...playerStats.map(s => s.highest_checkout), 0);
    
    // Weighted average based on darts thrown
    const weightedAverage = playerStats.reduce((sum, s) => sum + (s.three_dart_average * s.total_darts), 0) / totalDarts;
    
    return {
      average: Math.round(weightedAverage * 100) / 100,
      total180s,
      highestScore,
      highestCheckout,
      checkoutPercentage: totalCheckoutAttempts > 0 ? Math.round((totalCheckoutHits / totalCheckoutAttempts) * 100) : 0,
      totalDarts,
      legsWon: playerStats.filter(s => s.leg_won).length
    };
  }
</script>

<svelte:head>
  <title>{match ? `${match.player1_name} vs ${match.player2_name}` : 'Custom Match'} - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <LoadingSpinner />
      <span class="ml-3 text-gray-600">Loading match...</span>
    </div>
  {:else if error}
    <div class="px-4 py-8">
      <div class="max-w-md mx-auto bg-red-50 border border-red-200 rounded-md p-6">
        <div class="flex items-center mb-4">
          <div class="text-red-400 mr-3">⚠️</div>
          <h2 class="text-lg font-semibold text-red-900">Error</h2>
        </div>
        <p class="text-sm text-red-800 mb-4">{error}</p>
        <Button
          variant="primary"
          on:click={() => goto('/custom-match')}
        >
          Back to Custom Matches
        </Button>
      </div>
    </div>
  {:else if match}
    {#if view === 'playing'}
      <!-- Playing View - Use ScoringEngine -->
      <ScoringEngine
        gameType="custom"
        customMatch={match}
        on:matchComplete={handleMatchComplete}
      />
    {:else}
      <!-- Results View -->
      <div class="px-4 py-6 pb-16">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <button
              on:click={() => goto('/custom-match')}
              class="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Back to custom matches"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 class="text-lg font-bold text-gray-900">Match Results</h1>
          </div>
          
          <div class="flex space-x-2">
            {#if !match.completed}
              <Button
                variant="secondary"
                on:click={() => view = 'playing'}
              >
                Resume Match
              </Button>
            {/if}
          </div>
        </div>
        
        <div class="max-w-4xl mx-auto space-y-6">
          <!-- Match Summary -->
          <Card>
            <div class="p-6">
              <div class="text-center mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">
                  {match.player1_name} vs {match.player2_name}
                </h2>
                
                <div class="flex items-center justify-center space-x-4 mb-4">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {match.match_type === 'practice' ? 'Practice' : 'Competitive'}
                  </span>
                  <span class="text-gray-500">{match.game_format}</span>
                  <span class="text-gray-500">{formatLegFormat(match.leg_format)}</span>
                </div>
                
                <p class="text-sm text-gray-500">{formatDate(match.created_at)}</p>
              </div>
              
              <!-- Final Score -->
              <div class="flex items-center justify-center space-x-8 mb-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900 mb-1">
                    {match.legs_won_player1}
                  </div>
                  <div class="text-sm text-gray-500">{match.player1_name}</div>
                  {#if match.player1_is_guest}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      Guest
                    </span>
                  {/if}
                </div>
                
                <div class="text-2xl font-bold text-gray-400">-</div>
                
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900 mb-1">
                    {match.legs_won_player2}
                  </div>
                  <div class="text-sm text-gray-500">{match.player2_name}</div>
                  {#if match.player2_is_guest}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      Guest
                    </span>
                  {/if}
                </div>
              </div>
              
              {#if match.completed && match.winner}
                <div class="text-center">
                  <div class="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    Winner: {match.winner === 1 ? match.player1_name : match.player2_name}
                  </div>
                </div>
              {/if}
            </div>
          </Card>
          
          <!-- Statistics Comparison -->
          {#if statistics.length > 0}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Player 1 Stats -->
              <Card>
                <div class="p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">
                    {match.player1_name} Statistics
                  </h3>
                  
                  {#if getPlayerStats(1).length > 0}
                    {@const player1Stats = calculateOverallStats(getPlayerStats(1))}
                    {#if player1Stats}
                      <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                          <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{player1Stats.average}</div>
                            <div class="text-sm text-gray-500">Average</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{player1Stats.total180s}</div>
                            <div class="text-sm text-gray-500">180s</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-orange-600">{player1Stats.highestScore}</div>
                            <div class="text-sm text-gray-500">High Score</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">{player1Stats.checkoutPercentage}%</div>
                            <div class="text-sm text-gray-500">Checkout</div>
                          </div>
                        </div>
                        
                        {#if player1Stats.highestCheckout > 0}
                          <div class="text-center border-t pt-4">
                            <div class="text-lg font-semibold text-gray-900">{player1Stats.highestCheckout}</div>
                            <div class="text-sm text-gray-500">Highest Checkout</div>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  {:else}
                    <p class="text-gray-500 text-center">No statistics available</p>
                  {/if}
                </div>
              </Card>
              
              <!-- Player 2 Stats -->
              <Card>
                <div class="p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">
                    {match.player2_name} Statistics
                  </h3>
                  
                  {#if getPlayerStats(2).length > 0}
                    {@const player2Stats = calculateOverallStats(getPlayerStats(2))}
                    {#if player2Stats}
                      <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                          <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{player2Stats.average}</div>
                            <div class="text-sm text-gray-500">Average</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{player2Stats.total180s}</div>
                            <div class="text-sm text-gray-500">180s</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-orange-600">{player2Stats.highestScore}</div>
                            <div class="text-sm text-gray-500">High Score</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">{player2Stats.checkoutPercentage}%</div>
                            <div class="text-sm text-gray-500">Checkout</div>
                          </div>
                        </div>
                        
                        {#if player2Stats.highestCheckout > 0}
                          <div class="text-center border-t pt-4">
                            <div class="text-lg font-semibold text-gray-900">{player2Stats.highestCheckout}</div>
                            <div class="text-sm text-gray-500">Highest Checkout</div>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  {:else}
                    <p class="text-gray-500 text-center">No statistics available</p>
                  {/if}
                </div>
              </Card>
            </div>
          {/if}
          
          <!-- Actions -->
          <div class="flex justify-center space-x-4">
            <Button
              variant="secondary"
              on:click={() => goto('/custom-match')}
            >
              Back to Matches
            </Button>
            
            <Button
              variant="primary"
              on:click={() => goto('/custom-match')}
            >
              New Match
            </Button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>