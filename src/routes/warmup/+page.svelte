<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardService } from '$lib/services/dashboardService';
  import type { Player } from '$lib/types/dashboard';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import { formatPlayerName } from '$lib/utils/formatting';

  interface WarmupSession {
    id: string;
    format: 'single_leg' | 'best_of_3';
    players: Player[];
    status: 'setup' | 'in_progress' | 'completed';
    currentRound: number;
    matches: WarmupMatch[];
    winner?: Player;
    createdAt: string;
  }

  interface WarmupMatch {
    id: string;
    round: number;
    player1: Player;
    player2: Player;
    winner?: Player;
    status: 'pending' | 'in_progress' | 'completed';
  }

  // Services
  const dashboardService = new DashboardService();

  // State
  let loading = true;
  let error: string | null = null;
  let availablePlayers: Player[] = [];
  let selectedPlayers: Player[] = [];
  let currentSession: WarmupSession | null = null;
  let sessionHistory: WarmupSession[] = [];

  // Settings
  let tournamentFormat: 'single_leg' | 'best_of_3' = 'single_leg';
  let maxPlayers = 8;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = null;
      
      // Load available players (active only for warmup)
      const allPlayers = await dashboardService.getAllPlayers();
      availablePlayers = allPlayers.filter(p => !p.drop_week);
      
      // Load any existing session from localStorage
      loadSessionFromStorage();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load warmup data';
      console.error('Warmup loading error:', err);
    } finally {
      loading = false;
    }
  }

  function loadSessionFromStorage() {
    try {
      const stored = localStorage.getItem('darts_warmup_session');
      if (stored) {
        currentSession = JSON.parse(stored);
      }
      
      const historyStored = localStorage.getItem('darts_warmup_history');
      if (historyStored) {
        sessionHistory = JSON.parse(historyStored);
      }
    } catch (err) {
      console.warn('Failed to load session from storage:', err);
    }
  }

  function saveSessionToStorage() {
    try {
      if (currentSession) {
        localStorage.setItem('darts_warmup_session', JSON.stringify(currentSession));
      } else {
        localStorage.removeItem('darts_warmup_session');
      }
      localStorage.setItem('darts_warmup_history', JSON.stringify(sessionHistory));
    } catch (err) {
      console.warn('Failed to save session to storage:', err);
    }
  }

  function togglePlayerSelection(player: Player) {
    if (selectedPlayers.find(p => p.id === player.id)) {
      selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
    } else if (selectedPlayers.length < maxPlayers) {
      selectedPlayers = [...selectedPlayers, player];
    }
  }

  function startTournament() {
    if (selectedPlayers.length < 2) {
      error = 'Please select at least 2 players';
      return;
    }

    // Shuffle players for random bracket
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
    
    currentSession = {
      id: crypto.randomUUID(),
      format: tournamentFormat,
      players: shuffledPlayers,
      status: 'in_progress',
      currentRound: 1,
      matches: generateMatches(shuffledPlayers),
      createdAt: new Date().toISOString()
    };
    
    saveSessionToStorage();
    error = null;
  }

  function generateMatches(players: Player[]): WarmupMatch[] {
    const matches: WarmupMatch[] = [];
    
    // Pair up players for first round
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        matches.push({
          id: crypto.randomUUID(),
          round: 1,
          player1: players[i],
          player2: players[i + 1],
          status: 'pending'
        });
      } else {
        // Odd number of players - bye to next round
        matches.push({
          id: crypto.randomUUID(),
          round: 1,
          player1: players[i],
          player2: players[i], // Self-match indicates bye
          winner: players[i],
          status: 'completed'
        });
      }
    }
    
    return matches;
  }

  function recordMatchWinner(match: WarmupMatch, winner: Player) {
    if (!currentSession) return;
    
    // Update match
    const updatedMatches = currentSession.matches.map(m => {
      if (m.id === match.id) {
        return { ...m, winner, status: 'completed' as const };
      }
      return m;
    });
    
    currentSession.matches = updatedMatches;
    
    // Check if round is complete
    const currentRoundMatches = updatedMatches.filter(m => m.round === currentSession.currentRound);
    const completedMatches = currentRoundMatches.filter(m => m.status === 'completed');
    
    if (completedMatches.length === currentRoundMatches.length) {
      // Round complete - generate next round or finish tournament
      const winners = completedMatches.map(m => m.winner!);
      
      if (winners.length === 1) {
        // Tournament complete
        currentSession.status = 'completed';
        currentSession.winner = winners[0];
        
        // Add to history
        sessionHistory = [currentSession, ...sessionHistory.slice(0, 9)]; // Keep last 10
      } else {
        // Generate next round
        currentSession.currentRound++;
        const nextRoundMatches = generateMatches(winners);
        // Update round numbers
        nextRoundMatches.forEach(m => m.round = currentSession!.currentRound);
        currentSession.matches = [...currentSession.matches, ...nextRoundMatches];
      }
    }
    
    saveSessionToStorage();
  }

  function resetTournament() {
    currentSession = null;
    selectedPlayers = [];
    error = null;
    saveSessionToStorage();
  }

  function getCurrentRoundMatches(): WarmupMatch[] {
    if (!currentSession) return [];
    return currentSession.matches.filter(m => 
      m.round === currentSession.currentRound && m.status !== 'completed'
    );
  }

  function getCompletedMatches(): WarmupMatch[] {
    if (!currentSession) return [];
    return currentSession.matches.filter(m => m.status === 'completed');
  }

  function getRoundName(round: number): string {
    if (!currentSession) return '';
    const totalPlayers = currentSession.players.length;
    
    if (totalPlayers <= 2) return 'Final';
    if (totalPlayers <= 4 && round === 2) return 'Final';
    if (totalPlayers <= 4 && round === 1) return 'Semi-Final';
    if (totalPlayers <= 8 && round === 3) return 'Final';
    if (totalPlayers <= 8 && round === 2) return 'Semi-Final';
    if (totalPlayers <= 8 && round === 1) return 'Quarter-Final';
    
    return `Round ${round}`;
  }
</script>

<svelte:head>
  <title>Practice Tournament - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Mobile-first header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg md:text-xl font-bold text-gray-900">Practice Tournament</h1>
        <p class="text-sm text-gray-500">Warm-up competition</p>
      </div>
      
      {#if currentSession}
        <button
          on:click={resetTournament}
          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium 
                 min-h-[44px] transition-all touch-manipulation"
        >
          Reset
        </button>
      {:else}
        <button
          on:click={loadData}
          disabled={loading}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 
                 rounded-lg text-sm font-medium min-h-[44px] transition-all touch-manipulation"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      {/if}
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
      <LoadingSpinner message="Loading warmup data..." />
    {:else if !currentSession}
      <!-- Tournament Setup -->
      <section class="mb-8">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Setup Tournament</h2>
          
          <!-- Format Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tournament Format
            </label>
            <div class="flex flex-col sm:flex-row gap-2">
              <label class="flex items-center">
                <input 
                  type="radio" 
                  name="format" 
                  value="single_leg"
                  bind:group={tournamentFormat}
                  class="mr-2"
                />
                <span class="text-sm">Single Leg (Quick)</span>
              </label>
              <label class="flex items-center">
                <input 
                  type="radio" 
                  name="format" 
                  value="best_of_3"
                  bind:group={tournamentFormat}
                  class="mr-2"
                />
                <span class="text-sm">Best of 3 (Standard)</span>
              </label>
            </div>
          </div>

          <!-- Player Selection -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">
                Select Players ({selectedPlayers.length}/{maxPlayers})
              </h3>
              <button
                on:click={() => selectedPlayers = []}
                disabled={selectedPlayers.length === 0}
                class="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400"
              >
                Clear All
              </button>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each availablePlayers as player}
                {@const isSelected = selectedPlayers.find(p => p.id === player.id) !== undefined}
                {@const canSelect = selectedPlayers.length < maxPlayers}
                
                <div 
                  class="bg-white p-4 rounded-lg border-2 cursor-pointer transition-all
                         {isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                         {!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}"
                  on:click={() => (canSelect || isSelected) && togglePlayerSelection(player)}
                  on:keydown={(e) => e.key === 'Enter' && (canSelect || isSelected) && togglePlayerSelection(player)}
                  role="button"
                  tabindex="0"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span class="text-blue-600 font-semibold text-sm">
                        {player.name.charAt(0)}
                      </span>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900">{player.name}</h4>
                      <div class="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{player.games_won || 0}W-{player.games_lost || 0}L</span>
                        <span>•</span>
                        <span>{player.win_percentage || 0}%</span>
                      </div>
                    </div>
                    {#if isSelected}
                      <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm">✓</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
            
            {#if availablePlayers.length === 0}
              <div class="text-center py-8">
                <p class="text-gray-500">No active players available</p>
              </div>
            {/if}
          </div>

          <!-- Start Button -->
          <div class="flex justify-center">
            <button
              on:click={startTournament}
              disabled={selectedPlayers.length < 2}
              class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 
                     rounded-lg font-medium min-h-[44px] transition-all touch-manipulation"
            >
              Start Tournament ({selectedPlayers.length} players)
            </button>
          </div>
        </div>
      </section>

      <!-- Session History -->
      {#if sessionHistory.length > 0}
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Tournaments</h2>
          <div class="space-y-4">
            {#each sessionHistory.slice(0, 5) as session}
              <div class="bg-white p-4 rounded-lg shadow-lg">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="font-medium text-gray-900">
                      {session.players.length} Players
                    </span>
                    <span class="text-gray-500">•</span>
                    <span class="text-sm text-gray-500">
                      {session.format === 'single_leg' ? 'Single Leg' : 'Best of 3'}
                    </span>
                  </div>
                  <span class="text-xs text-gray-500">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {#if session.winner}
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Winner:</span>
                    <span class="font-medium text-green-600">🏆 {session.winner.name}</span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}

    {:else}
      <!-- Active Tournament -->
      <section>
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                {getRoundName(currentSession.currentRound)}
              </h2>
              <p class="text-sm text-gray-500">
                {currentSession.players.length} players • {currentSession.format === 'single_leg' ? 'Single Leg' : 'Best of 3'}
              </p>
            </div>
            
            {#if currentSession.status === 'completed' && currentSession.winner}
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600 mb-1">
                  🏆 Winner!
                </div>
                <div class="font-medium text-gray-900">
                  {currentSession.winner.name}
                </div>
              </div>
            {/if}
          </div>
          
          <!-- Tournament Bracket Progress -->
          <div class="bg-gray-50 p-4 rounded-lg mb-6">
            <div class="text-sm text-gray-600 mb-2">Tournament Progress</div>
            <div class="flex items-center space-x-2">
              {#each Array.from({length: Math.ceil(Math.log2(currentSession.players.length))}) as _, i}
                {@const roundNum = i + 1}
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                              {roundNum < currentSession.currentRound ? 'bg-green-500 text-white' : 
                               roundNum === currentSession.currentRound ? 'bg-blue-500 text-white' : 
                               'bg-gray-200 text-gray-600'}">
                    {roundNum}
                  </div>
                  {#if i < Math.ceil(Math.log2(currentSession.players.length)) - 1}
                    <div class="w-4 h-0.5 bg-gray-300"></div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
        
        <!-- Current Round Matches -->
        {#if getCurrentRoundMatches().length > 0}
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 class="font-medium text-gray-900 mb-4">
              {getRoundName(currentSession.currentRound)} Matches
            </h3>
            
            <div class="space-y-4">
              {#each getCurrentRoundMatches() as match}
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex-1 text-center">
                      <div class="font-medium text-gray-900">{match.player1.name}</div>
                      <div class="text-xs text-gray-500">{match.player1.win_percentage || 0}% win rate</div>
                    </div>
                    
                    <div class="px-4">
                      <div class="text-xl font-bold text-gray-400">VS</div>
                    </div>
                    
                    <div class="flex-1 text-center">
                      <div class="font-medium text-gray-900">{match.player2.name}</div>
                      <div class="text-xs text-gray-500">{match.player2.win_percentage || 0}% win rate</div>
                    </div>
                  </div>
                  
                  {#if match.player1.id !== match.player2.id}
                    <div class="flex space-x-2 mt-4">
                      <button
                        on:click={() => recordMatchWinner(match, match.player1)}
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium
                               min-h-[44px] transition-all touch-manipulation"
                      >
                        {formatPlayerName(match.player1.name, true)} Wins
                      </button>
                      <button
                        on:click={() => recordMatchWinner(match, match.player2)}
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium
                               min-h-[44px] transition-all touch-manipulation"
                      >
                        {formatPlayerName(match.player2.name, true)} Wins
                      </button>
                    </div>
                  {:else}
                    <div class="mt-4 text-center text-sm text-gray-500">
                      Bye to next round
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Completed Matches -->
        {#if getCompletedMatches().length > 0}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="font-medium text-gray-900 mb-4">Completed Matches</h3>
            
            <div class="space-y-3">
              {#each getCompletedMatches().reverse() as match}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="text-sm">
                    <span class="font-medium">{getRoundName(match.round)}</span>
                  </div>
                  <div class="text-sm text-center">
                    <span class={match.winner?.id === match.player1.id ? 'font-semibold text-green-600' : 'text-gray-600'}>
                      {formatPlayerName(match.player1.name, true)}
                    </span>
                    <span class="text-gray-400 mx-2">vs</span>
                    <span class={match.winner?.id === match.player2.id ? 'font-semibold text-green-600' : 'text-gray-600'}>
                      {formatPlayerName(match.player2.name, true)}
                    </span>
                  </div>
                  <div class="text-sm text-green-600 font-medium">
                    {#if match.winner}
                      🏆 {formatPlayerName(match.winner.name, true)}
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </section>
    {/if}
  </main>
</div>