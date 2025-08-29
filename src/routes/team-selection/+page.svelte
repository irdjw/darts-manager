<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { DashboardService } from '$lib/services/dashboardService';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  const dashboardService = new DashboardService();
  
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      // Get current fixture to determine week
      const currentFixture = await dashboardService.getCurrentFixture();
      
      if (currentFixture) {
        // Redirect to the current week's team selection
        goto(`/team-selection/${currentFixture.week_number}`, { replaceState: true });
      } else {
        // No current fixture, get upcoming fixtures
        const upcomingFixtures = await dashboardService.getUpcomingFixtures(1);
        
        if (upcomingFixtures.length > 0) {
          goto(`/team-selection/${upcomingFixtures[0].week_number}`, { replaceState: true });
        } else {
          // Default to week 1 if no fixtures
          goto('/team-selection/1', { replaceState: true });
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to determine current week';
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Team Selection - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  {#if error}
    <div class="max-w-md mx-auto text-center p-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
      </div>
      
      <div class="space-y-3">
        <button
          on:click={() => goto('/team-selection/1')}
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium
                 min-h-[44px] transition-all touch-manipulation w-full"
        >
          Go to Week 1 Selection
        </button>
        
        <button
          on:click={() => goto('/dashboard')}
          class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium
                 min-h-[44px] transition-all touch-manipulation w-full"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  {:else}
    <div class="text-center">
      <LoadingSpinner message="Determining current week..." />
      <p class="mt-4 text-sm text-gray-500">Redirecting to team selection...</p>
    </div>
  {/if}
</div>