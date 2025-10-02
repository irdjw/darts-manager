<!-- MobileDartEntry.svelte - Complete mobile-first dart entry system -->
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
    }, 5000); // Clear after 5 seconds
  }

  function showSuccessMessage(message: string) {
    // Show success message using the same error message system but with different styling
    errorMessage = `✅ ${message}`;
    setTimeout(() => {
      errorMessage = null;
    }, 3000); // Clear after 3 seconds for success messages
  }

  function clearErrorMessage() {
    errorMessage = null;
  }

  function setLoading(loading: boolean) {
    isLoading = loading;
  }

  // Haptic feedback simulation
  function triggerHaptic() {
    // Visual feedback for mobile
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
      currentScore.subscribe(value => currentScoreValue = value),
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
    
    // Calculate dart score
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
    
    // Validate dart score
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
    
    // Check if player has started the leg (must start on double)
    const hasPlayerStarted = currentGameState.currentThrower === 'home' 
      ? legStartStatusValue?.homeStarted 
      : legStartStatusValue?.awayStarted;
    
    // If player hasn't started and this isn't a double, reject the dart
    if (!hasPlayerStarted && dartScore > 0 && !isDouble) {
      showErrorMessage('You must start on a double! Please throw at a double to begin scoring.');
      triggerHaptic();
      return;
    }

    const newScore = currentScoreValue - dartScore;
    
    // Enhanced checkout detection
    const wasCheckoutOpportunity = checkoutService.isCheckoutOpportunity(currentScoreValue);
    
    // Validate finish attempt
    const finishValidation = validateFinish(currentScoreValue, dartScore, isDouble);
    if (finishValidation.isBust) {
      handleBust();
      return;
    }
    
    const isValidFinish = finishValidation.isValidFinish;

    // If this is the first scoring dart and it's a double, mark player as started
    if (!hasPlayerStarted && dartScore > 0 && isDouble) {
      scoringActions.markPlayerStarted(currentGameState.currentThrower);
    }

    // Create dart throw object
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
      playerId: currentGameState.currentThrower === 'home' ? homePlayerId : awayPlayerId
    };

    // Save dart to database if this is a custom match
    if (gameId && !isLeagueMatch) {
      try {
        setLoading(true);
        await customMatchService.saveDartThrow(
          gameId,
          dartThrow.legNumber,
          dartThrow.turnNumber,
          dartThrow.dartNumber as 1 | 2 | 3,
          currentGameState.currentThrower === 'home' ? 1 : 2,
          dartThrow.dartScore,
          isDouble ? 2 : 1, // multiplier
          undefined, // segment
          0, // running total - will be updated
          newScore, // remaining score
          false, // is bust
          dartThrow.isCheckoutAttempt,
          dartThrow.checkoutSuccessful
        );
        clearErrorMessage(); // Clear any previous errors
      } catch (error) {
        console.error('Failed to save dart throw:', error);
        showErrorMessage('Failed to save dart throw. Your game continues locally, but data may not be saved.');
        // Continue with local gameplay even if database save fails
      } finally {
        setLoading(false);
      }
    }

    // Add dart to current turn
    scoringActions.addDartToCurrentTurn(
      dartScore, 
      isDouble, 
      wasCheckoutOpportunity, 
      isValidFinish
    );

    // Update live statistics immediately after dart
    updateLiveStats(dartThrow.playerId, dartScore);

    // Dispatch dart thrown event
    dispatch('dartThrown', { dart: dartThrow });

    // Animate dart
    lastDartAnimation = currentTurnDartsValue.length;
    setTimeout(() => lastDartAnimation = null, 300);

    // Check for game completion
    if (isValidFinish) {
      completeGame();
    } else if (currentTurnDartsValue.length >= 3) { // Complete after 3 darts
      setTimeout(() => completeTurn(), 100);
    }
  }

  // Validate dart score
  function isValidDartScore(score: number): boolean {
    const validScores = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48, 50, 
      51, 54, 57, 60
    ];
    return validScores.includes(score);
  }

  // Comprehensive finish validation
  function validateFinish(remainingScore: number, dartScore: number, isDouble: boolean): { 
    isValidFinish: boolean; 
    isBust: boolean; 
    errorMessage?: string 
  } {
    const newScore = remainingScore - dartScore;
    
    // Check for standard bust conditions
    if (newScore < 0) {
      return { isValidFinish: false, isBust: true, errorMessage: 'Bust! Score went below zero.' };
    }
    
    // Check for score of 1 (impossible to finish)
    if (newScore === 1) {
      return { isValidFinish: false, isBust: true, errorMessage: 'Bust! Score of 1 cannot be finished.' };
    }
    
    // If not finishing (score > 0), it's a valid dart
    if (newScore > 0) {
      return { isValidFinish: false, isBust: false };
    }
    
    // Attempting to finish (newScore === 0)
    if (newScore === 0) {
      // Must finish on a double
      if (!isDouble) {
        showErrorMessage('You must finish on a double!');
        return { isValidFinish: false, isBust: true, errorMessage: 'Must finish on a double!' };
      }
      
      // Special case for finishing with 50 (double bull)
      if (remainingScore === 50 && dartScore === 50 && isDouble) {
        return { isValidFinish: true, isBust: false };
      }
      
      // Validate other double finishes
      if (dartScore === remainingScore && isDouble) {
        return { isValidFinish: true, isBust: false };
      }
      
      // Invalid finish attempt
      return { isValidFinish: false, isBust: true, errorMessage: 'Invalid finish attempt!' };
    }
    
    return { isValidFinish: false, isBust: false };
  }

  // Handle bust scenario
  async function handleBust() {
    showErrorMessage(`Bust! Score remains ${currentScoreValue}`);
    triggerHaptic();
    
    // Complete turn with bust flag - uses the same turn management
    try {
      await completeTurn();
    } catch (error) {
      console.error('Error completing bust turn:', error);
      showErrorMessage('Error processing bust turn. Please continue with your game.');
    }
  }

  // Single turn management function - called ONLY after 3 darts OR bust
  async function completeTurn() {
    // Save turn statistics to database if custom match
    if (gameId && !isLeagueMatch && currentTurnDartsValue.length > 0) {
      try {
        setLoading(true);
        await saveTurnStatistics();
        clearErrorMessage();
      } catch (error) {
        console.error('Failed to save turn statistics:', error);
        showErrorMessage('Failed to save turn statistics. Your game continues, but some data may not be saved.');
      } finally {
        setLoading(false);
      }
    }
    
    // Update game score
    updateGameScore();
    
    // Dispatch turn complete event
    dispatch('turnComplete', { 
      turnDarts: [...currentTurnDartsValue], 
      turnTotal: currentTurnTotalValue 
    });
    
    // Switch thrower
    gameState.update(state => ({
      ...state,
      currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
      dartsThrown: 0
    }));
    
    // Clear turn
    scoringActions.clearCurrentTurn();
  }

  // Save turn statistics to database
  async function saveTurnStatistics() {
    // This would calculate and save turn-level statistics
    // For now, individual dart throws are already being saved
    // Additional turn-level stats could be added here
  }

  // Update live statistics after each dart
  function updateLiveStats(playerId: string, dartScore: number) {
    // Get current player stats or create new ones
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

    // Update statistics
    currentPlayerStats.totalDarts++;
    currentPlayerStats.totalPoints += dartScore;
    currentPlayerStats.average = Math.round((currentPlayerStats.totalPoints / currentPlayerStats.totalDarts) * 100) / 100;
    
    // Calculate three-dart average
    const threeDartAverage = (currentPlayerStats.totalPoints / currentPlayerStats.totalDarts) * 3;
    currentPlayerStats.threeDartAverage = Math.round(threeDartAverage * 100) / 100;
    
    // Calculate turn total for high score tracking
    const currentTurnTotal = currentTurnDartsValue.reduce((sum, dart) => sum + dart.dartScore, 0) + dartScore;
    
    // Update highest score if this turn is complete or higher
    if (currentTurnDartsValue.length === 2 || currentTurnTotal > (currentPlayerStats.highestScore || 0)) {
      if (currentTurnDartsValue.length === 2) { // Turn complete
        if (currentTurnTotal === 180) currentPlayerStats.scores180++;
        if (currentTurnTotal >= 140) currentPlayerStats.scores140Plus++;
        if (currentTurnTotal >= 100) currentPlayerStats.scores100Plus++;
        if (currentTurnTotal >= 80) currentPlayerStats.scores80Plus++;
        if (currentTurnTotal > (currentPlayerStats.highestScore || 0)) {
          currentPlayerStats.highestScore = currentTurnTotal;
        }
      }
    }

    // Update the stats display immediately
    statsValue = { ...currentPlayerStats };
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

    // Dispatch score update
    dispatch('scoreUpdate', {
      homeScore: currentGameState.currentThrower === 'home' ? newScore : currentGameState.homeScore,
      awayScore: currentGameState.currentThrower === 'away' ? newScore : currentGameState.awayScore
    });
  }


  // Complete the game/leg
  function completeGame() {
    const winner = currentGameState.currentThrower;
    
    // Complete the current leg
    scoringActions.completeLeg(winner);
    
    // Dispatch leg/game complete event
    dispatch('gameComplete', { 
      winner: winner,
      finalStats: { /* Add final stats calculation */ }
    });
  }

  // Undo last dart
  function undoLastDart() {
    scoringActions.undoLastDart();
    triggerHaptic();
  }

  // Redo last dart
  function redoLastDart() {
    scoringActions.redoLastDart();
    triggerHaptic();
  }

  // Clear current turn
  function clearCurrentTurn() {
    scoringActions.clearCurrentTurn();
    triggerHaptic();
  }

  // Pause match
  function pauseMatch() {
    scoringActions.pauseMatch();
  }

  // Resume match
  function resumeMatch() {
    scoringActions.resumeMatch();
  }

  // Quit match with complete database deletion and navigation
  async function quitMatch() {
    if (!confirm(QUIT_MESSAGES.confirmation)) {
      return;
    }

    try {
      setLoading(true);
      clearErrorMessage();
      
      // If this is a custom match, delete it from the database
      if (gameId && !isLeagueMatch) {
        await customMatchService.deleteMatch(gameId);
        showSuccessMessage(QUIT_MESSAGES.success);
      }
      
      // Clear local storage and game state
      scoringActions.quitMatch();
      
      // Navigate back to custom match listing
      await goto('/custom-match');
      
    } catch (error: any) {
      console.error('Failed to quit match:', error);
      
      // Determine error type for appropriate message
      const isNetworkError = error.message?.includes('network') || 
                           error.message?.includes('connection') || 
                           error.name === 'NetworkError';
      
      const errorMessage = isNetworkError ? 
        QUIT_MESSAGES.networkError : 
        QUIT_MESSAGES.error;
      
      showErrorMessage(errorMessage);
      setLoading(false);
    }
  }

  // Game Complete Modal handlers
  function handleSaveAndExit() {
    // Navigate to match page or home
    if (gameId) {
      goto(`/custom-match/${gameId}`);
    } else {
      goto('/custom-match');
    }
  }

  function handlePlayAgain() {
    // Reload the page to start a new game
    window.location.reload();
  }

  function handleModalClose() {
    // Allow closing modal but stay on page
  }

  // Create mock stats for modal (using current leg stats)
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

    // Check if it's a horizontal swipe
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left - undo last dart
        if (currentTurnDartsValue.length > 0) {
          undoLastDart();
        }
      } else {
        // Swipe right - clear turn
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
  $: isCurrentPlayerThrowing = true; // Could be modified for multiplayer
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
        <div class="text-xs {legStartStatusValue?.homeStarted ? 'text-green-600' : 'text-gray-500'}">
          {legStartStatusValue?.homeStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>

      <!-- Away Player -->
      <div class="bg-white rounded-lg p-3 text-center shadow-md {currentGameState.currentThrower === 'away' ? 'ring-2 ring-red-300 bg-red-50' : ''}">
        <p class="text-gray-600 text-sm font-medium">{awayPlayerName}</p>
        <p class="text-3xl font-bold {currentGameState.currentThrower === 'away' ? 'text-red-600' : 'text-gray-900'}">
          {currentGameState.awayScore || startingScore}
        </p>
        <div class="text-xs {legStartStatusValue?.awayStarted ? 'text-green-600' : 'text-gray-500'}">
          {legStartStatusValue?.awayStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>
    </div>

    <!-- Current Thrower Indicator -->
    <div class="text-center mt-3">
      <p class="text-white font-medium">
        {currentPlayer} to throw
      </p>
    </div>

    <!-- Game Controls -->
    <div class="flex justify-center gap-2 mt-3">
      {#if gameStatusValue === 'playing'}
        <button
          on:click={pauseMatch}
          class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
          style="touch-action: manipulation;"
        >
          ⏸ PAUSE
        </button>
      {:else if gameStatusValue === 'paused'}
        <button
          on:click={resumeMatch}
          class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
          style="touch-action: manipulation;"
        >
          ▶ RESUME
        </button>
      {/if}
      
      <button
        on:click={quitMatch}
        class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
        style="touch-action: manipulation;"
      >
        ✕ QUIT
      </button>
    </div>
  </div>

  <!-- Error/Success Message -->
  {#if errorMessage}
    <div class="{errorMessage.startsWith('✅') ? 'bg-green-500' : 'bg-red-500'} text-white p-3 mx-4 mt-2 rounded-lg shadow-lg relative {errorMessage.startsWith('✅') ? '' : 'animate-pulse'}">
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
  <div class="flex-1 overflow-y-auto"
       style="min-height: 0; overscroll-behavior: none;"
  >
    <!-- Dart Visual Indicators: Removed during gameplay for cleaner interface.
         Visual dart indicators are not shown during active gameplay to reduce clutter.
         All game statistics are displayed in the GameCompleteModal at game end. -->

    <!-- LiveDartStats: Removed during gameplay for cleaner interface.
         Statistics are not shown during active gameplay to reduce clutter and improve focus.
         All game statistics including averages, high scores, and checkout percentages
         are displayed in the GameCompleteModal at game end. -->

    <!-- CheckoutSuggestions: Removed during gameplay for cleaner interface.
         Checkout suggestions are not shown during active gameplay to reduce clutter.
         Players should focus on their throwing strategy without on-screen distractions.
         All game statistics are displayed in the GameCompleteModal at game end. -->

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
          class="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 
                 disabled:text-gray-500 text-white font-bold py-3 rounded-xl
                 transition-all active:scale-95 min-h-[60px]"
          style="touch-action: manipulation;"
        >
          ✗ CLEAR
        </button>
      </div>
    </div>

    <!-- Swipe Hint -->
    <div class="text-center p-4 text-gray-500 text-sm">
      💡 Swipe left to undo • Swipe right to clear
    </div>
  </div>
</div>

<!-- Game Complete Modal -->
{#if currentGameState?.gameComplete}
  <GameCompleteModal
    winner={currentGameState.winner || 'home'}
    {homeStats}
    {awayStats}
    homeLegsWon={matchFormatValue.homeLegsWon}
    awayLegsWon={matchFormatValue.awayLegsWon}
    on:saveAndExit={handleSaveAndExit}
    on:playAgain={handlePlayAgain}
    on:close={handleModalClose}
  />
{/if}

<style>
  /* Main container - NO SCROLL layout */
  .dart-scoring-app {
    display: flex;
    flex-direction: column;
    height: calc(var(--vh, 1vh) * 100);
    max-height: calc(var(--vh, 1vh) * 100);
    width: 100%;
    overflow: hidden; /* CRITICAL - NO SCROLLING */
    background: #1f2937;
    position: relative;
  }
  
  /* Prevent unwanted interactions */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  /* Allow text selection for inputs and certain elements */
  input, textarea, [contenteditable="true"] {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
  
  /* Smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  
  /* Scrollable areas within the app */
  .scrollable-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  
  /* Custom scrollbar styling */
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
  
  /* Focus states for accessibility */
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }
  
  /* Ensure minimum touch targets (44px) */
  button, .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Flexible grid layouts that adapt to screen size */
  .dart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
    gap: 8px;
    width: 100%;
  }
  
  /* Score display - responsive text sizing */
  .score-display {
    font-size: clamp(1.5rem, 8vw, 3rem);
    line-height: 1.2;
  }
  
  /* Input fields - full width on mobile */
  input[type="number"],
  input[type="text"],
  select {
    width: 100%;
    min-height: 44px;
    font-size: 16px; /* Prevent zoom on iOS */
    border-radius: 8px;
    border: 2px solid #374151;
    background: #1f2937;
    color: #f9fafb;
    padding: 8px 12px;
  }
  
  /* Modal overlays */
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
  
  /* Responsive breakpoints */
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
  
  /* Landscape orientation adjustments */
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
  
  /* High DPI displays */
  @media screen and (-webkit-min-device-pixel-ratio: 2) {
    .dart-scoring-app {
      -webkit-font-smoothing: antialiased;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .dart-scoring-app {
      background: #0f172a;
    }
  }
  
  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .transition-all {
      transition: none;
    }
  }
  
  /* Print styles */
  @media print {
    .dart-scoring-app {
      height: auto;
      overflow: visible;
    }
  }
</style>