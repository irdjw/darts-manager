<!-- MobileDartEntry.svelte - Complete mobile-first dart entry system with cumulative turn score -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import NumberGrid from './NumberGrid.svelte';
  import GameCompleteModal from './GameCompleteModal.svelte';
  import { 
    gameState, 
    gameStatus,
    matchFormat,
    currentTurnDarts, 
    currentScore, 
    currentDartsRemaining,
    currentTurnTotal,
    currentLegStats,
    legStartStatus,
    showCheckouts,
    checkoutRoutes,
    canUndo,
    canRedo,
    scoringActions
  } from '../stores/scoringStores';
  import { checkoutService } from '../services/checkoutService';
  import { customMatchService } from '../services/customMatchService';
  import type { DartThrow, CheckoutRoute } from '../types/scoring';

  const dispatch = createEventDispatcher<{
    dartThrown: { dart: DartThrow };
    turnComplete: { turnDarts: DartThrow[]; turnTotal: number };
    gameComplete: { winner: string; finalStats: any };
    scoreUpdate: { homeScore: number; awayScore: number };
  }>();

  // Props
  export let gameId: string = '';
  export let homePlayerName: string = 'Home Player';
  export let awayPlayerName: string = 'Away Player'; 
  export let homePlayerId: string = 'home';
  export let awayPlayerId: string = 'away';
  export let isLeagueMatch: boolean = false;
  export let startingScore: number = 501;
  export let venue: 'home' | 'away' | undefined = undefined;

  // Reactive state
  let currentGameState: any = {};
  let currentTurnDartsValue: DartThrow[] = [];
  let currentScoreValue: number = startingScore;
  let dartsRemainingValue: number = 3;
  let currentTurnTotalValue: number = 0;
  let statsValue: any = null;
  let legStartStatusValue: any = { homeStarted: false, awayStarted: false };
  let showCheckoutsValue: boolean = true;
  let checkoutRoutesValue: CheckoutRoute[] = [];
  let canUndoValue: boolean = false;
  let canRedoValue: boolean = false;
  let gameStatusValue: 'setup' | 'playing' | 'paused' | 'finished' = 'setup';
  let matchFormatValue: any = { legFormat: 'single', homeLegsWon: 0, awayLegsWon: 0, requiredLegs: 1 };

  // UI state
  let showStats: boolean = false;
  let gameInitialized: boolean = false;
  let lastDartAnimation: number | null = null;
  let errorMessage: string | null = null;
  let isLoading: boolean = false;

  // British English quit match messages
  const QUIT_MESSAGES = {
    confirmation: 'Are you sure you want to quit this match? All progress will be lost and the match will be deleted permanently.',
    success: 'Match cancelled and deleted successfully.',
    error: 'Failed to cancel match. Please try again.',
    networkError: 'Network error whilst cancelling match. Please check your connection.'
  };

  // Error handling functions
  function showErrorMessage(message: string) {
    errorMessage = message;
    setTimeout(() => {
      errorMessage = null;
    }, 5000);
  }

  function showSuccessMessage(message: string) {
    errorMessage = `✅ ${message}`;
    setTimeout(() => {
      errorMessage = null;
    }, 3000);
  }

  function clearErrorMessage() {
    errorMessage = null;
  }

  function setLoading(loading: boolean) {
    isLoading = loading;
  }

  // Haptic feedback simulation
  function triggerHaptic() {
    document.body.style.transform = 'scale(0.995)';
    setTimeout(() => {
      document.body.style.transform = 'scale(1)';
    }, 50);
  }

  // Initialize game
  onMount(() => {
    if (gameId) {
      initializeGame();
    }

    // Set viewport height for mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    setVH();

    // Subscribe to stores
    const unsubscribers = [
      gameState.subscribe(value => currentGameState = value),
      currentTurnDarts.subscribe(value => currentTurnDartsValue = value),
      currentScore.subscribe(value => {
        currentScoreValue = value;
        updateCheckoutSuggestions();
      }),
      currentDartsRemaining.subscribe(value => dartsRemainingValue = value),
      currentTurnTotal.subscribe(value => currentTurnTotalValue = value),
      currentLegStats.subscribe(value => statsValue = value),
      legStartStatus.subscribe(value => legStartStatusValue = value),
      showCheckouts.subscribe(value => showCheckoutsValue = value),
      checkoutRoutes.subscribe(value => checkoutRoutesValue = value),
      canUndo.subscribe(value => canUndoValue = value),
      canRedo.subscribe(value => canRedoValue = value),
      gameStatus.subscribe(value => gameStatusValue = value),
      matchFormat.subscribe(value => matchFormatValue = value)
    ];

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      unsubscribers.forEach(unsub => unsub());
    };
  });

  // Initialize the game
  function initializeGame() {
    scoringActions.initializeGame(
      gameId,
      homePlayerName,
      awayPlayerName,
      isLeagueMatch ? 'league' : 'practice',
      venue
    );
    gameInitialized = true;
  }

  // Handle number selection from grid
  function handleNumberSelect(event: CustomEvent<{ number: number; modifier: 'single' | 'double' | 'treble' }>) {
    const { number, modifier } = event.detail;
    
    let dartScore = 0;
    let isDouble = false;
    
    if (number === 0) {
      dartScore = 0;
    } else if (number === 25) {
      dartScore = modifier === 'double' ? 50 : 25;
      isDouble = modifier === 'double';
    } else {
      dartScore = number * (modifier === 'single' ? 1 : modifier === 'double' ? 2 : 3);
      isDouble = modifier === 'double';
    }
    
    if (!isValidDartScore(dartScore)) {
      showErrorMessage('Invalid dart score! Please check your selection.');
      triggerHaptic();
      return;
    }
    
    addDart(dartScore, isDouble);
  }

  // Add a dart to the current turn
  async function addDart(dartScore: number, isDouble: boolean = false) {
    triggerHaptic();
    
    const hasPlayerStarted = currentGameState.currentThrower === 'home' 
      ? legStartStatusValue?.homeStarted 
      : legStartStatusValue?.awayStarted;
    
    if (!hasPlayerStarted && dartScore > 0 && !isDouble) {
      showErrorMessage('You must start on a double! Please throw at a double to begin scoring.');
      triggerHaptic();
      return;
    }

    const newScore = currentScoreValue - dartScore;
    const wasCheckoutOpportunity = checkoutService.isCheckoutOpportunity(currentScoreValue);
    
    const finishValidation = validateFinish(currentScoreValue, dartScore, isDouble);
    if (finishValidation.isBust) {
      handleBust();
      return;
    }
    
    const isValidFinish = finishValidation.isValidFinish;

    if (!hasPlayerStarted && dartScore > 0 && isDouble) {
      scoringActions.markPlayerStarted(currentGameState.currentThrower);
    }

    const dartThrow: DartThrow = {
      id: crypto.randomUUID(),
      legNumber: currentGameState.currentLeg || 1,
      turnNumber: Math.floor((statsValue?.totalDarts || 0) / 3) + 1,
      dartNumber: currentTurnDartsValue.length + 1,
      dartScore,
      runningScore: newScore,
      isDoubleAttempt: isDouble,
      isCheckoutAttempt: wasCheckoutOpportunity,
      checkoutSuccessful: isValidFinish,
      timestamp: new Date(),
      playerId: currentGameState.currentThrower === 'home' ? homePlayerId : awayPlayerId,
      playerName: currentGameState.currentThrower === 'home' ? homePlayerName : awayPlayerName
    };

    scoringActions.addDart(dartThrow);
    updateLiveStats(dartThrow.playerId, dartScore);
    dispatch('dartThrown', { dart: dartThrow });

    if (isValidFinish) {
      await handleLegWin();
      return;
    }

    if (currentTurnDartsValue.length + 1 >= 3) {
      await completeTurn();
    }
  }

  // Validate dart score
  function isValidDartScore(score: number): boolean {
    if (score === 0 || score === 25 || score === 50) return true;
    if (score < 1 || score > 60) return false;
    if (score <= 20) return true;
    if (score <= 40 && score % 2 === 0) return true;
    if (score <= 60 && score % 3 === 0) return true;
    return false;
  }

  // Validate finish
  function validateFinish(currentScore: number, dartScore: number, isDouble: boolean): { isValidFinish: boolean; isBust: boolean } {
    const newScore = currentScore - dartScore;
    
    if (newScore < 0 || newScore === 1) {
      return { isValidFinish: false, isBust: true };
    }
    
    if (newScore === 0 && isDouble) {
      return { isValidFinish: true, isBust: false };
    }
    
    if (newScore === 0 && !isDouble) {
      return { isValidFinish: false, isBust: true };
    }
    
    return { isValidFinish: false, isBust: false };
  }

  // Handle bust
  function handleBust() {
    showErrorMessage('BUST! Turn score reset.');
    triggerHaptic();
    scoringActions.clearCurrentTurn();
    
    gameState.update(state => ({
      ...state,
      currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
      dartsThrown: 0
    }));
  }

  // Handle leg win
  async function handleLegWin() {
    const winner = currentGameState.currentThrower;
    
    if (matchFormatValue.legFormat === 'single') {
      gameState.update(state => ({
        ...state,
        gameComplete: true,
        winner
      }));
    } else {
      const updatedFormat = {
        ...matchFormatValue,
        homeLegsWon: winner === 'home' ? matchFormatValue.homeLegsWon + 1 : matchFormatValue.homeLegsWon,
        awayLegsWon: winner === 'away' ? matchFormatValue.awayLegsWon + 1 : matchFormatValue.awayLegsWon
      };
      
      matchFormat.set(updatedFormat);
      
      if (updatedFormat.homeLegsWon >= updatedFormat.requiredLegs || 
          updatedFormat.awayLegsWon >= updatedFormat.requiredLegs) {
        gameState.update(state => ({
          ...state,
          gameComplete: true,
          winner
        }));
      } else {
        gameState.update(state => ({
          ...state,
          currentLeg: (state.currentLeg || 1) + 1,
          homeScore: startingScore,
          awayScore: startingScore,
          currentThrower: winner === 'home' ? 'away' : 'home',
          dartsThrown: 0
        }));
        
        scoringActions.clearCurrentTurn();
        legStartStatus.set({ homeStarted: false, awayStarted: false });
      }
    }
  }

  // Complete turn
  async function completeTurn() {
    if (gameId && customMatchService) {
      setLoading(true);
      try {
        await customMatchService.saveTurnStatistics(gameId, {
          darts: [...currentTurnDartsValue],
          turnTotal: currentTurnTotalValue,
          playerId: currentGameState.currentThrower === 'home' ? homePlayerId : awayPlayerId
        });
      } catch (error) {
        console.error('Failed to save turn:', error);
        showErrorMessage('Warning: Failed to save turn data. Your game continues, but some data may not be saved.');
      } finally {
        setLoading(false);
      }
    }
    
    dispatch('turnComplete', { 
      turnDarts: [...currentTurnDartsValue], 
      turnTotal: currentTurnTotalValue 
    });
    
    gameState.update(state => ({
      ...state,
      currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
      dartsThrown: 0
    }));
    
    scoringActions.clearCurrentTurn();
  }

  // Update live statistics
  function updateLiveStats(playerId: string, dartScore: number) {
    const currentPlayerStats = statsValue || {
      totalDarts: 0,
      totalPoints: 0,
      average: 0,
      scores80Plus: 0,
      scores100Plus: 0,
      scores140Plus: 0,
      scores180: 0,
      highestScore: 0
    };

    currentPlayerStats.totalDarts++;
    currentPlayerStats.totalPoints += dartScore;
    currentPlayerStats.average = Math.round((currentPlayerStats.totalPoints / currentPlayerStats.totalDarts) * 100) / 100;
    
    const threeDartAverage = (currentPlayerStats.totalPoints / currentPlayerStats.totalDarts) * 3;
    currentPlayerStats.threeDartAverage = Math.round(threeDartAverage * 100) / 100;
    
    const currentTurnTotal = currentTurnDartsValue.reduce((sum, dart) => sum + dart.dartScore, 0) + dartScore;
    
    if (currentTurnDartsValue.length === 2) {
      if (currentTurnTotal === 180) currentPlayerStats.scores180++;
      if (currentTurnTotal >= 140) currentPlayerStats.scores140Plus++;
      if (currentTurnTotal >= 100) currentPlayerStats.scores100Plus++;
      if (currentTurnTotal >= 80) currentPlayerStats.scores80Plus++;
      if (currentTurnTotal > (currentPlayerStats.highestScore || 0)) {
        currentPlayerStats.highestScore = currentTurnTotal;
      }
    }

    statsValue = { ...currentPlayerStats };
  }

  // Undo last dart
  function undoLastDart() {
    triggerHaptic();
    scoringActions.undoLastDart();
  }

  // Redo last dart
  function redoLastDart() {
    triggerHaptic();
    scoringActions.redoLastDart();
  }

  // Clear current turn
  function clearCurrentTurn() {
    triggerHaptic();
    scoringActions.clearCurrentTurn();
  }

  // Update checkout suggestions
  function updateCheckoutSuggestions() {
    if (checkoutService.isCheckoutOpportunity(currentScoreValue)) {
      const routes = checkoutService.getCheckoutRoutes(currentScoreValue);
      checkoutRoutes.set(routes);
      showCheckouts.set(true);
    } else {
      showCheckouts.set(false);
      checkoutRoutes.set([]);
    }
  }

  // Quit match
  async function quitMatch() {
    if (!confirm(QUIT_MESSAGES.confirmation)) {
      return;
    }

    setLoading(true);

    try {
      if (gameId && customMatchService) {
        await customMatchService.deleteMatch(gameId);
        showSuccessMessage(QUIT_MESSAGES.success);
        setTimeout(() => {
          goto('/custom-match');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error quitting match:', error);
      const errorMessage = error?.message?.includes('fetch') || error?.message?.includes('network') ? 
        QUIT_MESSAGES.networkError : 
        QUIT_MESSAGES.error;
      
      showErrorMessage(errorMessage);
      setLoading(false);
    }
  }

  // Game Complete Modal handlers
  function handleSaveAndExit() {
    if (gameId) {
      goto(`/custom-match/${gameId}`);
    } else {
      goto('/custom-match');
    }
  }

  function handlePlayAgain() {
    window.location.reload();
  }

  function handleModalClose() {
    // Allow closing modal but stay on page
  }

  // Create mock stats for modal
  $: homeStats = {
    playerName: homePlayerName,
    playerId: homePlayerId,
    average: statsValue?.average || 0,
    totalDarts: statsValue?.totalDarts || 0,
    scores180: statsValue?.scores180 || 0,
    scores140Plus: statsValue?.scores140Plus || 0,
    scores100Plus: statsValue?.scores100Plus || 0,
    checkoutPercentage: statsValue?.checkoutPercentage || 0,
    scores80Plus: 0,
    scores60Plus: 0,
    checkoutAttempts: 0,
    checkoutHits: 0,
    highestCheckout: 0
  };

  $: awayStats = {
    playerName: awayPlayerName,
    playerId: awayPlayerId,
    average: 0,
    totalDarts: 0,
    scores180: 0,
    scores140Plus: 0,
    scores100Plus: 0,
    checkoutPercentage: 0,
    scores80Plus: 0,
    scores60Plus: 0,
    checkoutAttempts: 0,
    checkoutHits: 0,
    highestCheckout: 0
  };

  // Handle mobile viewport height changes
  let innerHeight = 0;

  // Handle swipe gestures
  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }

  function handleTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        if (currentTurnDartsValue.length > 0) {
          undoLastDart();
        }
      } else {
        if (currentTurnDartsValue.length > 0) {
          clearCurrentTurn();
        }
      }
    }
  }

  // Handle mobile viewport height changes
  $: if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty('--vh', `${innerHeight * 0.01}px`);
  }

  // Current player info
  $: currentPlayer = currentGameState.currentThrower === 'home' ? homePlayerName : awayPlayerName;
  $: isCurrentPlayerThrowing = true;
</script>

<!-- Main Mobile Interface -->
<svelte:window bind:innerHeight />
<div 
  class="dart-scoring-app bg-white text-gray-900"
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  <!-- Header with Score Display -->
  <div class="bg-red-600 p-4 shadow-lg">
    <!-- Game Status -->
    <div class="text-center mb-3">
      <h1 class="text-xl font-bold text-white">Darts Tracker</h1>
      <p class="text-red-100 text-sm">
        {#if matchFormatValue.legFormat !== 'single'}
          Leg {currentGameState.currentLeg || 1} of {matchFormatValue.requiredLegs * 2 - 1} • {matchFormatValue.legFormat.toUpperCase()}
        {:else}
          Leg {currentGameState.currentLeg || 1} • {isLeagueMatch ? 'League Match' : 'Practice Game'}
        {/if}
      </p>
      
      <!-- Leg Score Indicators for Multi-Leg Matches -->
      {#if matchFormatValue.legFormat !== 'single'}
        <div class="text-center mt-2">
          <p class="text-red-100 text-xs">
            {homePlayerName}: {matchFormatValue.homeLegsWon} • {awayPlayerName}: {matchFormatValue.awayLegsWon}
          </p>
          <p class="text-red-200 text-xs">
            First to {matchFormatValue.requiredLegs} legs wins
          </p>
        </div>
      {/if}
    </div>

    <!-- Players Score Display -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Home Player -->
      <div class="bg-white rounded-lg p-3 text-center shadow-md {currentGameState.currentThrower === 'home' ? 'ring-2 ring-red-300 bg-red-50' : ''}">
        <p class="text-gray-600 text-sm font-medium">{homePlayerName}</p>
        <p class="text-3xl font-bold {currentGameState.currentThrower === 'home' ? 'text-red-600' : 'text-gray-900'}">
          {currentGameState.homeScore || startingScore}
        </p>
        
        <!-- NEW: Cumulative Turn Score Display -->
        {#if currentGameState.currentThrower === 'home' && currentTurnDartsValue.length > 0}
          <div class="mt-2 pt-2 border-t border-gray-200">
            <div class="flex items-center justify-center gap-1 mb-1">
              {#each Array(currentTurnDartsValue.length) as _, i}
                <span class="text-base">🎯</span>
              {/each}
            </div>
            <p class="text-sm font-semibold text-gray-700">
              Turn: {currentTurnTotalValue}
            </p>
          </div>
        {:else if currentGameState.currentThrower !== 'home'}
          <div class="mt-2 pt-2 border-t border-gray-200 opacity-60">
            <p class="text-xs text-gray-500">Last turn</p>
          </div>
        {/if}
        
        <div class="text-xs {legStartStatusValue?.homeStarted ? 'text-green-600' : 'text-gray-500'} mt-1">
          {legStartStatusValue?.homeStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>

      <!-- Away Player -->
      <div class="bg-white rounded-lg p-3 text-center shadow-md {currentGameState.currentThrower === 'away' ? 'ring-2 ring-red-300 bg-red-50' : ''}">
        <p class="text-gray-600 text-sm font-medium">{awayPlayerName}</p>
        <p class="text-3xl font-bold {currentGameState.currentThrower === 'away' ? 'text-red-600' : 'text-gray-900'}">
          {currentGameState.awayScore || startingScore}
        </p>
        
        <!-- NEW: Cumulative Turn Score Display -->
        {#if currentGameState.currentThrower === 'away' && currentTurnDartsValue.length > 0}
          <div class="mt-2 pt-2 border-t border-gray-200">
            <div class="flex items-center justify-center gap-1 mb-1">
              {#each Array(currentTurnDartsValue.length) as _, i}
                <span class="text-base">🎯</span>
              {/each}
            </div>
            <p class="text-sm font-semibold text-gray-700">
              Turn: {currentTurnTotalValue}
            </p>
          </div>
        {:else if currentGameState.currentThrower !== 'away'}
          <div class="mt-2 pt-2 border-t border-gray-200 opacity-60">
            <p class="text-xs text-gray-500">Last turn</p>
          </div>
        {/if}
        
        <div class="text-xs {legStartStatusValue?.awayStarted ? 'text-green-600' : 'text-gray-500'} mt-1">
          {legStartStatusValue?.awayStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>
    </div>
  </div>

  <!-- Error/Success Messages -->
  {#if errorMessage}
    <div class="fixed top-20 left-0 right-0 z-50 {errorMessage.startsWith('✅') ? 'bg-green-500' : 'bg-red-500'} text-white p-3 mx-4 mt-2 rounded-lg shadow-lg relative {errorMessage.startsWith('✅') ? '' : 'animate-pulse'}">
      <p class="text-sm">{errorMessage}</p>
      <button 
        on:click={clearErrorMessage}
        class="absolute top-1 right-1 text-white hover:text-gray-200 text-xl"
        style="touch-action: manipulation;"
      >
        ×
      </button>
    </div>
  {/if}

  <!-- Loading State -->
  {#if isLoading}
    <div class="bg-blue-500 text-white p-2 mx-4 mt-2 rounded-lg shadow-lg">
      <p class="text-sm text-center">💾 Saving...</p>
    </div>
  {/if}

  <!-- Main Content Area -->
  <div class="flex-1 overflow-y-auto" style="min-height: 0; overscroll-behavior: none;">
    <!-- Number Grid -->
    <div class="px-4">
      <NumberGrid on:numberSelect={handleNumberSelect} />
    </div>

    <!-- Action Buttons -->
    <div class="p-4">
      <div class="grid grid-cols-3 gap-2">
        <button
          on:click={undoLastDart}
          disabled={!canUndoValue}
          class="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 
                 disabled:text-gray-500 text-white font-bold py-3 rounded-xl
                 transition-all active:scale-95 min-h-[60px]"
          style="touch-action: manipulation;"
        >
          ↶ UNDO
        </button>

        <button
          on:click={redoLastDart}
          disabled={!canRedoValue}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                 disabled:text-gray-500 text-white font-bold py-3 rounded-xl
                 transition-all active:scale-95 min-h-[60px]"
          style="touch-action: manipulation;"
        >
          ↷ REDO
        </button>

        <button
          on:click={clearCurrentTurn}
          disabled={currentTurnDartsValue.length === 0}
          class="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 
                 disabled:text-gray-500 text-white font-bold py-3 rounded-xl
                 transition-all active:scale-95 min-h-[60px]"
          style="touch-action: manipulation;"
        >
          CLEAR
        </button>
      </div>

      <!-- Quit Match Button -->
      <button
        on:click={quitMatch}
        class="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl
               transition-all active:scale-95 mt-2 min-h-[60px]"
        style="touch-action: manipulation;"
      >
        QUIT MATCH
      </button>
    </div>
  </div>

  <!-- Game Complete Modal -->
  {#if currentGameState.gameComplete}
    <GameCompleteModal
      winner={currentGameState.winner === 'home' ? homePlayerName : awayPlayerName}
      homePlayerStats={homeStats}
      awayPlayerStats={awayStats}
      on:saveAndExit={handleSaveAndExit}
      on:playAgain={handlePlayAgain}
      on:close={handleModalClose}
    />
  {/if}
</div>

<style>
  .dart-scoring-app {
    height: 100vh;
    height: calc(var(--vh, 1vh) * 100);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    touch-action: pan-y;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  * {
    -webkit-tap-highlight-color: transparent;
  }
  
  input, select, textarea, button {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
  
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  
  .scrollable-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  
  .scrollable-area::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollable-area::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.1);
  }
  
  .scrollable-area::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.5);
    border-radius: 2px;
  }
  
  .scrollable-area::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }
  
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }
  
  button, .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
    gap: 8px;
    width: 100%;
  }
  
  .score-display {
    font-size: clamp(1.5rem, 8vw, 3rem);
    line-height: 1.2;
  }
  
  input[type="number"],
  input[type="text"],
  select {
    width: 100%;
    min-height: 44px;
    font-size: 16px;
    border-radius: 8px;
    border: 2px solid #374151;
    background: #1f2937;
    color: #f9fafb;
    padding: 8px 12px;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--safe-area-inset-top) var(--safe-area-inset-right) var(--safe-area-inset-bottom) var(--safe-area-inset-left);
  }
  
  .modal-content {
    background: #1f2937;
    border-radius: 12px;
    padding: 24px;
    margin: 16px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  @media screen and (max-width: 480px) {
    .dart-scoring-app {
      font-size: 14px;
    }
    
    .modal-content {
      padding: 16px;
      margin: 8px;
      max-width: 95vw;
      max-height: 85vh;
    }
  }
  
  @media screen and (orientation: landscape) and (max-height: 500px) {
    .dart-scoring-app {
      font-size: 12px;
    }
    
    .score-display {
      font-size: clamp(1rem, 6vh, 2rem);
    }
    
    button, .touch-target {
      min-height: 36px;
    }
  }
  
  @media screen and (-webkit-min-device-pixel-ratio: 2) {
    .dart-scoring-app {
      -webkit-font-smoothing: antialiased;
    }
  }
  
  @media (prefers-color-scheme: dark) {
    .dart-scoring-app {
      background: #0f172a;
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .transition-all {
      transition: none;
    }
  }
  
  @media print {
    .dart-scoring-app {
      height: auto;
      overflow: visible;
    }
  }
</style>
