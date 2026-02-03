<!--
  ============================================================================
  TEAM MANAGEMENT DASHBOARD — Captain's Command Centre
  ============================================================================

  PURPOSE:
  The captain's main dashboard for managing the team each week. Contains
  everything a captain needs in one place across 4 tabs:
    - Overview:    Squad health, current/upcoming fixtures, drop risk alerts
    - Selection:   Pick 7 players for this week's match
    - Attendance:  See/mark who's available
    - Performance: Form guide, recent results, player stats table

  URL: /team

  WHO SEES THIS:
  The captain (or admin). Regular players see a simpler view.

  KEY ARCHITECTURE DECISIONS:

  1. SELF-CONTAINED STATE:
     Unlike /team-selection/[week] which uses the teamManagement store,
     this page manages its own local state. All data (players, attendance,
     fixtures) lives in local variables. This keeps it independent and
     avoids shared-state complications.

  2. PARALLEL + SEQUENTIAL LOADING:
     loadData() uses Promise.all() for the three core queries (players,
     fixtures, week), then runs attendance and performance sequentially
     after. This is because attendance needs currentWeek (set by
     loadCurrentWeek), and performance needs the player list.

  3. LOCAL-FIRST UPDATES:
     togglePlayerAttendance and togglePlayerSelection update local arrays
     immediately (instant UI feedback). The actual database save only
     happens when "Save Team" is clicked. This is an optimistic UI pattern.

  4. TAB-BASED LAYOUT:
     Single page with 4 tabs. Only one section renders at a time
     ({#if activeTab === '...'}) — this keeps the DOM lean on mobile.

  COMPONENTS USED:
  - LoadingSpinner: Full-page loading state
  - PlayerCard:     Player display card (name, avatar, stats)
  - MatchCard:      Fixture card (opponent, date, status)
  - StatsCard:      Key metric card (number + label + icon)
  - formatDate:     "2026-02-03" → "Tue 3 Feb"
  - formatPercentage: 0.756 → "75.6%"
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Player, Fixture, AttendanceRecord, TeamSelection } from '$lib/types/dashboard';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import MatchCard from '$lib/components/MatchCard.svelte';
  import StatsCard from '$lib/components/StatsCard.svelte';
  import { formatDate, formatPercentage } from '$lib/utils/formatting';

  // ==========================================================================
  // SERVICE
  // ==========================================================================
  // Single DashboardService instance shared across all methods on this page.
  // DashboardService aggregates queries from players, fixtures, attendance tables.
  const dashboardService = new DashboardService();

  // ==========================================================================
  // UI STATE
  // ==========================================================================

  // loading: true while data is being fetched. Renders <LoadingSpinner> when set.
  let loading = true;

  // error: if set, renders a dismissible red error banner at the top.
  let error: string | null = null;

  // activeTab: which of the 4 tabs is currently showing.
  // The nav buttons set this; the {#if} blocks in the template read it.
  let activeTab: 'overview' | 'selection' | 'attendance' | 'performance' = 'overview';

  // ==========================================================================
  // DATA — Populated by loadData() on mount
  // ==========================================================================

  // All players in the squad (active + dropped).
  // Used by attendance tab, selection tab, and performance table.
  let players: Player[] = [];

  // Next 5 upcoming fixtures (for the Overview tab's fixture list).
  let upcomingFixtures: Fixture[] = [];

  // The fixture happening right now or next (highlighted in Overview).
  // null if no current/imminent fixture.
  let currentFixture: Fixture | null = null;

  // Which week number we're managing attendance/selection for.
  // Derived from currentFixture or first upcoming fixture.
  let currentWeek = 1;

  // Computed team-level stats shown as StatsCards in Overview.
  let teamStats = {
    totalPlayers: 0,
    activePlayers: 0,       // Players without a drop_week set
    averageWinRate: 0,      // Mean win% across active players
    totalGames: 0,          // Sum of all games_played across the squad
    bestPerformer: null as Player | null  // Highest win% with 3+ games
  };

  // ==========================================================================
  // ATTENDANCE & SELECTION STATE (local, not persisted until Save)
  // ==========================================================================

  // Raw attendance records from DB for currentWeek.
  // Each has: { player_id, week_number, available, selected }
  let attendanceRecords: AttendanceRecord[] = [];

  // Players currently marked as selected for the team (subset of availablePlayers).
  let selectedPlayers: Player[] = [];

  // Players who marked themselves available this week.
  let availablePlayers: Player[] = [];

  // ==========================================================================
  // PERFORMANCE DATA — Form guide, recent results, drop risk
  // ==========================================================================
  let performanceData = {
    recentResults: [] as Fixture[],
    // Form guide: last 5 fixture results as 'W' or 'L'.
    // Displayed as coloured circles in the Performance tab.
    formGuide: [] as string[],
    // Players with 2+ consecutive losses who haven't been dropped yet.
    // Shown as a warning in Overview.
    dropCandidates: [] as Player[]
  };

  // ==========================================================================
  // LIFECYCLE — Load everything when the page mounts
  // ==========================================================================

  onMount(async () => {
    await loadData();
  });

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  /**
   * LOAD DATA — Master loading function
   *
   * LOADING STRATEGY:
   * Phase 1 (parallel): players, fixtures, currentWeek — independent queries
   * Phase 2 (sequential): attendance needs currentWeek; performance needs players
   *
   * Promise.all() runs Phase 1 queries simultaneously — if each takes 200ms,
   * they all finish in ~200ms total rather than 600ms sequentially.
   */
  async function loadData() {
    try {
      loading = true;
      error = null;

      // PHASE 1: Three independent queries — run in parallel
      await Promise.all([
        loadPlayers(),        // SELECT * FROM players
        loadFixtures(),       // Current + upcoming fixtures
        loadCurrentWeek()     // Determine which week we're on
      ]);

      // Calculate team stats from the loaded player data
      calculateTeamStats();

      // PHASE 2: Sequential — attendance needs currentWeek value
      if (currentWeek) {
        await loadAttendance(currentWeek);
      }

      // Performance data needs player list to be loaded
      await loadPerformanceData();

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load team data';
      console.error('Team data loading error:', err);
    } finally {
      loading = false;  // Always stop loading, even on error
    }
  }

  /** Fetch all players from the database */
  async function loadPlayers() {
    players = await dashboardService.getAllPlayers();
  }

  /**
   * Fetch fixtures — both the current one and upcoming ones.
   * getCurrentFixture() returns null if no match is happening now/soon.
   */
  async function loadFixtures() {
    upcomingFixtures = await dashboardService.getUpcomingFixtures(5);  // Next 5 weeks
    currentFixture = await dashboardService.getCurrentFixture();
  }

  /**
   * DETERMINE CURRENT WEEK
   *
   * Logic: Use the current fixture's week if it exists.
   * Otherwise, use the first upcoming fixture's week.
   * This means the attendance tab always shows the most relevant week.
   */
  async function loadCurrentWeek() {
    if (currentFixture) {
      currentWeek = currentFixture.week_number;
    } else if (upcomingFixtures.length > 0) {
      currentWeek = upcomingFixtures[0].week_number;
    }
  }

  /**
   * LOAD ATTENDANCE — Get records and split into available/selected
   *
   * FLOW:
   * 1. Fetch raw attendance records for the week
   * 2. Filter players into availablePlayers (available = true)
   * 3. Filter availablePlayers further into selectedPlayers (selected = true)
   *
   * NOTE: selectedPlayers is a subset of availablePlayers.
   * A player can't be selected without being available first.
   *
   * FALLBACK: If the attendance query fails, fall back to showing all
   * non-dropped players as available (graceful degradation).
   */
  async function loadAttendance(weekNumber: number) {
    try {
      attendanceRecords = await dashboardService.getWeeklyAttendance(weekNumber);

      // Split players by their attendance status
      availablePlayers = players.filter(p => {
        const attendance = attendanceRecords.find(a => a.player_id === p.id);
        return attendance?.available === true;
      });

      // Selected is a further filter on available
      selectedPlayers = availablePlayers.filter(p => {
        const attendance = attendanceRecords.find(a => a.player_id === p.id);
        return attendance?.selected === true;
      });
    } catch (err) {
      console.warn('Failed to load attendance:', err);
      // Fallback: treat all non-dropped players as available
      availablePlayers = players.filter(p => !p.drop_week);
      selectedPlayers = [];
    }
  }

  /**
   * LOAD PERFORMANCE DATA — Recent results and form analysis
   *
   * FORM GUIDE CONSTRUCTION:
   * 1. Get last 10 results from DB
   * 2. Take the 5 most recent
   * 3. Map each to 'W' or 'L' based on team_won
   * 4. Reverse so oldest is on the LEFT, newest on the RIGHT
   *    (conventional form guide display order)
   *
   * DROP CANDIDATES:
   * Players with consecutive_losses >= 2 who haven't already been dropped.
   * The drop_week field is set by admin when a player is formally dropped.
   */
  async function loadPerformanceData() {
    try {
      performanceData.recentResults = await dashboardService.getRecentResults(10);

      // Form guide: W/L for last 5, oldest-first
      performanceData.formGuide = performanceData.recentResults
        .slice(0, 5)                                    // Most recent 5
        .map(f => f.team_won ? 'W' : 'L')              // Convert to letter
        .reverse();                                     // Flip: oldest → newest (left → right)

      // Flag players at risk of being dropped
      performanceData.dropCandidates = players.filter(p =>
        (p.consecutive_losses || 0) >= 2 && !p.drop_week
      );

    } catch (err) {
      console.warn('Failed to load performance data:', err);
    }
  }

  // ==========================================================================
  // COMPUTED STATS
  // ==========================================================================

  /**
   * CALCULATE TEAM STATS — Aggregates for the Overview StatsCards
   *
   * All computed client-side from the players array. No extra DB queries.
   *
   * BEST PERFORMER LOGIC:
   * - Must have played at least 3 games (avoid misleading 100% from 1 game)
   * - Sorted descending by win_percentage
   * - First element is the best (or null if nobody qualifies)
   */
  function calculateTeamStats() {
    teamStats.totalPlayers = players.length;

    // Active = not dropped (drop_week is falsy)
    const activePlayers = players.filter(p => !p.drop_week);
    teamStats.activePlayers = activePlayers.length;

    // Average win rate across active players (guard against empty array)
    teamStats.averageWinRate = activePlayers.length > 0
      ? activePlayers.reduce((sum, p) => sum + (p.win_percentage || 0), 0) / activePlayers.length
      : 0;

    // Total games played across entire squad this season
    teamStats.totalGames = players.reduce((sum, p) => sum + (p.games_played || 0), 0);

    // Best performer: highest win% with minimum 3 games played
    teamStats.bestPerformer = activePlayers
      .filter(p => (p.games_played || 0) >= 3)                                          // Min 3 games
      .sort((a, b) => (b.win_percentage || 0) - (a.win_percentage || 0))[0] || null;   // Highest first
  }

  // ==========================================================================
  // ATTENDANCE & SELECTION HANDLERS (local state only — not saved to DB)
  // ==========================================================================

  /**
   * TOGGLE PLAYER ATTENDANCE — Flip a player's available flag locally
   *
   * CALLED BY: Attendance tab — clicking a player card
   *
   * KEY DETAIL — LOCAL ONLY:
   * This does NOT call AttendanceService.markAvailability(). It only
   * updates the local attendanceRecords array. The database is updated
   * when saveAttendanceAndSelection() is called.
   *
   * LOGIC:
   * - If record exists: toggle available, reset selected to false
   *   (can't be selected if you're no longer available)
   * - If no record: create one with available = true
   * - After toggling, recalculate availablePlayers from the updated records
   *
   * WHY RESET SELECTED?
   * If a captain marks a player as unavailable after already selecting them,
   * the selection must be cleared. You can't play if you're not available.
   */
  async function togglePlayerAttendance(player: Player) {
    const existingRecord = attendanceRecords.find(a => a.player_id === player.id);

    if (existingRecord) {
      // Record exists — toggle available, clear selected
      // .map() creates a new array (immutable update triggers Svelte reactivity)
      const updatedRecords = attendanceRecords.map(a => {
        if (a.player_id === player.id) {
          return { ...a, available: !a.available, selected: false };
        }
        return a;
      });
      attendanceRecords = updatedRecords;  // Assignment triggers reactivity
    } else {
      // No record — create a new one (player hasn't marked availability yet)
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),           // Temporary client-side ID
        player_id: player.id,
        week_number: currentWeek,
        league_year: '2025/26',
        attended: true,
        selected: false,                   // Not yet selected
        player: player                     // Attach full player for rendering
      };
      // Spread into new array — again, triggers Svelte reactivity
      attendanceRecords = [...attendanceRecords, newRecord];
    }

    // Recalculate the availablePlayers derived list
    availablePlayers = players.filter(p => {
      const attendance = attendanceRecords.find(a => a.player_id === p.id);
      return attendance?.available === true;
    });
  }

  /**
   * TOGGLE PLAYER SELECTION — Add/remove a player from the team
   *
   * CALLED BY: Selection tab — clicking an available player card
   *
   * GUARDS:
   * - Player must have an attendance record (can't select someone with no record)
   * - Player must be available (attendance.available must be true)
   * - Can't select more than 7 (enforced by UI disabling, but double-checked here)
   *
   * LIKE togglePlayerAttendance, this is LOCAL ONLY. Database update
   * happens in saveAttendanceAndSelection().
   */
  async function togglePlayerSelection(player: Player) {
    const attendanceRecord = attendanceRecords.find(a => a.player_id === player.id);

    // Only allow selection if the player has an attendance record AND is available
    if (attendanceRecord && attendanceRecord.available) {
      // Toggle selected flag in the attendance records array
      const updatedRecords = attendanceRecords.map(a => {
        if (a.player_id === player.id) {
          return { ...a, selected: !a.selected };
        }
        return a;
      });
      attendanceRecords = updatedRecords;

      // Recalculate selectedPlayers from updated records
      selectedPlayers = availablePlayers.filter(p => {
        const attendance = attendanceRecords.find(a => a.player_id === p.id);
        return attendance?.selected === true;
      });
    }
  }

  /**
   * SAVE ATTENDANCE AND SELECTION — Persist to database
   *
   * CALLED BY: "Save Team" button in the Selection tab
   *
   * VALIDATION (before saving):
   * - Must have at least one attendance record
   * - Must have selected at least one player
   * - Cannot select more than 7 players (league rule)
   *
   * SAVES: Calls dashboardService.saveAttendance() which handles
   * persisting the attendance records (including the selected flags)
   * to the database in one operation.
   *
   * ON SUCCESS: Shows an alert with the number of selected players.
   * ON FAILURE: Sets error message displayed in the red banner.
   */
  async function saveAttendanceAndSelection() {
    // Validation
    if (attendanceRecords.length === 0) {
      error = 'No attendance records to save';
      return;
    }

    if (selectedPlayers.length === 0) {
      error = 'Please select at least one player for the team';
      return;
    }

    if (selectedPlayers.length > 7) {
      error = 'Team can have maximum 7 players';  // League rule
      return;
    }

    try {
      // Persist all attendance records (including selection state) to DB
      await dashboardService.saveAttendance(attendanceRecords);
      error = null;

      alert(`Team selection saved! ${selectedPlayers.length} players selected for week ${currentWeek}.`);

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save team selection';
    }
  }

  /**
   * GET FORM INDICATOR — Map result letter to coloured emoji
   * 'W' → 🟢  'L' → 🔴  'D' → 🟡  else → ⚪
   */
  function getFormIndicator(result: string): string {
    switch (result) {
      case 'W': return '🟢';
      case 'L': return '🔴';
      case 'D': return '🟡';
      default: return '⚪';
    }
  }
</script>

<!-- ========================================================================
     PAGE TITLE (sets browser tab title)
     ======================================================================== -->
<svelte:head>
  <title>Team Management - Isaac Wilson Darts Team</title>
</svelte:head>

<!-- ========================================================================
     PAGE LAYOUT
     Full-height grey background. Header + nav tabs + main content area.
     ======================================================================== -->
<div class="min-h-screen bg-gray-50">

  <!-- HEADER — Title + Refresh button -->
  <!-- min-h-[44px] on the button = Apple's recommended minimum touch target -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Team Management</h1>
        <p class="text-sm text-gray-500">Captain dashboard</p>
      </div>

      <!-- Refresh re-runs loadData() — useful if attendance changes elsewhere -->
      <button
        on:click={loadData}
        disabled={loading}
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2
               rounded-lg text-sm font-medium min-h-[44px] transition-all touch-manipulation"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </header>

  <!-- ERROR BANNER — Shown when error is set. Dismiss clears it. -->
  {#if error}
    <div class="px-4 py-2 md:px-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{error}</p>
        <button
          on:click={() => error = null}
          class="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  {/if}

  <!-- ====================================================================
       TAB NAVIGATION
       activeTab controls which {#if} block renders below.
       The active tab gets a blue bottom border; others are grey.
       overflow-x-auto allows horizontal scroll on very narrow screens.
       ==================================================================== -->
  <nav class="bg-white border-b border-gray-200">
    <div class="px-4 md:px-6">
      <div class="flex space-x-8 overflow-x-auto">
        <!-- Each tab button: sets activeTab on click, styles based on match -->
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'overview'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'overview'}
        >
          Overview
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'selection'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'selection'}
        >
          Team Selection
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'attendance'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'attendance'}
        >
          Attendance
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                 {activeTab === 'performance'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = 'performance'}
        >
          Performance
        </button>
      </div>
    </div>
  </nav>

  <!-- ====================================================================
       MAIN CONTENT — Only the active tab's section renders
       ==================================================================== -->
  <main class="px-4 py-6 md:px-6">
    {#if loading}
      <!-- Full-page spinner while data loads -->
      <LoadingSpinner message="Loading team data..." />

    <!-- ================================================================
         TAB 1: OVERVIEW
         Shows: Stats cards, current fixture, upcoming fixtures, drop alerts
         ================================================================ -->
    {:else if activeTab === 'overview'}
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Team Overview</h2>

        <!-- 4 KEY STATS as cards in a responsive grid:
             1 col on mobile → 2 cols on sm → 4 cols on lg -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Active Players"
            value={teamStats.activePlayers.toString()}
            subtitle="Available for selection"
            icon="👥"
          />
          <StatsCard
            title="Team Win Rate"
            value={formatPercentage(teamStats.averageWinRate)}
            subtitle="Average across players"
            icon="🏆"
            trend="up"
          />
          <StatsCard
            title="Total Games"
            value={teamStats.totalGames.toString()}
            subtitle="Season to date"
            icon="🎯"
          />
          <!-- Form guide: joins W/L letters into "WLWWL" string for display -->
          <StatsCard
            title="Current Form"
            value={performanceData.formGuide.join('')}
            subtitle="Last 5 results"
            icon="📊"
          />
        </div>

        <!-- CURRENT MATCH — highlighted card if a fixture is active/imminent -->
        {#if currentFixture}
          <div class="mb-8">
            <h3 class="text-md font-semibold text-gray-900 mb-4">Current Match</h3>
            <!-- priority={true} gives MatchCard a more prominent style -->
            <MatchCard fixture={currentFixture} priority={true} />
          </div>
        {/if}

        <!-- UPCOMING FIXTURES — next 3 of the 5 we loaded -->
        {#if upcomingFixtures.length > 0}
          <div class="mb-8">
            <h3 class="text-md font-semibold text-gray-900 mb-4">Upcoming Fixtures</h3>
            <div class="space-y-4">
              {#each upcomingFixtures.slice(0, 3) as fixture}
                <MatchCard {fixture} />
              {/each}
            </div>
          </div>
        {/if}

        <!-- DROP RISK ALERT — Warning box if any players are at risk -->
        <!-- Only renders if there are drop candidates -->
        {#if performanceData.dropCandidates.length > 0}
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 class="font-medium text-yellow-800 mb-2">⚠️ Drop Risk Alert</h3>
            <p class="text-yellow-700 text-sm mb-3">
              {performanceData.dropCandidates.length} player{performanceData.dropCandidates.length > 1 ? 's' : ''}
              at risk of being dropped (2+ consecutive losses):
            </p>
            <!-- Each at-risk player shown as a yellow tag with loss count -->
            <div class="flex flex-wrap gap-2">
              {#each performanceData.dropCandidates as player}
                <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                  {player.name} ({player.consecutive_losses} losses)
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </section>

    <!-- ================================================================
         TAB 2: TEAM SELECTION
         Captain picks up to 7 players from the available pool.
         Progress bar shows how close to a full team of 7.
         ================================================================ -->
    {:else if activeTab === 'selection'}
      <section>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Team Selection</h2>
            <!-- Live counter: "Week 4 • 5/7 selected" -->
            <p class="text-sm text-gray-500">Week {currentWeek} • {selectedPlayers.length}/7 selected</p>
          </div>

          <!-- Save button — calls the DB persist function -->
          <!-- Disabled until at least one player is selected -->
          <button
            on:click={saveAttendanceAndSelection}
            disabled={selectedPlayers.length === 0}
            class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2
                   rounded-lg font-medium min-h-[44px] transition-all touch-manipulation"
          >
            Save Team
          </button>
        </div>

        <!-- PROGRESS BAR — Visual indicator of team completeness -->
        <!-- Width is clamped at 100% with Math.min to prevent overflow if >7 selected -->
        <div class="bg-white p-4 rounded-lg shadow-lg mb-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">Team Selection Progress</span>
            <span class="text-sm text-gray-500">{selectedPlayers.length} of 7</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style="width: {Math.min((selectedPlayers.length / 7) * 100, 100)}%"
            ></div>
          </div>
        </div>

        <!-- PLAYER SELECTION GRID -->
        {#if availablePlayers.length > 0}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="font-medium text-gray-900 mb-4">
              Available Players ({availablePlayers.length})
            </h3>

            <!-- Responsive grid: 1 col mobile → 2 cols md → 3 cols lg -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each availablePlayers as player}
                <!-- {@const} computes values once per iteration (Svelte 3.44+) -->
                {@const isSelected = selectedPlayers.find(p => p.id === player.id) !== undefined}
                {@const canSelect = selectedPlayers.length < 7 || isSelected}
                <!-- canSelect: either team not full yet, OR this player IS selected (so they can deselect) -->

                <!-- PLAYER CARD — green border if selected, grey otherwise -->
                <!-- opacity-50 + cursor-not-allowed when team is full and player isn't selected -->
                <div
                  class="p-4 border-2 rounded-lg cursor-pointer transition-all
                         {isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                         {!canSelect ? 'opacity-50 cursor-not-allowed' : ''}"
                  on:click={() => canSelect && togglePlayerSelection(player)}
                  on:keydown={(e) => e.key === 'Enter' && canSelect && togglePlayerSelection(player)}
                  role="button"
                  tabindex="0"
                >
                  <!-- Player name + avatar + selection indicator -->
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-3">
                      <!-- Avatar: first letter of name in a blue circle -->
                      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span class="text-blue-600 font-semibold text-sm">
                          {player.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 class="font-medium text-gray-900">{player.name}</h4>
                        <div class="text-xs text-gray-500">
                          {formatPercentage(player.win_percentage || 0)} win rate
                        </div>
                      </div>
                    </div>

                    <!-- Checkbox indicator: filled green tick if selected, empty circle if not -->
                    {#if isSelected}
                      <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm">✓</span>
                      </div>
                    {:else}
                      <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    {/if}
                  </div>

                  <!-- Mini stats row: Games / Won / 180s -->
                  <div class="grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <div class="text-gray-500">Games</div>
                      <div class="font-medium">{player.games_played || 0}</div>
                    </div>
                    <div>
                      <div class="text-gray-500">Won</div>
                      <div class="font-medium text-green-600">{player.games_won || 0}</div>
                    </div>
                    <div>
                      <div class="text-gray-500">180s</div>
                      <div class="font-medium text-blue-600">{player.total_180s || 0}</div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <!-- Empty state: no available players — guide captain to mark attendance first -->
          <div class="bg-white rounded-lg shadow-lg p-8 text-center">
            <p class="text-gray-500 mb-4">No players marked as attending yet</p>
            <button
              on:click={() => activeTab = 'attendance'}
              class="text-blue-600 hover:text-blue-700 underline"
            >
              Mark attendance first
            </button>
          </div>
        {/if}
      </section>

    <!-- ================================================================
         TAB 3: ATTENDANCE
         Shows ALL players (available and unavailable). Captain can toggle
         each player's availability. Dropped players are greyed out and
         non-interactive.
         ================================================================ -->
    {:else if activeTab === 'attendance'}
      <section>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Attendance Tracking</h2>
            <p class="text-sm text-gray-500">Week {currentWeek} attendance</p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="font-medium text-gray-900 mb-4">Mark Player Attendance</h3>

          <!-- Full squad grid — every player shown -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each players as player}
              <!-- Look up this player's attendance record for the current week -->
              {@const attendanceRecord = attendanceRecords.find(a => a.player_id === player.id)}
              {@const isAttending = attendanceRecord?.available === true}

              <!-- Card: green if attending, grey if not. Dropped players are dim + non-clickable -->
              <div
                class="p-4 border-2 rounded-lg cursor-pointer transition-all
                       {isAttending ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                       {player.drop_week ? 'opacity-50' : ''}"
                on:click={() => !player.drop_week && togglePlayerAttendance(player)}
                on:keydown={(e) => e.key === 'Enter' && !player.drop_week && togglePlayerAttendance(player)}
                role="button"
                tabindex="0"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span class="text-blue-600 font-medium text-sm">
                        {player.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{player.name}</div>
                      <!-- "Dropped" label for players with a drop_week set -->
                      {#if player.drop_week}
                        <div class="text-xs text-red-500">Dropped</div>
                      {/if}
                    </div>
                  </div>

                  <!-- Same tick/circle checkbox indicator as Selection tab -->
                  {#if isAttending}
                    <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-sm">✓</span>
                    </div>
                  {:else}
                    <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                  {/if}
                </div>

                <!-- Win rate + games count as context for captain -->
                <div class="text-xs text-gray-500">
                  {formatPercentage(player.win_percentage || 0)} win rate • {player.games_played || 0} games
                </div>
              </div>
            {/each}
          </div>
        </div>
      </section>

    <!-- ================================================================
         TAB 4: PERFORMANCE
         Three sections:
         1. Form Guide — coloured circles for last 5 results
         2. Recent Results — list of last 5 fixture outcomes
         3. Player Performance — sortable table of all players with games
         ================================================================ -->
    {:else if activeTab === 'performance'}
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Team Performance</h2>

        <!-- FORM GUIDE — Visual W/L history -->
        <!-- getFormIndicator maps 'W'→🟢, 'L'→🔴 -->
        <!-- "(Most recent on right)" clarifies the reading direction -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 class="font-medium text-gray-900 mb-4">Recent Form</h3>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600">Last 5 results:</span>
            {#each performanceData.formGuide as result}
              <span class="text-lg">{getFormIndicator(result)}</span>
            {/each}
            <span class="text-sm text-gray-500 ml-4">
              (Most recent on right)
            </span>
          </div>
        </div>

        <!-- RECENT RESULTS — Last 5 fixtures as a list -->
        {#if performanceData.recentResults.length > 0}
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 class="font-medium text-gray-900 mb-4">Recent Results</h3>
            <div class="space-y-3">
              {#each performanceData.recentResults.slice(0, 5) as fixture}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <!-- "Week 3 vs The Eagles" -->
                    <div class="font-medium">Week {fixture.week_number} vs {fixture.opposition}</div>
                    <div class="text-sm text-gray-500">{formatDate(fixture.match_date)}</div>
                  </div>
                  <!-- Green "Won" or red "Lost" badge -->
                  <span class="px-2 py-1 rounded text-sm font-medium
                               {fixture.team_won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {fixture.team_won ? 'Won' : 'Lost'}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- PLAYER PERFORMANCE TABLE -->
        <!-- Filters to players with at least 1 game, sorts by win% descending -->
        <!-- This gives the captain a ranked view of who's performing best -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="font-medium text-gray-900 mb-4">Player Performance Summary</h3>

          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Games</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <!-- Filter: only players who've played. Sort: highest win% first. -->
                {#each players.filter(p => (p.games_played || 0) > 0).sort((a, b) => (b.win_percentage || 0) - (a.win_percentage || 0)) as player}
                  <tr>
                    <!-- Player name with avatar initial -->
                    <td class="px-4 py-2 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <span class="text-blue-600 text-xs font-medium">
                            {player.name.charAt(0)}
                          </span>
                        </div>
                        {player.name}
                      </div>
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {player.games_played || 0}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(player.win_percentage || 0)}
                    </td>
                    <!-- STATUS BADGE: Dropped (red) / At Risk (yellow) / Active (green)
                         - Dropped: has a drop_week set by admin
                         - At Risk: 2+ consecutive losses, not yet dropped
                         - Active: everything else -->
                    <td class="px-4 py-2 whitespace-nowrap">
                      {#if player.drop_week}
                        <span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Dropped
                        </span>
                      {:else if (player.consecutive_losses || 0) >= 2}
                        <span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          At Risk
                        </span>
                      {:else}
                        <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {/if}
  </main>
</div>
