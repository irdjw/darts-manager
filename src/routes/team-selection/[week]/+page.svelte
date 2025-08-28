// src/routes/team-selection/[week]/+page.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { teamStore, currentSelection, allPlayers } from '$lib/stores/teamManagement';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import type { Player, TeamSelection } from '$lib/types/dashboard';
  
  let weekNumber: number;
  let loading = true;
  let error: string | null = null;
  let selection: TeamSelection | null = null;
  
  $: weekNumber = parseInt($page.params.week || '1');
  
  onMount(async () => {
    try {
      await teamStore.loadPlayers();
      selection = await teamStore.generateTeamSelection(weekNumber);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load team selection';
    } finally {
      loading = false;
    }
  });
  
  function togglePlayerSelection(player: Player) {
    if (!selection) return;
    
    const isSelected = selection.selected_players.some(p => p.id === player.id);
    
    if (isSelected) {
      // Remove from selection if not auto-selected
      const isAutoSelected = selection.auto_selected.some(p => p.id === player.id);
      if (!isAutoSelected) {
        selection.selected_players = selection.selected_players.filter(p => p.id !== player.id);
        selection.captain_picks = selection.captain_picks.filter(p => p.id !== player.id);
      }
    } else if (selection.selected_players.length < 7) {
      // Add to selection
      selection.selected_players = [...selection.selected_players, player];
      selection.captain_picks = [...selection.captain_picks, player];
    }
    
    // Trigger reactivity
    selection = selection;
  }
  
  async function saveTeamSelection() {
    if (!selection) return;
    
    loading = true;
    try {
      // Save team selection logic here
      console.log('Saving team selection:', selection);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save team selection';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Team Selection - Week {weekNumber}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Team Selection</h1>
        <p class="text-sm text-gray-500">Week {weekNumber}</p>
      </div>
      
      {#if selection && selection.selected_players.length === 7}
        <button
          on:click={saveTeamSelection}
          disabled={loading}
          class="btn-primary px-4 py-2 text-sm font-medium rounded-lg min-h-[44px] 
                 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          {loading ? 'Saving...' : 'Confirm Team'}
        </button>
      {/if}
    </div>
  </header>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
      </div>
    {/if}
    
    {#if loading}
      <LoadingSpinner message="Loading team selection..." />
    {:else if selection}
      <!-- Selection Summary -->
      <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Team Summary</h2>
          <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {selection.selected_players.length}/7 Selected
          </span>
        </div>
        
        <!-- Selection progress -->
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style="width: {(selection.selected_players.length / 7) * 100}%"
          ></div>
        </div>
        
        <!-- Auto-selected players notice -->
        {#if selection.auto_selected.length > 0}
          <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p class="text-green-800 text-sm">
              <strong>{selection.auto_selected.length} players</strong> automatically selected (previous winners)
            </p>
          </div>
        {/if}
        
        <!-- Selected players list -->
        {#if selection.selected_players.length > 0}
          <div class="space-y-2">
            <h3 class="font-medium text-gray-900">Selected Players:</h3>
            <div class="flex flex-wrap gap-2">
              {#each selection.selected_players as player}
                <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <span>{player.name}</span>
                  {#if selection.auto_selected.some(p => p.id === player.id)}
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Available Players -->
      <section class="mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Players</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each selection.available_players as player}
            {@const isSelected = selection.selected_players.some(p => p.id === player.id)}
            {@const isAutoSelected = selection.auto_selected.some(p => p.id === player.id)}
            {@const canSelect = !isSelected && selection.selected_players.length < 7}
            {@const canDeselect = isSelected && !isAutoSelected}
            
            <PlayerCard
              {player}
              {isSelected}
              disabled={!canSelect && !canDeselect}
              autoSelected={isAutoSelected}
              on:click={() => togglePlayerSelection(player)}
            />
          {/each}
        </div>
      </section>
      
      <!-- Unavailable Players -->
      {#if selection.unavailable_players.length > 0}
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Unavailable Players</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each selection.unavailable_players as player}
              <PlayerCard
                {player}
                isSelected={false}
                disabled={true}
                unavailable={true}
              />
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>