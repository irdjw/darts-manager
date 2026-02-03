<!--
  ============================================================================
  DASHBOARD — The App's Home Page (after login)
  ============================================================================

  PURPOSE:
  The first page every user sees after logging in. Shows:
    1. Current/upcoming match fixture (swipeable carousel)
    2. Quick action buttons (links to common tasks)
    3. Season overview stats (position, win rate, record, top performer)

  URL: /dashboard

  KEY PATTERNS:

  1. SWIPEABLE FIXTURE CAROUSEL:
     The match fixture card supports both button navigation (< >) AND
     touch swipe on mobile. Swiping left/right cycles through all fixtures
     in the season. The current fixture (first unplayed) is shown by default.

  2. PARALLEL DATA LOADING:
     loadData() runs getAllFixtures() and getSeasonStats() in parallel
     via Promise.all(). Both are independent queries, so running them
     together halves the load time.

  3. SERVER DATA (PageData):
     `export let data: PageData` receives data from +page.server.ts (if it
     exists). Currently unused here — all data is loaded client-side in
     onMount. The PageData prop is kept for future server-side rendering.

  4. LOGOUT:
     The logout button is a <form> with method="post" pointing to /logout.
     Using a form (not a link) ensures the logout is a POST request —
     important for CSRF protection and proper session invalidation.

  COMPONENTS:
  - QuickActions: Navigation shortcut buttons (rendered as a child component)
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import QuickActions from '$lib/components/QuickActions.svelte';
  import type { PageData } from './$types';
  import type { Fixture, DashboardStats } from '$lib/types/dashboard';

  // PageData from +page.server.ts — currently unused but available
  // for future server-side pre-rendering of dashboard data.
  export let data: PageData;

  // ==========================================================================
  // STATE
  // ==========================================================================
  let loading = true;
  let error = '';

  // The fixture currently displayed in the carousel
  let currentFixture: Fixture | null = null;

  // Season-level stats (position, wins, losses, top performer)
  let stats: DashboardStats | null = null;

  // Full list of all fixtures this season — used for carousel navigation
  let allFixtures: Fixture[] = [];

  // Which fixture in the array is currently showing (index)
  let currentFixtureIndex = 0;

  const dashboardService = new DashboardService();

  // ==========================================================================
  // TOUCH/SWIPE HANDLING
  // ==========================================================================
  // Records the X position when the touch starts and ends.
  // The difference determines swipe direction and magnitude.
  let touchStartX = 0;
  let touchEndX = 0;
  let fixtureCard: HTMLElement;   // DOM reference for the swipeable card

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  onMount(async () => {
    await loadData();
  });

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  /**
   * LOAD DATA — Fetch fixtures and season stats in parallel
   *
   * PARALLEL LOADING:
   *   Promise.all([getAllFixtures(), getSeasonStats()])
   * Both queries are independent — no need to wait for one before starting
   * the other. If each takes 200ms, both finish in ~200ms total.
   *
   * CURRENT FIXTURE SELECTION:
   * After loading, find the first fixture with result = 'to_play'.
   * That's the "current" match. If all fixtures are played, show the
   * last one in the season (most recent completed).
   */
  async function loadData() {
    try {
      loading = true;
      error = '';

      // Run both queries simultaneously
      const [allFixturesData, statsData] = await Promise.all([
        dashboardService.getAllFixtures(),
        dashboardService.getSeasonStats()
      ]);

      allFixtures = allFixturesData || [];

      // Find the current fixture — first one that hasn't been played yet
      currentFixtureIndex = allFixtures.findIndex(f => f.result === 'to_play');
      if (currentFixtureIndex === -1) {
        // All played — show the most recent (last in the list)
        currentFixtureIndex = allFixtures.length > 0 ? allFixtures.length - 1 : 0;
      }

      currentFixture = allFixtures[currentFixtureIndex] || null;
      stats = statsData;

      console.log('Dashboard data loaded:', { currentFixture, stats });

    } catch (err: any) {
      console.error('Dashboard load error:', err);
      error = err.message || 'Failed to load dashboard data';
    } finally {
      loading = false;
    }
  }

  // ==========================================================================
  // SWIPE / CAROUSEL NAVIGATION
  // ==========================================================================

  /**
   * HANDLE TOUCH START — Record where the finger first touches the screen
   * screenX is the horizontal position in pixels from the left edge.
   */
  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.changedTouches[0].screenX;
  }

  /**
   * HANDLE TOUCH END — Record where the finger lifts off, then process swipe
   */
  function handleTouchEnd(event: TouchEvent) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
  }

  /**
   * HANDLE SWIPE — Determine direction and navigate
   *
   * THRESHOLD: 50px minimum swipe distance to count as intentional.
   * Less than 50px is treated as a tap (no navigation).
   *
   * DIRECTION:
   * - Positive distance (end > start) = swiped RIGHT = show previous
   * - Negative distance (end < start) = swiped LEFT  = show next
   *
   * This matches the convention: swipe left to see what's coming next,
   * swipe right to go back to what's already passed.
   */
  function handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        showPreviousFixture();  // Swiped right
      } else {
        showNextFixture();      // Swiped left
      }
    }
  }

  /**
   * Show the previous fixture in the carousel (wraps around to end)
   */
  function showPreviousFixture() {
    if (allFixtures.length > 1) {
      // Wrap: if at index 0, go to the last fixture
      currentFixtureIndex = currentFixtureIndex > 0
        ? currentFixtureIndex - 1
        : allFixtures.length - 1;
      currentFixture = allFixtures[currentFixtureIndex];
    }
  }

  /**
   * Show the next fixture in the carousel (wraps around to start)
   */
  function showNextFixture() {
    if (allFixtures.length > 1) {
      // Wrap: if at last index, go back to 0
      currentFixtureIndex = currentFixtureIndex < allFixtures.length - 1
        ? currentFixtureIndex + 1
        : 0;
      currentFixture = allFixtures[currentFixtureIndex];
    }
  }
</script>

<svelte:head>
  <title>Dashboard - Isaac Wilson Darts Team</title>
</svelte:head>

<!-- ======================================================================
     PAGE LAYOUT
     pb-16: bottom padding for the mobile navigation bar (if present)
     ====================================================================== -->
<div class="min-h-screen bg-gray-50 pb-16">

  <!-- HEADER — App title + logout button -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <!-- "IW" logo circle — hidden on mobile (global nav has its own) -->
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center lg:block hidden">
          <span class="text-white text-sm font-bold">IW</span>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-lg font-bold text-gray-900">Dashboard</h1>
          </div>
          <!-- Team name — hidden on mobile to save space -->
          <p class="text-sm text-gray-500 hidden lg:block">Isaac Wilson Darts Team</p>
        </div>
      </div>

      <!-- LOGOUT — form POST (not a link) for proper session invalidation -->
      <div class="flex items-center space-x-3">
        <form action="/logout" method="post">
          <button
            type="submit"
            class="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg
                   text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <!-- Logout icon (arrow pointing out of a door) -->
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  </header>

  <main class="px-4 py-6">
    <!-- LOADING STATE -->
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-3 text-gray-600">Loading dashboard...</span>
      </div>

    <!-- ERROR STATE -->
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex items-center">
          <div class="text-red-400 mr-3">⚠️</div>
          <p class="text-sm text-red-800">{error}</p>
        </div>
      </div>

    <!-- MAIN CONTENT — three sections stacked vertically -->
    {:else}
      <div class="space-y-6">

        <!-- ==============================================================
             SECTION 1: MATCH FIXTURES (Swipeable Carousel)
             Shows one fixture at a time. Navigation via:
             - Arrow buttons (< >) shown when there are multiple fixtures
             - Touch swipe on mobile
             Clicking the card navigates to /match/[id] for that fixture.
             ============================================================== -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">Match Fixtures</h2>

            <!-- Carousel nav buttons — only shown if there are multiple fixtures -->
            {#if allFixtures.length > 1}
              <div class="flex items-center space-x-2">
                <!-- Previous button -->
                <button
                  on:click={showPreviousFixture}
                  class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Previous fixture"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <!-- Position counter: "3 of 12" -->
                <span class="text-sm text-gray-500">
                  {currentFixtureIndex + 1} of {allFixtures.length}
                </span>
                <!-- Next button -->
                <button
                  on:click={showNextFixture}
                  class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Next fixture"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            {/if}
          </div>

          {#if currentFixture}
            <!-- FIXTURE CARD — swipeable wrapper + clickable link -->
            <!-- bind:this captures the DOM element for touch event binding -->
            <!-- touch-none: prevents default touch behaviours (scroll) during swipe -->
            <div
              bind:this={fixtureCard}
              on:touchstart={handleTouchStart}
              on:touchend={handleTouchEnd}
              class="touch-none select-none"
            >
              <!-- The card itself is an <a> link to the match page -->
              <!-- group: enables group-hover styles on child elements -->
              <a
                href="/match/{currentFixture.id}"
                class="block bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-all
                       hover:ring-2 hover:ring-blue-500 hover:ring-opacity-20 cursor-pointer group"
              >
                <div class="flex justify-between items-start">
                  <!-- LEFT: Week, opponent, date, venue -->
                  <div>
                    <div class="flex items-center space-x-3">
                      <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Week {currentFixture.week_number}
                      </h3>
                      <!-- Status emoji: 🏆 Won, ⏰ Lost, 🎯 Upcoming -->
                      {#if currentFixture.result === 'win'}
                        <span class="text-2xl">🏆</span>
                      {:else if currentFixture.result === 'loss'}
                        <span class="text-2xl">⏰</span>
                      {:else if currentFixture.result === 'to_play'}
                        <span class="text-2xl">🎯</span>
                      {/if}
                    </div>
                    <!-- Opponent name -->
                    <p class="text-gray-700 font-medium">vs {currentFixture.opposition || 'TBD'}</p>
                    <!-- Date (formatted as UK locale: "03/02/2026") + Home/Away -->
                    <p class="text-sm text-gray-500 mt-1">
                      {currentFixture.match_date ? new Date(currentFixture.match_date).toLocaleDateString('en-GB') : 'Date TBD'} •
                      {currentFixture.venue === 'home' ? 'Home' : 'Away'}
                    </p>
                    <!-- Hint text — tells user they can swipe or click -->
                    <p class="text-xs text-blue-600 mt-2 group-hover:underline">
                      {allFixtures.length > 1 ? 'Swipe or click to manage match →' : 'Click to manage match →'}
                    </p>
                  </div>

                  <!-- RIGHT: Status badge + swipe hint -->
                  <div class="text-right">
                    <!-- Status badge: "Won" / "Lost" / "Upcoming" -->
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium block mb-2">
                      {currentFixture.result === 'win' ? 'Won' :
                       currentFixture.result === 'loss' ? 'Lost' :
                       currentFixture.result === 'to_play' ? 'Upcoming' : 'Unknown'}
                    </span>
                    {#if allFixtures.length > 1}
                      <p class="text-xs text-gray-400">Swipe to navigate</p>
                    {/if}
                  </div>
                </div>
              </a>
            </div>
          {:else}
            <!-- Empty state: no fixtures in the system at all -->
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <p class="text-gray-500 text-center">No fixtures found</p>
            </div>
          {/if}
        </section>

        <!-- ==============================================================
             SECTION 2: QUICK ACTIONS
             Rendered entirely by the QuickActions component.
             Contains navigation buttons for common tasks like:
             - Mark Attendance, Team Selection, Start Scoring, etc.
             ============================================================== -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <QuickActions />
        </section>

        <!-- ==============================================================
             SECTION 3: SEASON OVERVIEW STATS
             Two rows of stat cards:
             Row 1: League Position, Win Rate, Games Record (W-L)
             Row 2: Remaining Fixtures, Top Performer
             ============================================================== -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Season Overview</h2>
          {#if stats}
            <!-- Row 1: Three key stats — responsive grid (1 col → 3 cols) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- League Position — from calculateLeaguePosition (simplified estimate) -->
              <div class="bg-white p-4 rounded-lg shadow-lg text-center">
                <h3 class="text-lg font-semibold text-gray-900">League Position</h3>
                <p class="text-3xl font-bold text-blue-600">{stats.current_position}</p>
              </div>

              <!-- Win Rate — team-level win percentage this season -->
              <div class="bg-white p-4 rounded-lg shadow-lg text-center">
                <h3 class="text-lg font-semibold text-gray-900">Win Rate</h3>
                <p class="text-3xl font-bold text-green-600">{stats.win_percentage}%</p>
              </div>

              <!-- Games Record — "5W - 3L" format -->
              <div class="bg-white p-4 rounded-lg shadow-lg text-center">
                <h3 class="text-lg font-semibold text-gray-900">Games Record</h3>
                <p class="text-lg text-gray-700">{stats.games_won}W - {stats.games_lost}L</p>
              </div>
            </div>

            <!-- Row 2: Additional context stats -->
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Remaining fixtures count — orange to draw attention -->
              <div class="bg-white p-4 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Remaining Fixtures</h3>
                <p class="text-2xl font-bold text-orange-600">{stats.remaining_fixtures}</p>
              </div>

              <!-- Top performer — player with best win rate (min 3 games) -->
              <div class="bg-white p-4 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Top Performer</h3>
                <p class="text-lg text-gray-700">{stats.top_performer?.name || 'N/A'}</p>
                <!-- Show win rate as subtitle if available -->
                {#if stats.top_performer?.win_percentage}
                  <p class="text-sm text-gray-500">{stats.top_performer.win_percentage}% win rate</p>
                {/if}
              </div>
            </div>
          {:else}
            <!-- No stats available yet (start of season) -->
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <p class="text-gray-500 text-center">No season statistics available</p>
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </main>
</div>
