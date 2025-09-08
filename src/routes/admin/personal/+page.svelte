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

{#if currentUserId}
  <PersonalPracticeHub 
    playerId={currentUserId}
    {playerName}
  />
{:else}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-center text-white">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p class="text-gray-400">Loading personal practice...</p>
    </div>
  </div>
{/if}