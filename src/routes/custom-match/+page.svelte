<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import CustomMatchSetup from '$lib/components/CustomMatchSetup.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { customMatchService } from '$lib/services/customMatchService';
  import type { CustomMatchSetupForm } from '$lib/types/customMatch';
  import type { CustomMatch } from '$lib/database/types';
  
  let view: 'recent' | 'setup' = 'recent';
  let loading = true;
  let creating = false;
  let error = '';
  let recentMatches: CustomMatch[] = [];
  
  onMount(async () => {
    await loadRecentMatches();
  });
  
  async function loadRecentMatches() {
    try {
      loading = true;
      error = '';
      recentMatches = await customMatchService.getRecentMatches(5);
    } catch (err: any) {
      console.error('Error loading recent matches:', err);
      error = err.message || 'Failed to load recent matches';
    } finally {
      loading = false;
    }
  }
  
  async function handleCreateMatch(event: CustomEvent<CustomMatchSetupForm>) {
    try {
      creating = true;
      error = '';
      
      const setup = event.detail;
      
      const matchId = await customMatchService.createMatch({
        match_type: setup.match_type,
        game_format: setup.game_format,
        leg_format: setup.leg_format,
        player1_id: setup.player1.id,
        player1_name: setup.player1.name,
        player1_is_guest: setup.player1.is_guest,
        player2_id: setup.player2.id,
        player2_name: setup.player2.name,
        player2_is_guest: setup.player2.is_guest,
        first_thrower: setup.first_thrower
      });
      
      // Navigate to the match scoring page
      await goto(`/custom-match/${matchId}`);
      
    } catch (err: any) {
      console.error('Error creating match:', err);
      error = err.message || 'Failed to create match';
      creating = false;
    }
  }
  
  function handleSetupCancel() {
    view = 'recent';
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
</script>

<svelte:head>
  <title>Custom Match - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-16">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <button
          on:click={() => goto('/dashboard')}
          class="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back to dashboard"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-bold text-gray-900">Custom Matches</h1>
      </div>
      
      {#if view === 'recent'}
        <Button
          variant="primary"
          on:click={() => view = 'setup'}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Match
        </Button>
      {/if}
    </div>
  </header>

  <main class="px-4 py-6">
    {#if view === 'setup'}
      <CustomMatchSetup
        on:create={handleCreateMatch}
        on:cancel={handleSetupCancel}
      />
      
      {#if creating}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 flex items-center space-x-4">
            <LoadingSpinner />
            <span class="text-gray-900">Creating match...</span>
          </div>
        </div>
      {/if}
      
    {:else}
      <!-- Recent Matches View -->
      <div class="max-w-4xl mx-auto space-y-6">
        
        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex items-center">
              <div class="text-red-400 mr-3">⚠️</div>
              <p class="text-sm text-red-800">{error}</p>
            </div>
          </div>
        {/if}
        
        <!-- Welcome Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="text-center">
            <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Custom Matches</h2>
            <p class="text-gray-600 mb-6">
              Play practice or competitive matches with team members or guests. 
              All statistics are tracked separately from league games.
            </p>
            
            <Button
              variant="primary"
              size="lg"
              on:click={() => view = 'setup'}
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start New Match
            </Button>
          </div>
        </div>
        
        <!-- Recent Matches -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Matches</h3>
          
          {#if loading}
            <div class="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span class="ml-3 text-gray-600">Loading recent matches...</span>
            </div>
          {:else if recentMatches.length === 0}
            <Card>
              <div class="text-center py-8">
                <div class="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 class="text-lg font-medium text-gray-900 mb-2">No matches yet</h4>
                <p class="text-gray-500 mb-4">Start your first custom match to see it here</p>
                <Button
                  variant="primary"
                  on:click={() => view = 'setup'}
                >
                  Create First Match
                </Button>
              </div>
            </Card>
          {:else}
            <div class="space-y-4">
              {#each recentMatches as match}
                <Card class="hover:shadow-md transition-shadow cursor-pointer">
                  <a 
                    href="/custom-match/{match.id}"
                    class="block p-6"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                          <h4 class="text-lg font-semibold text-gray-900">
                            {match.player1_name} vs {match.player2_name}
                          </h4>
                          
                          {#if match.completed}
                            {#if match.winner}
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completed
                              </span>
                            {:else}
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Finished
                              </span>
                            {/if}
                          {:else}
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              In Progress
                            </span>
                          {/if}
                          
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {match.match_type === 'practice' ? 'Practice' : 'Competitive'}
                          </span>
                        </div>
                        
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{match.game_format} • {formatLegFormat(match.leg_format)}</span>
                          <span>{formatDate(match.created_at)}</span>
                          {#if match.completed && match.winner}
                            <span class="text-green-600 font-medium">
                              Winner: {match.winner === 1 ? match.player1_name : match.player2_name}
                            </span>
                          {/if}
                        </div>
                        
                        {#if match.total_legs_played > 0}
                          <div class="mt-2 text-sm text-gray-600">
                            Score: {match.legs_won_player1} - {match.legs_won_player2}
                          </div>
                        {/if}
                      </div>
                      
                      <div class="text-right">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </a>
                </Card>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Help Section -->
        <div class="bg-blue-50 rounded-lg p-6">
          <h3 class="text-lg font-medium text-blue-900 mb-2">About Custom Matches</h3>
          <div class="text-sm text-blue-800 space-y-2">
            <p>• <strong>Practice matches:</strong> Casual games for training and improvement</p>
            <p>• <strong>Competitive matches:</strong> Serious games with full statistical tracking</p>
            <p>• <strong>Guest players:</strong> Add temporary players who aren't on the team roster</p>
            <p>• <strong>Multiple formats:</strong> Support for 301, 501, and 701 with various leg formats</p>
            <p>• <strong>Separate statistics:</strong> Custom match data is kept separate from league statistics</p>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>