<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '$lib/components/ui/button.svelte';
  import type { CustomMatchPlayer } from '$lib/types/customMatch';
  
  const dispatch = createEventDispatcher<{
    add: CustomMatchPlayer;
    cancel: void;
  }>();
  
  let name = '';
  let nameError = '';
  let loading = false;
  
  function validateName(value: string): string {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return 'Player name is required';
    }
    
    if (trimmed.length < 2) {
      return 'Player name must be at least 2 characters long';
    }
    
    if (trimmed.length > 50) {
      return 'Player name must be 50 characters or less';
    }
    
    const namePattern = /^[a-zA-Z0-9\s'-]+$/;
    if (!namePattern.test(trimmed)) {
      return 'Player names can only contain letters, numbers, spaces, hyphens and apostrophes';
    }
    
    return '';
  }
  
  function handleInput() {
    nameError = validateName(name);
  }
  
  function handleSubmit() {
    const error = validateName(name);
    if (error) {
      nameError = error;
      return;
    }
    
    console.log('Submitting guest player form with name:', name);
    loading = true;
    
    setTimeout(() => {
      const guestPlayer: CustomMatchPlayer = {
        name: name.trim(),
        is_guest: true
      };
      
      console.log('Dispatching add event with guest player:', guestPlayer);
      dispatch('add', guestPlayer);
      loading = false;
    }, 100);
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !nameError && name.trim()) {
      handleSubmit();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<div class="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900">Add Guest Player</h3>
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
  
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="guest-name" class="block text-sm font-medium text-gray-700 mb-2">
        Player Name *
      </label>
      <input
        id="guest-name"
        type="text"
        bind:value={name}
        on:input={handleInput}
        on:keydown={handleKeydown}
        placeholder="Enter player name"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               {nameError ? 'border-red-300 bg-red-50' : 'bg-white'}"
        disabled={loading}
        autocomplete="off"
        maxlength="50"
      />
      {#if nameError}
        <p class="mt-1 text-sm text-red-600">{nameError}</p>
      {/if}
      <p class="mt-1 text-sm text-gray-500">
        Guest players are temporary and won't be saved to the team roster
      </p>
    </div>
    
    <div class="flex justify-end space-x-3 pt-4">
      <Button
        variant="ghost"
        on:click={handleCancel}
        disabled={loading}
      >
        Cancel
      </Button>
      
      <Button
        type="submit"
        variant="primary"
        disabled={!name.trim() || !!nameError}
        loading={loading}
      >
        Add Player
      </Button>
    </div>
  </form>
  
  <div class="mt-4 p-3 bg-blue-50 rounded-md">
    <div class="flex items-start">
      <div class="text-blue-400 mr-2 mt-0.5">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </div>
      <div>
        <p class="text-sm text-blue-800 font-medium">About Guest Players</p>
        <p class="text-sm text-blue-700 mt-1">
          Guest players are added for this match only and won't appear in team statistics or player management.
          Their match data will be saved separately from league players.
        </p>
      </div>
    </div>
  </div>
</div>