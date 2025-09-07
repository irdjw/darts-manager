<!-- ScoringEngine.svelte - Mobile-first unified scoring engine component -->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import MobileDartEntry from './MobileDartEntry.svelte';
  import { 
    gameState, 
    scoringMode, 
    currentTurnDarts, 
    turnTotalInput, 
    dartInput,
    showCheckouts,
    checkoutRoutes,
    currentScore,
    currentDartsRemaining,
    canCompleteTurn,
    currentTurnTotal,
    scoringActions,
    currentLegStats,
    legStartStatus
  } from '../stores/scoringStores';
  import { checkoutService } from '../services/checkoutService';
  import { statisticsService } from '../services/statisticsService';
  import type { ScoringEngineProps, DartThrow, PlayerGameStats, LegData } from '../types/scoring';
  import { GAME_MODES } from '../types/scoring';
  
  const dispatch = createEventDispatcher();

  // Props
  export let gameId: string;
  export let homePlayerName: string;
  export let awayPlayerName: string;
  export let homePlayerId: string = 'home-player-id';
  export let awayPlayerId: string = 'away-player-id';
  export let isLeagueMatch: boolean = false;
  export let startingScore: number = 501;
  export let mode: 'dart-by-dart' | 'turn-total' | 'simple' = 'dart-by-dart';
  export let venue: 'home' | 'away' | undefined = undefined;
  
  // Mark as used to avoid unused export warning
  $: currentStartingScore = startingScore;
  export let onGameComplete: ((stats: any[]) => void) | undefined = undefined;
  export let onScoreUpdate: ((homeScore: number, awayScore: number) => void) | undefined = undefined;
  
  // Mobile-first mode flag
  export let useMobileInterface: boolean = true;

  // Reactive state subscriptions
  let currentGameState: any;
  let currentScoringMode: any;
  let currentTurnDartsValue: DartThrow[];
  let turnTotalValue: string;
  let dartInputValue: string;
  let showCheckoutsValue: boolean;
  let checkoutRoutesValue: any[];
  let currentScoreValue: number;
  let dartsRemainingValue: number;
  let canCompleteTurnValue: boolean;
  let currentTurnTotalValue: number;
  let statsValue: any;
  let legStartStatusValue: any;

  // Game tracking variables
  let allDarts: DartThrow[] = [];
  let allLegs: LegData[] = [];
  let gameStartTime = new Date();

  // Store subscriptions
  const unsubscribers: (() => void)[] = [];

  onMount(() => {
    // Initialize the game
    scoringActions.initializeGame(
      gameId, 
      homePlayerName, 
      awayPlayerName, 
      isLeagueMatch ? 'league' : 'practice',
      venue
    );
    
    // Set initial scoring mode
    scoringActions.setScoringMode(mode);

    // Subscribe to all stores
    unsubscribers.push(
      gameState.subscribe(value => currentGameState = value),
      scoringMode.subscribe(value => currentScoringMode = value),
      currentTurnDarts.subscribe(value => currentTurnDartsValue = value),
      turnTotalInput.subscribe(value => turnTotalValue = value),
      dartInput.subscribe(value => dartInputValue = value),
      showCheckouts.subscribe(value => showCheckoutsValue = value),
      checkoutRoutes.subscribe(value => checkoutRoutesValue = value),
      currentScore.subscribe(value => {
        currentScoreValue = value;
        updateCheckoutRoutes();
      }),
      currentDartsRemaining.subscribe(value => dartsRemainingValue = value),
      canCompleteTurn.subscribe(value => canCompleteTurnValue = value),
      currentTurnTotal.subscribe(value => currentTurnTotalValue = value),
      currentLegStats.subscribe(value => statsValue = value),
      legStartStatus.subscribe(value => legStartStatusValue = value)
    );
  });

  onDestroy(() => {
    unsubscribers.forEach(unsub => unsub());
  });

  // Update checkout routes when score or darts remaining changes
  function updateCheckoutRoutes() {
    if (currentScoreValue && dartsRemainingValue) {
      const routes = checkoutService.getRecommendedFinishes(currentScoreValue, dartsRemainingValue);
      scoringActions.setCheckoutRoutes(routes);
    }
  }

  // Handle dart input (dart-by-dart mode)
  function addDart() {
    const dartValue = parseInt(dartInputValue);
    
    if (!validateDartScore(dartValue)) return;

    // Check if player has started the leg (must start on double)
    const hasPlayerStarted = currentGameState.currentThrower === 'home' 
      ? legStartStatusValue?.homeStarted 
      : legStartStatusValue?.awayStarted;
    
    const isDoubleAttempt = checkoutService.isDoubleScore(dartValue);
    
    // If player hasn't started and this isn't a double, reject the dart
    if (!hasPlayerStarted && dartValue > 0 && !isDoubleAttempt) {
      alert('You must start on a double! Please throw at a double to begin scoring.');
      return;
    }

    const newScore = currentScoreValue - dartValue;
    
    // Enhanced checkout detection
    const wasCheckoutOpportunity = checkoutService.isCheckoutOpportunity(currentScoreValue);
    const isValidFinish = newScore === 0 && isDoubleAttempt;
    
    // Check for bust
    if (newScore < 0 || newScore === 1) {
      handleBust();
      return;
    }

    // If this is the first scoring dart and it's a double, mark player as started
    if (!hasPlayerStarted && dartValue > 0 && isDoubleAttempt) {
      scoringActions.markPlayerStarted(currentGameState.currentThrower);
    }

    // Add dart to current turn
    scoringActions.addDartToCurrentTurn(
      dartValue, 
      isDoubleAttempt, 
      wasCheckoutOpportunity, 
      isValidFinish
    );

    // Clear input
    scoringActions.setDartInput('');

    // Check for game completion
    if (isValidFinish) {
      completeGame();
    } else if (currentTurnDartsValue.length >= 3) {
      completeTurn();
    }
  }

  // Handle turn total input (turn-total mode)
  function addTurnTotal() {
    const total = parseInt(turnTotalValue);
    
    if (isNaN(total) || total < 0 || total > 180) {
      alert('Please enter a valid turn total (0-180)');
      return;
    }

    // Check if player has started the leg (must start on double)
    const hasPlayerStarted = currentGameState.currentThrower === 'home' 
      ? legStartStatusValue?.homeStarted 
      : legStartStatusValue?.awayStarted;
    
    // If player hasn't started and scored points, confirm they started on a double
    if (!hasPlayerStarted && total > 0) {
      const confirmedDoubleStart = confirm(
        `You scored ${total} points. Did you start on a double? (Required to begin scoring)`
      );
      
      if (confirmedDoubleStart) {
        scoringActions.markPlayerStarted(currentGameState.currentThrower);
      } else {
        alert('You must start on a double! This turn will not count.');
        return;
      }
    }

    const newScore = currentScoreValue - total;
    
    // Check for bust
    if (newScore < 0 || newScore === 1) {
      handleBust();
      return;
    }

    // For turn-total mode, we need to verify the finish was on a double
    const wasCheckoutOpportunity = checkoutService.isCheckoutOpportunity(currentScoreValue);
    const couldBeFinish = newScore === 0;

    if (couldBeFinish) {
      // In turn-total mode, ask player to confirm they finished on a double
      const confirmedDoubleFinish = confirm(
        `You scored ${total} to finish on 0. Did you finish on a double? (Required to win)`
      );
      
      if (confirmedDoubleFinish) {
        completeGame();
      } else {
        alert('You must finish on a double! This turn will be treated as a bust.');
        handleBust();
      }
    } else {
      completeTurn();
    }
  }

  // Validate dart score
  function validateDartScore(score: number): boolean {
    if (isNaN(score) || score < 0 || score > 60) {
      alert('Please enter a valid dart score (0-60)');
      return false;
    }

    if (!checkoutService.isValidDartScore(score)) {
      alert('Invalid dart score! Please enter a score that exists on a dartboard.');
      return false;
    }

    return true;
  }

  // Handle bust scenario
  function handleBust() {
    const turnStartScore = calculateTurnStartScore();
    alert(`Bust! Score remains ${turnStartScore}`);
    
    // Switch thrower and reset turn
    switchThrower();
    scoringActions.clearCurrentTurn();
  }

  // Calculate score at start of current turn
  function calculateTurnStartScore(): number {
    return currentScoreValue + currentTurnTotalValue;
  }

  // Complete current turn
  function completeTurn() {
    // Update game score
    updateGameScore();
    
    // Switch to next thrower
    switchThrower();
    
    // Clear current turn
    scoringActions.completeTurn(false);
  }

  // Update game score after turn
  function updateGameScore() {
    const newScore = currentScoreValue - currentTurnTotalValue;
    
    gameState.update(state => ({
      ...state,
      ...(state.currentThrower === 'home' 
        ? { homeScore: newScore }
        : { awayScore: newScore }
      )
    }));

    // Call score update callback
    if (onScoreUpdate) {
      onScoreUpdate(
        currentGameState.currentThrower === 'home' ? newScore : currentGameState.homeScore,
        currentGameState.currentThrower === 'away' ? newScore : currentGameState.awayScore
      );
    }
  }

  // Switch to next thrower
  function switchThrower() {
    gameState.update(state => ({
      ...state,
      currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
      dartsThrown: 0
    }));
  }

  // Complete the game
  function completeGame() {
    gameState.update(state => ({
      ...state,
      gameComplete: true,
      winner: state.currentThrower
    }));

    if (onGameComplete) {
      // Calculate final statistics for both players
      const homePlayerStats = statisticsService.calculateGameStats(
        homePlayerId,
        homePlayerName,
        allDarts.filter(d => d.playerId === homePlayerId),
        allLegs.filter(l => l.playerId === homePlayerId),
        currentGameState.winner === 'home'
      );

      const awayPlayerStats = statisticsService.calculateGameStats(
        awayPlayerId,
        awayPlayerName,
        allDarts.filter(d => d.playerId === awayPlayerId),
        allLegs.filter(l => l.playerId === awayPlayerId),
        currentGameState.winner === 'away'
      );

      onGameComplete([homePlayerStats, awayPlayerStats]);
    }
  }

  // Switch scoring mode
  function changeScoringMode(newMode: 'dart-by-dart' | 'turn-total' | 'simple') {
    scoringActions.setScoringMode(newMode);
  }

  // Undo last dart
  function undoLastDart() {
    scoringActions.undoLastDart();
  }

  // Number pad for mobile input
  const numberPadNumbers = [
    [7, 8, 9],
    [4, 5, 6], 
    [1, 2, 3],
    [0, 'Clear', 'Enter']
  ];

  function handleNumberPad(value: number | string) {
    if (value === 'Clear') {
      if (currentScoringMode === 'dart-by-dart') {
        scoringActions.setDartInput('');
      } else {
        scoringActions.setTurnTotalInput('');
      }
    } else if (value === 'Enter') {
      if (currentScoringMode === 'dart-by-dart') {
        addDart();
      } else {
        addTurnTotal();
      }
    } else {
      if (currentScoringMode === 'dart-by-dart') {
        scoringActions.setDartInput(dartInputValue + value.toString());
      } else {
        scoringActions.setTurnTotalInput(turnTotalValue + value.toString());
      }
    }
  }

  // Handle events from MobileDartEntry component
  function handleDartThrown(dart: DartThrow) {
    // Add dart to history for statistics
    allDarts = [...allDarts, dart];
    
    // Dispatch to parent if needed
    dispatch('dartThrown', { dart });
  }
  
  function handleTurnComplete(turnData: { turnDarts: DartThrow[]; turnTotal: number }) {
    // Update turn statistics
    const turnStats = {
      turnNumber: Math.floor(allDarts.length / 3) + 1,
      darts: turnData.turnDarts,
      total: turnData.turnTotal,
      playerId: currentGameState.currentThrower === 'home' ? homePlayerId : awayPlayerId
    };
    
    // Dispatch to parent if needed
    dispatch('turnComplete', turnStats);
  }
  
  function handleGameComplete(gameData: { winner: string; finalStats: any }) {
    // Calculate final statistics
    const finalStats = [
      statisticsService.calculateGameStats(
        homePlayerId,
        homePlayerName,
        allDarts.filter(d => d.playerId === homePlayerId),
        allLegs.filter(l => l.playerId === homePlayerId),
        gameData.winner === 'home'
      ),
      statisticsService.calculateGameStats(
        awayPlayerId, 
        awayPlayerName,
        allDarts.filter(d => d.playerId === awayPlayerId),
        allLegs.filter(l => l.playerId === awayPlayerId),
        gameData.winner === 'away'
      )
    ];
    
    if (onGameComplete) {
      onGameComplete(finalStats);
    }
    
    dispatch('gameComplete', { stats: finalStats, winner: gameData.winner });
  }
  
  function handleScoreUpdate(scoreData: { homeScore: number; awayScore: number }) {
    if (onScoreUpdate) {
      onScoreUpdate(scoreData.homeScore, scoreData.awayScore);
    }
    
    dispatch('scoreUpdate', scoreData);
  }
</script>

<!-- Mobile-First Interface -->
{#if useMobileInterface}
  <MobileDartEntry 
    {gameId}
    {homePlayerName}
    {awayPlayerName} 
    {homePlayerId}
    {awayPlayerId}
    {isLeagueMatch}
    {startingScore}
    {venue}
    on:dartThrown={(event) => handleDartThrown(event.detail.dart)}
    on:turnComplete={(event) => handleTurnComplete(event.detail)}
    on:gameComplete={(event) => handleGameComplete(event.detail)}
    on:scoreUpdate={(event) => handleScoreUpdate(event.detail)}
  />
{:else}
  <!-- Legacy Desktop Interface -->
  {#if currentGameState?.gameComplete}
    <div class="bg-white p-4 md:p-6 rounded-lg shadow-lg text-center">
      <h2 class="text-2xl font-bold mb-4 text-green-600">Game Complete!</h2>
      <div class="text-lg space-y-2">
        <p><strong>Winner:</strong> {currentGameState.winner === 'home' ? homePlayerName : awayPlayerName}</p>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="text-center">
            <p class="font-semibold">{homePlayerName}</p>
            <p class="text-2xl {currentGameState.winner === 'home' ? 'text-green-600' : 'text-gray-600'}">
              {currentGameState.homeScore}
            </p>
          </div>
          <div class="text-center">
            <p class="font-semibold">{awayPlayerName}</p>
            <p class="text-2xl {currentGameState.winner === 'away' ? 'text-green-600' : 'text-gray-600'}">
              {currentGameState.awayScore}
            </p>
          </div>
        </div>
      </div>
    </div>
  {:else}
  <!-- Main scoring interface -->
  <div class="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
    
    <!-- Mode Toggle -->
    <div class="flex mb-4 bg-white rounded-lg p-1 shadow-sm">
      {#each Object.entries(GAME_MODES) as [key, modeConfig]}
        <button
          on:click={() => changeScoringMode(modeConfig.type)}
          class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all min-h-[44px]
                 {currentScoringMode === modeConfig.type 
                   ? 'bg-blue-500 text-white shadow-sm' 
                   : 'text-gray-600 hover:bg-gray-100'}"
        >
          {modeConfig.label}
        </button>
      {/each}
    </div>

    <!-- Score Display -->
    <div class="bg-white rounded-lg shadow-lg mb-4 p-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center">
          <p class="text-sm font-medium text-gray-600">{homePlayerName}</p>
          <p class="text-3xl font-bold {currentGameState?.currentThrower === 'home' ? 'text-blue-600' : 'text-gray-800'}">
            {currentGameState?.homeScore}
          </p>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-gray-600">{awayPlayerName}</p>
          <p class="text-3xl font-bold {currentGameState?.currentThrower === 'away' ? 'text-blue-600' : 'text-gray-800'}">
            {currentGameState?.awayScore}
          </p>
        </div>
      </div>
      
      <div class="text-center mt-3 pt-3 border-t border-gray-200">
        <p class="text-sm text-gray-600">
          {currentGameState?.currentThrower === 'home' ? homePlayerName : awayPlayerName} to throw
        </p>
        <p class="text-xs text-gray-500">{dartsRemainingValue} dart{dartsRemainingValue !== 1 ? 's' : ''} remaining</p>
        {#if venue}
          <p class="text-xs text-blue-500 mt-1">
            {venue === 'home' ? `${homePlayerName} throws second (home venue)` : `${homePlayerName} throws first (away venue)`}
          </p>
        {/if}
        
        <!-- Start status indicators -->
        <div class="flex justify-center gap-4 mt-2">
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500">{homePlayerName}:</span>
            <span class="text-xs {legStartStatusValue?.homeStarted ? 'text-green-600' : 'text-red-500'}">
              {legStartStatusValue?.homeStarted ? '✓ Started' : '⚠ Must start on double'}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500">{awayPlayerName}:</span>
            <span class="text-xs {legStartStatusValue?.awayStarted ? 'text-green-600' : 'text-red-500'}">
              {legStartStatusValue?.awayStarted ? '✓ Started' : '⚠ Must start on double'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Scoring Input -->
    {#if currentScoringMode === 'dart-by-dart'}
      <!-- Dart-by-dart mode -->
      <div class="bg-white rounded-lg shadow-lg mb-4 p-4">
        <h3 class="font-semibold mb-3">Dart-by-Dart Entry</h3>
        
        <!-- Current turn display -->
        {#if currentTurnDartsValue && currentTurnDartsValue.length > 0}
          <div class="mb-3 p-3 bg-gray-50 rounded">
            <p class="text-sm font-medium mb-2">Current Turn:</p>
            <div class="flex gap-2">
              {#each currentTurnDartsValue as dart, index}
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {dart.dartScore}
                </span>
              {/each}
            </div>
            <p class="text-sm text-gray-600 mt-2">Total: {currentTurnTotalValue}</p>
          </div>
        {/if}

        <!-- Dart input -->
        <div class="flex gap-2 mb-3">
          <input
            bind:value={dartInputValue}
            on:input={(e) => scoringActions.setDartInput(e.target.value)}
            type="number"
            min="0"
            max="60"
            placeholder="Enter dart score"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            on:click={addDart}
            disabled={!dartInputValue}
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md min-h-[44px] font-medium transition-all"
          >
            Add
          </button>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2">
          <button
            on:click={undoLastDart}
            disabled={!currentTurnDartsValue || currentTurnDartsValue.length === 0}
            class="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white py-2 rounded-md min-h-[44px] font-medium transition-all"
          >
            Undo
          </button>
          <button
            on:click={() => scoringActions.clearCurrentTurn()}
            disabled={!canCompleteTurnValue}
            class="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-2 rounded-md min-h-[44px] font-medium transition-all"
          >
            Clear
          </button>
        </div>
      </div>
      
    {:else if currentScoringMode === 'turn-total'}
      <!-- Turn total mode -->
      <div class="bg-white rounded-lg shadow-lg mb-4 p-4">
        <h3 class="font-semibold mb-3">Turn Total Entry</h3>
        
        <div class="flex gap-2 mb-3">
          <input
            bind:value={turnTotalValue}
            on:input={(e) => scoringActions.setTurnTotalInput(e.target.value)}
            type="number"
            min="0"
            max="180"
            placeholder="Enter turn total"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            on:click={addTurnTotal}
            disabled={!canCompleteTurnValue}
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md min-h-[44px] font-medium transition-all"
          >
            Enter
          </button>
        </div>
      </div>
    {/if}

    <!-- Mobile Number Pad -->
    <div class="bg-white rounded-lg shadow-lg mb-4 p-4">
      <h3 class="font-semibold mb-3">Number Pad</h3>
      <div class="grid grid-cols-3 gap-2">
        {#each numberPadNumbers as row}
          {#each row as number}
            <button
              on:click={() => handleNumberPad(number)}
              class="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 py-3 rounded-md min-h-[44px] font-medium transition-all"
            >
              {number}
            </button>
          {/each}
        {/each}
      </div>
    </div>

    <!-- Checkout Suggestions -->
    {#if showCheckoutsValue && checkoutService.isCheckoutOpportunity(currentScoreValue)}
      <div class="bg-white rounded-lg shadow-lg mb-4 p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">Checkout Suggestions ({currentScoreValue})</h3>
          <button
            on:click={() => scoringActions.toggleCheckouts()}
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            Hide
          </button>
        </div>
        
        {#if checkoutRoutesValue && checkoutRoutesValue.length > 0}
          <div class="space-y-2">
            {#each checkoutRoutesValue as route}
              <div class="bg-green-50 border border-green-200 rounded p-2">
                <p class="text-sm font-medium text-green-800">{route.description}</p>
                <p class="text-xs text-green-600">Difficulty: {route.difficulty}</p>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-red-600">No checkout possible with {dartsRemainingValue} dart{dartsRemainingValue !== 1 ? 's' : ''}</p>
        {/if}
      </div>
    {/if}

    <!-- Statistics Display -->
    {#if statsValue}
      <div class="bg-white rounded-lg shadow-lg p-4">
        <h3 class="font-semibold mb-3">Current Leg Statistics</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="text-center">
            <p class="text-gray-600">Average</p>
            <p class="font-semibold text-lg">{statsValue.average || 0}</p>
          </div>
          <div class="text-center">
            <p class="text-gray-600">Darts Thrown</p>
            <p class="font-semibold text-lg">{statsValue.totalDarts || 0}</p>
          </div>
          <div class="text-center">
            <p class="text-gray-600">180s</p>
            <p class="font-semibold text-lg">{statsValue.scores180 || 0}</p>
          </div>
          <div class="text-center">
            <p class="text-gray-600">140+</p>
            <p class="font-semibold text-lg">{statsValue.scores140Plus || 0}</p>
          </div>
        </div>
      </div>
    {/if}

    </div>
  {/if}
{/if}