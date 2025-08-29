<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { DashboardService } from '$lib/services/dashboardService';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import type { Fixture, Player, GameAssignment } from '$lib/types/dashboard';
  import { formatDate, getVenueDisplay } from '$lib/utils/formatting';

  // Services
  const dashboardService = new DashboardService();

  // State
  let loading = true;
  let error: string | null = null;
  let fixture: Fixture | null = null;
  let selectedPlayers: Player[] = [];
  let gameAssignments: GameAssignment[] = [];
  let fixtureId: string;
  let saving = false;

  // Game assignment tracking
  let assignedPlayers = new Set<string>();
  let currentlyPlaying: number | null = null;

  $: fixtureId = $page.params.id || '';

  interface GameAssignment {
    gameNumber: number;
    playerId: string | null;
    playerName: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    homeScore: number;
    awayScore: number;
    result: 'win' | 'loss' | null;
  }

  onMount(async () => {
    if (fixtureId) {
      await loadMatchData();
      loadGameResults();
    } else {
      error = 'No match ID provided';
      loading = false;
    }
  });

  function loadGameResults() {
    // Load any completed games from localStorage
    const savedResults = JSON.parse(localStorage.getItem(`match_${fixtureId}`) || '{}');
    
    gameAssignments = gameAssignments.map(assignment => {
      const gameResult = savedResults[`game_${assignment.gameNumber}`];
      if (gameResult) {
        const ourPlayerWon = gameResult.winner === gameResult.homePlayer;
        return {
          ...assignment,
          status: 'completed' as const,
          result: ourPlayerWon ? 'win' : 'loss',
          homeScore: ourPlayerWon ? 1 : 0,
          awayScore: ourPlayerWon ? 0 : 1
        };
      }
      return assignment;
    });
  }

  async function loadMatchData() {
    try {
      loading = true;
      error = null;
      
      // Load fixture data
      const currentFixture = await dashboardService.getCurrentFixture();
      
      if (currentFixture && currentFixture.id === fixtureId) {
        fixture = currentFixture;
      } else {
        // Create mock fixture for testing
        fixture = {
          id: fixtureId,
          week_number: 1,
          match_date: new Date().toISOString(),
          opposition: 'Test Opposition',
          venue: 'home',
          result: 'to_play',
          status: 'scheduled'
        };
      }

      // Load selected team for this week
      await loadSelectedTeam(fixture.week_number);
      
      // Initialize game assignments
      initializeGameAssignments();

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load match data';
      console.error('Match data loading error:', err);
    } finally {
      loading = false;
    }
  }

  async function loadSelectedTeam(weekNumber: number) {
    try {
      // Get attendance records and find selected players
      const attendance = await dashboardService.getWeeklyAttendance(weekNumber);
      const selectedAttendance = attendance.filter(a => a.selected);
      
      if (selectedAttendance.length === 0) {
        // If no team selected, show all available players for captain to select
        const allPlayers = await dashboardService.getAllPlayers();
        const availableAttendance = attendance.filter(a => a.attended);
        selectedPlayers = allPlayers.filter(p => 
          availableAttendance.some(a => a.player_id === p.id)
        );
      } else {
        // Load the selected team
        const allPlayers = await dashboardService.getAllPlayers();
        selectedPlayers = allPlayers.filter(p => 
          selectedAttendance.some(a => a.player_id === p.id)
        );
      }

    } catch (err) {
      console.warn('Could not load selected team:', err);
      // Fallback to all available players
      const allPlayers = await dashboardService.getAllPlayers();
      selectedPlayers = allPlayers.slice(0, 7); // Mock selection
    }
  }

  function initializeGameAssignments() {
    gameAssignments = Array.from({ length: 7 }, (_, i) => ({
      gameNumber: i + 1,
      playerId: null,
      playerName: null,
      status: 'pending' as const,
      homeScore: 0,
      awayScore: 0,
      result: null
    }));
  }

  function assignPlayerToGame(gameNumber: number, player: Player) {
    if (assignedPlayers.has(player.id)) {
      return; // Player already assigned
    }

    // Remove player from any previous assignment
    gameAssignments = gameAssignments.map(assignment => {
      if (assignment.playerId === player.id) {
        if (assignment.playerId) {
          assignedPlayers.delete(assignment.playerId);
        }
        return { ...assignment, playerId: null, playerName: null };
      }
      return assignment;
    });

    // Assign to new game
    gameAssignments = gameAssignments.map(assignment => {
      if (assignment.gameNumber === gameNumber) {
        assignedPlayers.add(player.id);
        return { ...assignment, playerId: player.id, playerName: player.name };
      }
      return assignment;
    });
  }

  function removePlayerFromGame(gameNumber: number) {
    const assignment = gameAssignments.find(a => a.gameNumber === gameNumber);
    if (assignment?.playerId) {
      assignedPlayers.delete(assignment.playerId);
      gameAssignments = gameAssignments.map(a => {
        if (a.gameNumber === gameNumber) {
          return { ...a, playerId: null, playerName: null };
        }
        return a;
      });
    }
  }

  function startGame(gameNumber: number) {
    const assignment = gameAssignments.find(a => a.gameNumber === gameNumber);
    if (!assignment?.playerId) {
      error = 'Please assign a player to this game first';
      return;
    }

    currentlyPlaying = gameNumber;
    
    // Update game status
    gameAssignments = gameAssignments.map(a => {
      if (a.gameNumber === gameNumber) {
        return { ...a, status: 'in_progress' as const };
      }
      return a;
    });

    // Navigate to scoring with game context
    goto(`/scoring/${fixtureId}?game=${gameNumber}&player=${assignment.playerId}`);
  }

  async function saveGameOrder() {
    try {
      saving = true;
      error = null;

      const assignedGames = gameAssignments.filter(a => a.playerId);
      if (assignedGames.length !== 7) {
        error = 'Please assign all 7 players to games';
        return;
      }

      // In a real app, save game assignments to database
      console.log('Saving game assignments:', gameAssignments);
      
      // Mock save success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save game order';
    } finally {
      saving = false;
    }
  }

  function getAvailablePlayersForGame(gameNumber: number) {
    const currentAssignment = gameAssignments.find(a => a.gameNumber === gameNumber);
    return selectedPlayers.filter(player => 
      !assignedPlayers.has(player.id) || player.id === currentAssignment?.playerId
    );
  }

  function getGameStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  function getGameStatusText(status: string) {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      default: return 'Pending';
    }
  }

  function getOverallResult() {
    const completed = gameAssignments.filter(g => g.status === 'completed');
    const wins = completed.filter(g => g.result === 'win').length;
    const losses = completed.filter(g => g.result === 'loss').length;
    
    return { wins, losses, total: completed.length };
  }

  function isMatchComplete() {
    return gameAssignments.every(g => g.status === 'completed');
  }

  function getMatchResult() {
    const result = getOverallResult();
    if (result.total === 7) {
      return result.wins > result.losses ? 'win' : 'loss';
    }
    return null;
  }

  async function completeFixture() {
    if (!isMatchComplete()) {
      error = 'All games must be completed before finishing the fixture';
      return;
    }

    try {
      saving = true;
      const result = getOverallResult();
      const matchResult = getMatchResult();

      // In a real app, save the fixture result to database
      console.log('Completing fixture:', {
        fixtureId,
        homeScore: result.wins,
        awayScore: result.losses,
        result: matchResult,
        gameResults: gameAssignments
      });

      // Mock save
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear localStorage
      localStorage.removeItem(`match_${fixtureId}`);

      // Navigate back to dashboard
      goto('/dashboard');
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to complete fixture';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Match Management - Week {fixture?.week_number || ''}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Match Management</h1>
        {#if fixture}
          <p class="text-sm text-gray-500">
            Week {fixture.week_number} vs {fixture.opposition}
          </p>
        {/if}
      </div>
      
      <div class="flex space-x-2">
        <button
          on:click={() => goto('/dashboard')}
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium 
                 min-h-[44px] transition-all touch-manipulation"
        >
          Back
        </button>
        
        {#if gameAssignments.filter(a => a.playerId).length === 7}
          <button
            on:click={saveGameOrder}
            disabled={saving}
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg 
                   text-sm font-medium min-h-[44px] transition-all touch-manipulation flex items-center"
          >
            {#if saving}
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
            {/if}
            Save Order
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="px-4 py-6 md:px-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{error}</p>
        <button 
          on:click={() => error = null}
          class="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Dismiss
        </button>
      </div>
    {/if}

    {#if loading}
      <LoadingSpinner message="Loading match data..." />
    {:else if fixture}
      <!-- Match Details -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Match Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Week</label>
            <div class="mt-1 text-lg font-semibold">{fixture.week_number}</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Opposition</label>
            <div class="mt-1 text-lg font-semibold">{fixture.opposition}</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Date</label>
            <div class="mt-1 text-lg font-semibold">{formatDate(fixture.match_date)}</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Venue</label>
            <div class="mt-1 text-lg font-semibold">{getVenueDisplay(fixture.venue)}</div>
          </div>
        </div>
      </div>

      <!-- Game Order Assignment -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Game Order</h2>
          <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {gameAssignments.filter(a => a.playerId).length}/7 Assigned
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {#each gameAssignments as assignment}
            <div class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900">Game {assignment.gameNumber}</h3>
                <span class="px-2 py-1 rounded-full text-xs font-medium {getGameStatusColor(assignment.status)}">
                  {getGameStatusText(assignment.status)}
                </span>
              </div>

              {#if assignment.playerId && assignment.playerName}
                <!-- Assigned Player -->
                <div class="mb-3">
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div class="font-medium text-blue-900">{assignment.playerName}</div>
                    {#if assignment.status === 'completed'}
                      <div class="text-sm text-blue-700 mt-1">
                        Result: {assignment.result === 'win' ? 'Won' : 'Lost'}
                      </div>
                    {/if}
                  </div>
                </div>

                <div class="space-y-2">
                  {#if assignment.status === 'pending'}
                    <button
                      on:click={() => startGame(assignment.gameNumber)}
                      class="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg 
                             text-sm font-medium min-h-[40px] transition-all touch-manipulation"
                    >
                      Start Game
                    </button>
                  {:else if assignment.status === 'in_progress'}
                    <button
                      on:click={() => goto(`/scoring/${fixtureId}?game=${assignment.gameNumber}&player=${assignment.playerId}`)}
                      class="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg 
                             text-sm font-medium min-h-[40px] transition-all touch-manipulation"
                    >
                      Continue
                    </button>
                  {/if}

                  <button
                    on:click={() => removePlayerFromGame(assignment.gameNumber)}
                    disabled={assignment.status !== 'pending'}
                    class="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-2 
                           rounded-lg text-sm font-medium min-h-[40px] transition-all touch-manipulation"
                  >
                    Remove
                  </button>
                </div>
              {:else}
                <!-- No Player Assigned -->
                <div class="mb-3">
                  <div class="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                    <div class="text-gray-500 text-sm">No player assigned</div>
                  </div>
                </div>

                <select 
                  on:change={(e) => {
                    const playerId = e.target.value;
                    if (playerId) {
                      const player = selectedPlayers.find(p => p.id === playerId);
                      if (player) {
                        assignPlayerToGame(assignment.gameNumber, player);
                      }
                    }
                  }}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select player...</option>
                  {#each getAvailablePlayersForGame(assignment.gameNumber) as player}
                    <option value={player.id}>
                      {player.name} ({player.win_percentage || 0}%)
                    </option>
                  {/each}
                </select>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Match Results Summary -->
      {#if getOverallResult().total > 0}
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Match Progress</h2>
            {@const result = getOverallResult()}
            {@const matchResult = getMatchResult()}
            {#if isMatchComplete()}
              <span class="px-4 py-2 rounded-full text-sm font-medium 
                          {matchResult === 'win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                {matchResult === 'win' ? 'Match Won!' : 'Match Lost'}
              </span>
            {:else}
              <span class="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                In Progress
              </span>
            {/if}
          </div>

          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600">{result.wins}</div>
              <div class="text-sm text-gray-600">Games Won</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-red-600">{result.losses}</div>
              <div class="text-sm text-gray-600">Games Lost</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600">{7 - result.total}</div>
              <div class="text-sm text-gray-600">Remaining</div>
            </div>
          </div>

          {#if isMatchComplete()}
            <div class="flex justify-center">
              <button
                on:click={completeFixture}
                disabled={saving}
                class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg 
                       font-medium min-h-[44px] transition-all touch-manipulation flex items-center"
              >
                {#if saving}
                  <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                {/if}
                Complete Fixture & Save Results
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Available Players -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Players</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each selectedPlayers as player}
            {@const isAssigned = assignedPlayers.has(player.id)}
            <div class="border rounded-lg p-4 {isAssigned ? 'bg-gray-50 border-gray-300' : 'border-gray-200 hover:border-gray-300'} 
                        transition-colors">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">{player.name}</div>
                  <div class="text-sm text-gray-500">
                    {player.win_percentage || 0}% win rate • {player.games_played || 0} games
                  </div>
                </div>
                <div class="text-right">
                  {#if isAssigned}
                    {@const assignedGame = gameAssignments.find(a => a.playerId === player.id)}
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Game {assignedGame?.gameNumber || '?'}
                    </span>
                  {:else}
                    <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Available
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </main>
</div>