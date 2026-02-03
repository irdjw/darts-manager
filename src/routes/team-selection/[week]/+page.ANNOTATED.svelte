<!--
  ============================================================================
  WEEKLY TEAM SELECTION PAGE — Dedicated selection interface for one week
  ============================================================================

  PURPOSE:
  A focused, single-purpose page for the captain to pick 7 players for a
  specific week's fixture. Simpler and more streamlined than the full
  captain dashboard (/team) — just the selection task, nothing else.

  URL: /team-selection/[week]
  EXAMPLE: /team-selection/4  → selecting the team for week 4

  HOW IT DIFFERS FROM /team (the captain dashboard):
  - /team has 4 tabs and manages its own local state
  - THIS PAGE uses the shared teamManagement store (teamStore, currentSelection)
  - THIS PAGE is the "dedicated" selection flow; /team is the all-in-one dashboard

  KEY CONCEPTS:

  1. URL PARAMETER EXTRACTION:
     The [week] in the URL is a dynamic route parameter. SvelteKit makes it
     available via $page.params.week. We parse it to an integer for use.

  2. REACTIVE STATEMENT ($:):
     `$: weekNumber = parseInt(...)` re-runs whenever $page changes.
     This means if the user navigates from /team-selection/3 to /team-selection/4,
     weekNumber updates automatically without a page reload.

  3. AUTO-SELECTED PLAYERS:
     The teamManagement store supports auto_selected players (e.g., system picks).
     These cannot be deselected by the captain — they're locked in.
     Currently auto_selected is always empty, but the UI handles it.

  4. INCOMPLETE SAVE:
     saveTeamSelection() currently only console.logs the selection.
     The actual persistence logic (calling AttendanceService.bulkSelectPlayers)
     has not been implemented here yet. The /team dashboard's save works fully.

  COMPONENTS USED:
  - PlayerCard: Renders a player with selection state, stats, disabled state
  - LoadingSpinner: Full-page loading indicator

  DATA SOURCE:
  - teamStore (from teamManagement.ts) — loads players and generates selection
  - currentSelection store — reactive; updates when teamStore writes to it
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { teamStore, currentSelection, allPlayers } from '$lib/stores/teamManagement';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import type { Player, TeamSelection } from '$lib/types/dashboard';

  // ==========================================================================
  // STATE
  // ==========================================================================

  // weekNumber: extracted from the URL path parameter [week]
  // Parsed as integer because URL params are always strings
  let weekNumber: number;

  let loading = true;
  let error: string | null = null;

  // The current TeamSelection object — populated by teamStore.generateTeamSelection()
  // Contains: available_players, unavailable_players, selected_players, auto_selected, captain_picks
  let selection: TeamSelection | null = null;

  // ==========================================================================
  // REACTIVE: URL PARAMETER → weekNumber
  // ==========================================================================
  // $page is a Svelte store provided by SvelteKit.
  // $page.params contains the dynamic route segments.
  // The $: prefix makes this a reactive declaration:
  //   whenever $page changes (navigation), this re-evaluates.
  $: weekNumber = parseInt($page.params.week || '1');

  // ==========================================================================
  // LIFECYCLE — Load data on mount
  // ==========================================================================
  //
  // onMount runs once after the component is first rendered in the browser.
  // We load players, then generate the team selection for this week.
  //
  // WHY loadPlayers() BEFORE generateTeamSelection()?
  // generateTeamSelection() internally also loads players, but calling
  // loadPlayers() first ensures the allPlayers store is populated for
  // any other component that might need it immediately.
  onMount(async () => {
    try {
      await teamStore.loadPlayers();                          // Populate allPlayers store
      selection = await teamStore.generateTeamSelection(weekNumber);  // Split into categories
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load team selection';
    } finally {
      loading = false;
    }
  });

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * TOGGLE PLAYER SELECTION — Add or remove a player from the team
   *
   * CALLED BY: Clicking a PlayerCard in the "Available Players" section
   *
   * RULES:
   * 1. If player is already selected AND is auto-selected → do nothing
   *    (auto-selected players are locked — they can't be removed)
   * 2. If player is already selected AND is captain-picked → remove them
   *    (remove from both selected_players and captain_picks)
   * 3. If player is NOT selected AND team has < 7 → add them
   *    (add to both selected_players and captain_picks)
   * 4. If player is NOT selected AND team already has 7 → do nothing
   *
   * REACTIVITY TRICK:
   * `selection = selection` at the end forces Svelte to treat the object
   * as changed. Without this, Svelte wouldn't detect the mutation because
   * the reference hasn't changed — only the array contents inside it.
   *
   * EXAMPLE:
   *   Team has [Alice, Bob, Carol] (3/7)
   *   Captain clicks Dave → selected_players becomes [Alice, Bob, Carol, Dave]
   *   Captain clicks Bob  → selected_players becomes [Alice, Carol, Dave]
   */
  function togglePlayerSelection(player: Player) {
    if (!selection) return;  // Safety: do nothing if selection hasn't loaded

    // Is this player already on the team?
    const isSelected = selection.selected_players.some(p => p.id === player.id);

    if (isSelected) {
      // DESELECT — but only if NOT auto-selected
      const isAutoSelected = selection.auto_selected.some(p => p.id === player.id);
      if (!isAutoSelected) {
        // Remove from both selected_players and captain_picks
        selection.selected_players = selection.selected_players.filter(p => p.id !== player.id);
        selection.captain_picks = selection.captain_picks.filter(p => p.id !== player.id);
      }
      // If auto-selected, silently do nothing (UI shows them as locked)
    } else if (selection.selected_players.length < 7) {
      // SELECT — add to both arrays (team not full yet)
      selection.selected_players = [...selection.selected_players, player];
      selection.captain_picks = [...selection.captain_picks, player];
    }
    // If team is full (7) and player isn't selected, do nothing

    // Force Svelte reactivity — reassigning triggers template re-render
    selection = selection;
  }

  /**
   * SAVE TEAM SELECTION — Persist the captain's picks
   *
   * ⚠️ INCOMPLETE: Currently only logs to console.
   * Should call AttendanceService.bulkSelectPlayers() with the selected
   * player IDs and weekNumber. See /team dashboard for a working save.
   *
   * FUTURE IMPLEMENTATION:
   *   const playerIds = selection.selected_players.map(p => p.id);
   *   await AttendanceService.bulkSelectPlayers(playerIds, weekNumber);
   */
  async function saveTeamSelection() {
    if (!selection) return;

    loading = true;
    try {
      // TODO: Replace with actual persistence
      // await AttendanceService.bulkSelectPlayers(
      //   selection.selected_players.map(p => p.id),
      //   weekNumber
      // );
      console.log('Saving team selection:', selection);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save team selection';
    } finally {
      loading = false;
    }
  }
</script>

<!-- ========================================================================
     PAGE TITLE
     ======================================================================== -->
<svelte:head>
  <title>Team Selection - Week {weekNumber}</title>
</svelte:head>

<!-- ========================================================================
     PAGE LAYOUT
     ======================================================================== -->
<div class="min-h-screen bg-gray-50">

  <!-- HEADER — Title + "Confirm Team" button (only shows when 7 selected) -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Team Selection</h1>
        <p class="text-sm text-gray-500">Week {weekNumber}</p>
      </div>

      <!-- Confirm button only appears once all 7 players are selected.
           This prevents partial saves — the captain must complete the full team. -->
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

  <!-- MAIN CONTENT -->
  <main class="px-4 py-6 md:px-6">
    <!-- ERROR BANNER -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
      </div>
    {/if}

    {#if loading}
      <LoadingSpinner message="Loading team selection..." />

    {:else if selection}
      <!-- ================================================================
           TEAM SUMMARY CARD
           Shows: progress bar, auto-selected notice, current team as tags
           ================================================================ -->
      <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Team Summary</h2>
          <!-- Badge: "3/7 Selected" -->
          <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {selection.selected_players.length}/7 Selected
          </span>
        </div>

        <!-- PROGRESS BAR — fills proportionally to selection count -->
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style="width: {(selection.selected_players.length / 7) * 100}%"
          ></div>
        </div>

        <!-- AUTO-SELECTED NOTICE — only shows if system picked some players -->
        <!-- Currently auto_selected is always empty, but the UI is ready -->
        {#if selection.auto_selected.length > 0}
          <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p class="text-green-800 text-sm">
              <strong>{selection.auto_selected.length} players</strong> automatically selected (previous winners)
            </p>
          </div>
        {/if}

        <!-- SELECTED PLAYERS LIST — shown as green pill tags -->
        <!-- Auto-selected players get a small shield/check icon to indicate they're locked -->
        {#if selection.selected_players.length > 0}
          <div class="space-y-2">
            <h3 class="font-medium text-gray-900">Selected Players:</h3>
            <div class="flex flex-wrap gap-2">
              {#each selection.selected_players as player}
                <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <span>{player.name}</span>
                  <!-- Lock icon for auto-selected players (can't be removed) -->
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

      <!-- ================================================================
           AVAILABLE PLAYERS — The selectable pool
           Each player rendered as a PlayerCard component.
           Props control appearance and interactivity:
           - isSelected: green border + tick
           - disabled:   greyed out, non-clickable
           - autoSelected: shows lock icon
           - unavailable: visual "not available" treatment
           ================================================================ -->
      <section class="mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Players</h2>
        <!-- 1 col mobile → 2 cols md+ -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each selection.available_players as player}
            <!-- Compute display state for this player -->
            {@const isSelected = selection.selected_players.some(p => p.id === player.id)}
            {@const isAutoSelected = selection.auto_selected.some(p => p.id === player.id)}
            <!-- canSelect: team not full OR already selected (so can deselect) -->
            {@const canSelect = !isSelected && selection.selected_players.length < 7}
            <!-- canDeselect: selected AND not auto-selected (captain picks only) -->
            {@const canDeselect = isSelected && !isAutoSelected}

            <PlayerCard
              {player}
              {isSelected}
              disabled={!canSelect && !canDeselect}   <!-- Greyed out if can't act -->
              autoSelected={isAutoSelected}            <!-- Shows lock icon if true -->
              currentWeek={weekNumber}
              on:click={() => togglePlayerSelection(player)}
            />
          {/each}
        </div>
      </section>

      <!-- ================================================================
           UNAVAILABLE PLAYERS — Shown greyed out at the bottom
           These are players who either didn't mark availability or
           explicitly said they're unavailable this week.
           All PlayerCards here have disabled={true} and unavailable={true}.
           ================================================================ -->
      {#if selection.unavailable_players.length > 0}
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Unavailable Players</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each selection.unavailable_players as player}
              <PlayerCard
                {player}
                isSelected={false}
                disabled={true}                        <!-- Can't click -->
                unavailable={true}                     <!-- Visual treatment -->
                currentWeek={weekNumber}
              />
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>
