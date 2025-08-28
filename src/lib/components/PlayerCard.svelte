// src/lib/components/PlayerCard.svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Player } from '$lib/types/dashboard';
  
  export let player: Player;
  export let isSelected: boolean = false;
  export let disabled: boolean = false;
  export let autoSelected: boolean = false;
  export let unavailable: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  $: cardClasses = [
    'card bg-white p-4 rounded-lg shadow-lg border-2 transition-all duration-200 touch-manipulation',
    isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300',
    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl transform hover:-translate-y-1',
    unavailable ? 'bg-gray-50' : ''
  ].filter(Boolean).join(' ');
  
  function handleClick() {
    if (!disabled) {
      dispatch('click');
    }
  }
</script>

<div class={cardClasses} on:click={handleClick} on:keydown={(e) => e.key === 'Enter' && handleClick()} tabindex={disabled ? -1 : 0}>
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span class="text-blue-600 font-semibold text-sm">
          {player.name.charAt(0)}
        </span>
      </div>
      <div>
        <h3 class="font-medium text-gray-900">{player.name}</h3>
        {#if unavailable}
          <p class="text-sm text-gray-500">Unavailable</p>
        {:else if player.drop_week}
          <p class="text-sm text-red-500">Must sit out</p>
        {:else}
          <p class="text-sm text-gray-500">{player.win_percentage}% win rate</p>
        {/if}
      </div>
    </div>
    
    <!-- Selection indicator -->
    {#if isSelected}
      <div class="flex items-center space-x-2">
        {#if autoSelected}
          <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Auto</span>
        {/if}
        <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    {:else if !unavailable && !disabled}
      <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
    {/if}
  </div>
  
  <!-- Player stats -->
  <div class="grid grid-cols-3 gap-4 text-sm">
    <div class="text-center">
      <p class="text-gray-500">Games</p>
      <p class="font-medium text-gray-900">{player.games_played}</p>
    </div>
    <div class="text-center">
      <p class="text-gray-500">Won</p>
      <p class="font-medium text-green-600">{player.games_won}</p>
    </div>
    <div class="text-center">
      <p class="text-gray-500">180s</p>
      <p class="font-medium text-blue-600">{player.total_180s}</p>
    </div>
  </div>
  
  <!-- Recent form indicator -->
  {#if player.consecutive_losses > 0}
    <div class="mt-3 pt-3 border-t border-gray-200">
      <p class="text-xs text-red-500">
        {player.consecutive_losses} consecutive loss{player.consecutive_losses > 1 ? 'es' : ''}
      </p>
    </div>
  {:else if player.last_result === 'win'}
    <div class="mt-3 pt-3 border-t border-gray-200">
      <p class="text-xs text-green-500">Won last game</p>
    </div>
  {/if}
</div>