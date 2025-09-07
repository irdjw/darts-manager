<!-- PersonalStatsTracker.svelte - Solo practice session tracker -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { personalGameService } from '../services/personalGameService';
  import MobileDartEntry from './MobileDartEntry.svelte';
  import LiveDartStats from './LiveDartStats.svelte';
  import type { PersonalGame, PersonalStats } from '../database/types';
  import type { DartThrow, PlayerGameStats } from '../types/scoring';

  // Props
  export let playerId: string = 'personal-player';
  export let playerName: string = 'Practice Player';
  export let gameType: PersonalGame['game_type'] = 'practice_501';
  export let opponentName: string = 'Practice Opponent';
  export let onSessionComplete: ((stats: PersonalStats) => void) | undefined = undefined;

  // Session state
  let currentGameId: string | null = null;
  let sessionStartTime: Date | null = null;
  let sessionNotes: string = '';
  let isSessionActive: boolean = false;
  let sessionStats: Partial<PlayerGameStats> = {};
  let allSessionDarts: DartThrow[] = [];
  let legsCompleted: number = 0;
  let legsWon: number = 0;
  let currentLegNumber: number = 1;

  // Game type configurations
  const gameTypeConfigs = {
    practice_501: {
      label: '501 Practice',
      description: 'Standard 501 game for general practice',
      startingScore: 501,
      targetLegs: 1
    },
    around_clock: {
      label: 'Around the Clock',
      description: 'Hit numbers 1-20 in sequence',
      startingScore: 20,
      targetLegs: 1
    },
    cricket: {
      label: 'Cricket Practice',
      description: 'Practice hitting 20, 19, 18, 17, 16, 15, and bull',
      startingScore: 6,
      targetLegs: 1
    },
    doubles_practice: {
      label: 'Doubles Practice',
      description: 'Practice hitting all doubles around the board',
      startingScore: 20,
      targetLegs: 1
    },
    checkout_practice: {
      label: 'Checkout Practice',
      description: 'Practice finishing from common checkout positions',
      startingScore: 170,
      targetLegs: 1
    }
  };

  // Reactive computed values
  $: currentConfig = gameTypeConfigs[gameType];
  $: sessionDuration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60) : 0;
  $: averageScore = allSessionDarts.length > 0 ? 
    Math.round((allSessionDarts.reduce((sum, dart) => sum + dart.dartScore, 0) / allSessionDarts.length) * 100) / 100 : 0;

  // Start a new practice session
  async function startSession() {
    try {
      sessionStartTime = new Date();
      isSessionActive = true;
      allSessionDarts = [];
      legsCompleted = 0;
      legsWon = 0;
      currentLegNumber = 1;

      // Create a new personal game record
      currentGameId = await personalGameService.createPersonalGame(
        playerId,
        opponentName,
        gameType,
        sessionNotes
      );
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start practice session');
    }
  }

  // End the current session
  async function endSession(gameWon: boolean = false) {
    if (!currentGameId || !sessionStartTime) return;

    try {
      // Calculate final statistics
      const finalStats = calculateSessionStats();
      
      // Complete the game in the database
      await personalGameService.completePersonalGame(
        currentGameId,
        gameWon,
        legsCompleted,
        legsWon,
        finalStats,
        sessionDuration,
        allSessionDarts
      );

      // Update goal progress
      await personalGameService.updateGoalProgress(playerId);

      // Create PersonalStats object for callback
      if (onSessionComplete) {
        const personalStats: PersonalStats = {
          id: crypto.randomUUID(),
          player_id: playerId,
          player_name: playerName,
          game_id: currentGameId,
          game_type: gameType,
          opponent_name: opponentName,
          game_won: gameWon,
          legs_played: legsCompleted,
          legs_won: legsWon,
          total_darts: finalStats.totalDarts,
          total_points: finalStats.totalPoints,
          average_score: finalStats.average,
          scores_180: finalStats.scores180,
          scores_140_plus: finalStats.scores140Plus,
          scores_100_plus: finalStats.scores100Plus,
          scores_80_plus: finalStats.scores80Plus,
          double_attempts: finalStats.doubleAttempts,
          double_hits: finalStats.doubleHits,
          double_percentage: finalStats.doublePercentage,
          checkout_attempts: finalStats.checkoutAttempts,
          checkout_hits: finalStats.checkoutHits,
          checkout_percentage: finalStats.checkoutPercentage,
          highest_checkout: finalStats.highestCheckout,
          three_dart_average: finalStats.average * 3,
          game_date: new Date().toISOString().split('T')[0],
          session_duration_minutes: sessionDuration,
          created_at: new Date().toISOString()
        };
        
        onSessionComplete(personalStats);
      }

      // Reset session state
      resetSession();

    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Failed to save session data');
    }
  }

  // Calculate comprehensive session statistics
  function calculateSessionStats(): PlayerGameStats {
    const totalDarts = allSessionDarts.length;
    const totalPoints = allSessionDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
    const average = totalDarts > 0 ? totalPoints / totalDarts : 0;

    // Calculate turn-based statistics
    const turnTotals = new Map<string, number>();
    allSessionDarts.forEach(dart => {
      const turnKey = `${dart.legNumber}-${dart.turnNumber}`;
      turnTotals.set(turnKey, (turnTotals.get(turnKey) || 0) + dart.dartScore);
    });

    const turnScores = Array.from(turnTotals.values());
    const doubleAttempts = allSessionDarts.filter(dart => dart.isDoubleAttempt).length;
    const doubleHits = allSessionDarts.filter(dart => dart.isDoubleAttempt && dart.dartScore > 0).length;
    const checkoutAttempts = allSessionDarts.filter(dart => dart.isCheckoutAttempt).length;
    const checkoutHits = allSessionDarts.filter(dart => dart.checkoutSuccessful).length;

    return {
      playerId,
      playerName,
      gameWon: false, // Will be set when session ends
      legsPlayed: legsCompleted,
      legsWon: legsWon,
      totalDarts,
      totalPoints,
      average: Math.round(average * 100) / 100,
      scores80Plus: turnScores.filter(score => score >= 80).length,
      scores100Plus: turnScores.filter(score => score >= 100).length,
      scores140Plus: turnScores.filter(score => score >= 140).length,
      scores180: turnScores.filter(score => score === 180).length,
      doubleAttempts,
      doubleHits,
      doublePercentage: doubleAttempts > 0 ? Math.round((doubleHits / doubleAttempts) * 100 * 100) / 100 : 0,
      checkoutAttempts,
      checkoutHits,
      checkoutPercentage: checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 100 * 100) / 100 : 0,
      highestCheckout: Math.max(...checkoutHits.length > 0 ? allSessionDarts.filter(d => d.checkoutSuccessful).map(d => d.dartScore) : [0]),
      finishPositions: []
    };
  }

  // Reset session state
  function resetSession() {
    currentGameId = null;
    sessionStartTime = null;
    isSessionActive = false;
    allSessionDarts = [];
    legsCompleted = 0;
    legsWon = 0;
    currentLegNumber = 1;
    sessionNotes = '';
  }

  // Handle dart thrown from mobile interface
  function handleDartThrown(event: CustomEvent<{ dart: DartThrow }>) {
    const dart = event.detail.dart;
    allSessionDarts = [...allSessionDarts, dart];
    
    // Update session stats for real-time display
    updateSessionStats();
  }

  // Handle leg/game completion
  function handleGameComplete(event: CustomEvent<{ winner: string; finalStats: any }>) {
    legsCompleted++;
    if (event.detail.winner === 'home') {
      legsWon++;
    }
    
    // For most practice games, one leg = complete game
    if (legsCompleted >= currentConfig.targetLegs) {
      endSession(legsWon > legsCompleted / 2);
    } else {
      // Start next leg
      currentLegNumber++;
    }
  }

  // Update session statistics for live display
  function updateSessionStats() {
    sessionStats = calculateSessionStats();
  }

  // Pause/resume session
  function togglePause() {
    // Implementation for pause functionality
    // Could stop timers, save intermediate state, etc.
  }

  // Quick finish session (for practice purposes)
  function quickFinish() {
    if (confirm('End practice session now?')) {
      endSession(true); // Consider it a win for practice
    }
  }

  // Save session notes
  function saveNotes() {
    // Notes are automatically included when session ends
  }
</script>

<!-- Practice Session Interface -->
<div class="min-h-screen bg-gray-900 text-white">
  <!-- Session Header -->
  <div class="bg-gray-800 p-4 shadow-lg">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-xl font-bold text-orange-400">
        {currentConfig.label}
      </h1>
      <div class="text-sm text-gray-400">
        {#if isSessionActive}
          {sessionDuration}min
        {:else}
          Ready to start
        {/if}
      </div>
    </div>
    
    <p class="text-gray-300 text-sm mb-3">
      {currentConfig.description}
    </p>

    {#if !isSessionActive}
      <!-- Pre-session setup -->
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">
            Session Notes (Optional)
          </label>
          <input
            bind:value={sessionNotes}
            placeholder="What are you focusing on today?"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        
        <button
          on:click={startSession}
          class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all min-h-[60px]"
          style="touch-action: manipulation;"
        >
          🎯 Start Practice Session
        </button>
      </div>
    {:else}
      <!-- Active session controls -->
      <div class="flex gap-2">
        <button
          on:click={quickFinish}
          class="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded-lg transition-all"
          style="touch-action: manipulation;"
        >
          Finish Session
        </button>
        
        <button
          on:click={togglePause}
          class="px-4 bg-yellow-600 hover:bg-yellow-500 text-white font-medium py-2 rounded-lg transition-all"
          style="touch-action: manipulation;"
        >
          ⏸️
        </button>
      </div>
    {/if}
  </div>

  {#if isSessionActive}
    <!-- Live Session Statistics -->
    <div class="p-4">
      <div class="bg-gray-800 rounded-xl p-4 mb-4">
        <h3 class="text-lg font-semibold mb-3 text-orange-400">Live Session Stats</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{averageScore.toFixed(1)}</div>
            <div class="text-sm text-gray-400">Average</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{allSessionDarts.length}</div>
            <div class="text-sm text-gray-400">Darts Thrown</div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="bg-gray-700 rounded-lg p-2">
            <div class="text-yellow-400 font-bold">{sessionStats.scores180 || 0}</div>
            <div class="text-xs text-gray-400">180s</div>
          </div>
          <div class="bg-gray-700 rounded-lg p-2">
            <div class="text-green-400 font-bold">{sessionStats.scores140Plus || 0}</div>
            <div class="text-xs text-gray-400">140+</div>
          </div>
          <div class="bg-gray-700 rounded-lg p-2">
            <div class="text-blue-400 font-bold">{sessionStats.scores100Plus || 0}</div>
            <div class="text-xs text-gray-400">100+</div>
          </div>
          <div class="bg-gray-700 rounded-lg p-2">
            <div class="text-purple-400 font-bold">{sessionStats.scores80Plus || 0}</div>
            <div class="text-xs text-gray-400">80+</div>
          </div>
        </div>

        {#if sessionStats.doubleAttempts && sessionStats.doubleAttempts > 0}
          <div class="mt-4 p-3 bg-gray-700 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-gray-300">Double Percentage</span>
              <span class="text-white font-bold">
                {sessionStats.doublePercentage?.toFixed(1)}% 
                ({sessionStats.doubleHits}/{sessionStats.doubleAttempts})
              </span>
            </div>
          </div>
        {/if}

        {#if sessionStats.checkoutAttempts && sessionStats.checkoutAttempts > 0}
          <div class="mt-2 p-3 bg-gray-700 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-gray-300">Checkout Percentage</span>
              <span class="text-white font-bold">
                {sessionStats.checkoutPercentage?.toFixed(1)}% 
                ({sessionStats.checkoutHits}/{sessionStats.checkoutAttempts})
              </span>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Mobile Dart Entry for the practice session -->
    <MobileDartEntry
      gameId={currentGameId || 'practice-session'}
      homePlayerName={playerName}
      awayPlayerName={opponentName}
      homePlayerId={playerId}
      awayPlayerId="practice-opponent"
      isLeagueMatch={false}
      startingScore={currentConfig.startingScore}
      on:dartThrown={handleDartThrown}
      on:gameComplete={handleGameComplete}
    />
  {:else}
    <!-- Pre-session game type selector -->
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-4 text-orange-400">Choose Practice Type</h3>
      
      <div class="space-y-3">
        {#each Object.entries(gameTypeConfigs) as [type, config]}
          <button
            on:click={() => gameType = type}
            class="w-full p-4 rounded-xl border-2 transition-all text-left
                   {gameType === type 
                     ? 'border-orange-500 bg-orange-500/10 text-white' 
                     : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'}"
            style="touch-action: manipulation;"
          >
            <div class="font-semibold mb-1">{config.label}</div>
            <div class="text-sm opacity-90">{config.description}</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Prevent zoom on double tap */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* Focus states */
  button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }

  input:focus {
    outline: none;
  }
</style>