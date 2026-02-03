<!--
  ============================================================================
  TEAM SELECTION ROOT — Automatic Week Redirect
  ============================================================================

  PURPOSE:
  This page doesn't render any content of its own. It's a router that
  figures out which week's team selection page to show, then redirects there.

  URL: /team-selection
  REDIRECTS TO: /team-selection/[week]  (e.g., /team-selection/4)

  WHY DOES THIS PAGE EXIST?
  Users bookmark or link to /team-selection (without a week number).
  This page determines the "current" or "next" week automatically and
  sends them to the right place. Without it, /team-selection would be a
  dead end with no content.

  REDIRECT PRIORITY (in order):
  1. Current fixture's week — if a match is happening now or very soon
  2. First upcoming fixture's week — the next match on the schedule
  3. Week 1 — fallback if no fixtures exist at all

  REPLACESTATE:
  goto() is called with { replaceState: true }. This means the redirect
  page is REPLACED in the browser history — pressing Back won't return here.
  The user goes straight from wherever they came from to /team-selection/[week].
  Without replaceState, Back would loop: selection page → this page → selection page.

  ERROR HANDLING:
  If the redirect logic fails (DB error), an error screen shows two manual
  options: go directly to Week 1 selection, or return to dashboard.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { DashboardService } from '$lib/services/dashboardService';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  // DashboardService provides fixture queries
  const dashboardService = new DashboardService();

  let loading = true;
  let error: string | null = null;

  // ==========================================================================
  // LIFECYCLE — Determine week and redirect
  // ==========================================================================
  //
  // All logic runs in onMount. This page's entire job is done in ~100ms
  // (two DB queries at most), then the user is on the real selection page.
  onMount(async () => {
    try {
      // ATTEMPT 1: Check if there's a current/imminent fixture
      const currentFixture = await dashboardService.getCurrentFixture();

      if (currentFixture) {
        // Found one — redirect to that week's selection page.
        // replaceState: true removes THIS page from browser history.
        goto(`/team-selection/${currentFixture.week_number}`, { replaceState: true });
      } else {
        // ATTEMPT 2: No current fixture — check upcoming ones
        // We only need the first one (limit 1), so pass 1
        const upcomingFixtures = await dashboardService.getUpcomingFixtures(1);

        if (upcomingFixtures.length > 0) {
          // Next upcoming fixture found — use its week
          goto(`/team-selection/${upcomingFixtures[0].week_number}`, { replaceState: true });
        } else {
          // FALLBACK: No fixtures at all in the system — default to week 1
          // This handles the case where the season hasn't been set up yet.
          goto('/team-selection/1', { replaceState: true });
        }
      }
    } catch (err) {
      // Redirect failed — show the error screen with manual options
      error = err instanceof Error ? err.message : 'Failed to determine current week';
      loading = false;  // Stop the spinner so the error is visible
    }
  });
</script>

<!-- Page title while loading/erroring -->
<svelte:head>
  <title>Team Selection - Isaac Wilson Darts Team</title>
</svelte:head>

<!-- ======================================================================
     LAYOUT: Centred content (both loading and error states)
     ====================================================================== -->
<div class="min-h-screen bg-gray-50 flex items-center justify-center">

  {#if error}
    <!-- ERROR STATE — shown if the redirect logic threw an exception -->
    <!-- Two manual escape hatches: go to week 1, or go back to dashboard -->
    <div class="max-w-md mx-auto text-center p-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
      </div>

      <div class="space-y-3">
        <!-- Option A: Skip the auto-detection, just go to week 1 -->
        <button
          on:click={() => goto('/team-selection/1')}
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium
                 min-h-[44px] transition-all touch-manipulation w-full"
        >
          Go to Week 1 Selection
        </button>

        <!-- Option B: Bail out entirely, return to main dashboard -->
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
    <!-- LOADING STATE — brief flash before redirect completes -->
    <!-- Most users won't see this for more than a fraction of a second -->
    <div class="text-center">
      <LoadingSpinner message="Determining current week..." />
      <p class="mt-4 text-sm text-gray-500">Redirecting to team selection...</p>
    </div>
  {/if}
</div>
