<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let player: any;
  export let isSelected: boolean = false;
  export let disabled: boolean = false;
  export let autoSelected: boolean = false;
  export let unavailable: boolean = false;
  export let currentWeek: number = 1; // Pass current week from parent component
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    if (!disabled) {
      dispatch('click');
    }
  }
  
  // Calculate weeks since last played
  function getWeeksSinceLastPlayed(): string {
    if (!player.last_game_week) {
      return 'Never';
    }
    const weeksSince = currentWeek - player.last_game_week;
    return weeksSince <= 0 ? '0' : weeksSince.toString();
  }
</script>

<button 
  class="w-full text-left bg-white p-4 rounded-lg shadow-lg border-2 transition-all duration-200 
         {isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
         {disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
         {unavailable ? 'bg-gray-50' : ''}"
  on:click={handleClick}
  {disabled}
  type="button"
>
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
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
          <p class="text-sm text-gray-500">{player.win_percentage || 0}% win rate</p>
        {/if}
      </div>
    </div>
    
    {#if isSelected}
      <div class="flex items-center space-x-2">
        {#if autoSelected}
          <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Auto</span>
        {/if}
        <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          ✓
        </div>
      </div>
    {:else if !unavailable && !disabled}
      <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
    {/if}
  </div>
  
  <div class="grid grid-cols-2 gap-3 text-sm mb-3">
    <div class="text-center">
      <p class="text-gray-500">Weeks Attended</p>
      <p class="font-medium text-blue-600">{player.weeks_attended || 0}</p>
    </div>
    <div class="text-center">
      <p class="text-gray-500">Games Won/Lost</p>
      <p class="font-medium text-gray-900">{player.games_won || 0}/{player.games_lost || 0}</p>
    </div>
  </div>
  
  <div class="grid grid-cols-2 gap-3 text-sm">
    <div class="text-center">
      <p class="text-gray-500">Weeks Since Played</p>
      <p class="font-medium text-orange-600">
        {getWeeksSinceLastPlayed()}
      </p>
    </div>
    <div class="text-center">
      <p class="text-gray-500">Win Rate</p>
      <p class="font-medium text-green-600">{player.win_percentage || 0}%</p>
    </div>
  </div>
</button>
