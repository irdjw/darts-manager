<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import GuestPlayerForm from './GuestPlayerForm.svelte';
  import type { 
    CustomMatchSetupForm, 
    MatchType, 
    GameFormat, 
    LegFormat,
    CustomMatchPlayer 
  } from '$lib/types/customMatch';
  import type { Player } from '$lib/database/types';
  import { PlayersService } from '$lib/database/services/players';
  
  const dispatch = createEventDispatcher<{
    create: CustomMatchSetupForm;
    cancel: void;
  }>();
  
  // Form data
  let matchType: MatchType = 'practice';
  let gameFormat: GameFormat = 501;
  let legFormat: LegFormat = 'best_of_3';
  let firstThrower: 1 | 2 = 1;
  let player1: CustomMatchPlayer = { name: '', is_guest: false };
  let player2: CustomMatchPlayer = { name: '', is_guest: false };
  
  // State
  let players: Player[] = [];
  let loading = true;
  let submitting = false;
  let showGuestForm = false;
  let guestFormFor: 1 | 2 = 1;
  let errors: { [key: string]: string } = {};
  
  // Available options
  const matchTypes: { value: MatchType; label: string }[] = [
    { value: 'practice', label: 'Practice' },
    { value: 'competitive', label: 'Competitive' }
  ];
  
  const gameFormats: { value: GameFormat; label: string }[] = [
    { value: 301, label: '301' },
    { value: 501, label: '501' },
    { value: 701, label: '701' }
  ];
  
  const legFormats: { value: LegFormat; label: string }[] = [
    { value: 'single', label: 'Single Leg' },
    { value: 'best_of_3', label: 'Best of 3' },
    { value: 'best_of_5', label: 'Best of 5' },
    { value: 'best_of_7', label: 'Best of 7' }
  ];
  
  onMount(async () => {
    await loadPlayers();
  });
  
  async function loadPlayers() {
    try {
      const response = await PlayersService.getAll();
      if (response.error) {
        console.error('Error loading players:', response.error);
        errors.general = response.error;
      } else {
        players = response.data || [];
      }
    } catch (err: any) {
      console.error('Load players error:', err);
      errors.general = 'Failed to load players';
    } finally {
      loading = false;
    }
  }
  
  function validateForm(): { [key: string]: string } {
    const newErrors: { [key: string]: string } = {};
    
    if (!player1.name.trim()) {
      newErrors.player1 = 'Player 1 is required';
    }
    
    if (!player2.name.trim()) {
      newErrors.player2 = 'Player 2 is required';
    }
    
    if (player1.name.trim() && player2.name.trim()) {
      if (player1.name.toLowerCase().trim() === player2.name.toLowerCase().trim()) {
        newErrors.general = 'Players must be different';
      }
    }
    
    return newErrors;
  }
  
  function handlePlayerSelect(playerNum: 1 | 2, event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (value === 'guest') {
      guestFormFor = playerNum;
      showGuestForm = true;
      console.log('Opening guest form for player', playerNum);
      // Reset the dropdown
      target.value = '';
      return;
    }
    
    const selectedPlayer = players.find(p => p.id === value);
    if (selectedPlayer) {
      if (playerNum === 1) {
        player1 = { 
          id: selectedPlayer.id, 
          name: selectedPlayer.name, 
          is_guest: false 
        };
      } else {
        player2 = { 
          id: selectedPlayer.id, 
          name: selectedPlayer.name, 
          is_guest: false 
        };
      }
    } else if (value === '') {
      if (playerNum === 1) {
        player1 = { name: '', is_guest: false };
      } else {
        player2 = { name: '', is_guest: false };
      }
    }
  }
  
  function handleGuestPlayerAdd(event: CustomEvent<CustomMatchPlayer>) {
    const guestPlayer = event.detail;
    console.log('Adding guest player:', guestPlayer, 'for player', guestFormFor);
    
    if (guestFormFor === 1) {
      player1 = guestPlayer;
    } else {
      player2 = guestPlayer;
    }
    
    showGuestForm = false;
  }
  
  function handleGuestPlayerCancel() {
    showGuestForm = false;
  }
  
  function clearPlayer(playerNum: 1 | 2) {
    if (playerNum === 1) {
      player1 = { name: '', is_guest: false };
    } else {
      player2 = { name: '', is_guest: false };
    }
  }
  
  async function handleSubmit() {
    errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    submitting = true;
    
    try {
      const formData: CustomMatchSetupForm = {
        match_type: matchType,
        game_format: gameFormat,
        leg_format: legFormat,
        player1,
        player2,
        first_thrower: firstThrower
      };
      
      dispatch('create', formData);
    } catch (err: any) {
      console.error('Submit error:', err);
      errors.general = 'Failed to create match';
      submitting = false;
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-gray-900">Setup Custom Match</h2>
    <button
      on:click={handleCancel}
      class="text-gray-400 hover:text-gray-600 transition-colors"
      aria-label="Close"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
  
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      <span class="ml-3 text-gray-600">Loading players...</span>
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      {#if errors.general}
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex items-center">
            <div class="text-red-400 mr-3">⚠️</div>
            <p class="text-sm text-red-800">{errors.general}</p>
          </div>
        </div>
      {/if}
      
      <!-- Match Configuration -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Match Type -->
        <div>
          <label for="match-type" class="block text-sm font-medium text-gray-700 mb-2">
            Match Type
          </label>
          <select
            id="match-type"
            bind:value={matchType}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {#each matchTypes as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
          <p class="mt-1 text-sm text-gray-500">
            {matchType === 'practice' ? 'Casual practice session' : 'Competitive match with full statistics'}
          </p>
        </div>
        
        <!-- Game Format -->
        <div>
          <label for="game-format" class="block text-sm font-medium text-gray-700 mb-2">
            Game Format
          </label>
          <select
            id="game-format"
            bind:value={gameFormat}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {#each gameFormats as format}
              <option value={format.value}>{format.label}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Leg Format -->
        <div>
          <label for="leg-format" class="block text-sm font-medium text-gray-700 mb-2">
            Leg Format
          </label>
          <select
            id="leg-format"
            bind:value={legFormat}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {#each legFormats as format}
              <option value={format.value}>{format.label}</option>
            {/each}
          </select>
        </div>
        
        <!-- First Thrower -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            First Thrower
          </label>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input
                type="radio"
                bind:group={firstThrower}
                value={1}
                class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">Player 1</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                bind:group={firstThrower}
                value={2}
                class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">Player 2</span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- Player Selection -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Player Selection</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Player 1 -->
          <div>
            <label for="player1" class="block text-sm font-medium text-gray-700 mb-2">
              Player 1 *
            </label>
            {#if player1.name}
              <div class="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
                <div class="flex items-center">
                  <span class="text-sm font-medium text-gray-900">{player1.name}</span>
                  {#if player1.is_guest}
                    <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Guest
                    </span>
                  {/if}
                </div>
                <button
                  type="button"
                  on:click={() => clearPlayer(1)}
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear player 1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            {:else}
              <select
                id="player1"
                on:change={(e) => handlePlayerSelect(1, e)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       {errors.player1 ? 'border-red-300 bg-red-50' : ''}"
              >
                <option value="">Select Player 1...</option>
                {#each players as player}
                  <option value={player.id}>{player.name}</option>
                {/each}
                <option value="guest">+ Add Guest Player</option>
              </select>
            {/if}
            {#if errors.player1}
              <p class="mt-1 text-sm text-red-600">{errors.player1}</p>
            {/if}
          </div>
          
          <!-- Player 2 -->
          <div>
            <label for="player2" class="block text-sm font-medium text-gray-700 mb-2">
              Player 2 *
            </label>
            {#if player2.name}
              <div class="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
                <div class="flex items-center">
                  <span class="text-sm font-medium text-gray-900">{player2.name}</span>
                  {#if player2.is_guest}
                    <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Guest
                    </span>
                  {/if}
                </div>
                <button
                  type="button"
                  on:click={() => clearPlayer(2)}
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear player 2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            {:else}
              <select
                id="player2"
                on:change={(e) => handlePlayerSelect(2, e)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       {errors.player2 ? 'border-red-300 bg-red-50' : ''}"
              >
                <option value="">Select Player 2...</option>
                {#each players as player}
                  <option value={player.id}>{player.name}</option>
                {/each}
                <option value="guest">+ Add Guest Player</option>
              </select>
            {/if}
            {#if errors.player2}
              <p class="mt-1 text-sm text-red-600">{errors.player2}</p>
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          variant="ghost"
          on:click={handleCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          disabled={!player1.name || !player2.name}
          loading={submitting}
        >
          Start Match
        </Button>
      </div>
    </form>
  {/if}
</div>

<!-- Guest Player Form Modal -->
{#if showGuestForm}
  <Modal open={showGuestForm} on:close={handleGuestPlayerCancel}>
    <GuestPlayerForm
      on:add={handleGuestPlayerAdd}
      on:cancel={handleGuestPlayerCancel}
    />
  </Modal>
{/if}