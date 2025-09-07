<!-- MobileDartEntry.svelte - Complete mobile-first dart entry system -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import NumberGrid from './NumberGrid.svelte';
  import DartVisualIndicators from './DartVisualIndicators.svelte';
  import LiveDartStats from './LiveDartStats.svelte';
  import CheckoutSuggestions from './CheckoutSuggestions.svelte';
  import { 
    gameState, 
    currentTurnDarts, 
    currentScore, 
    currentDartsRemaining,
    currentTurnTotal,
    currentLegStats,
    legStartStatus,
    showCheckouts,
    checkoutRoutes,
    scoringActions
  } from '../stores/scoringStores';
  import { checkoutService } from '../services/checkoutService';
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

  // UI state
  let showStats: boolean = false;
  let gameInitialized: boolean = false;
  let lastDartAnimation: number | null = null;

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
      checkoutRoutes.subscribe(value => checkoutRoutesValue = value)
    ];

    return () => unsubscribers.forEach(unsub => unsub());
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
      alert('Invalid dart score! Please check your selection.');
      return;
    }
    
    addDart(dartScore, isDouble);
  }

  // Add a dart to the current turn
  function addDart(dartScore: number, isDouble: boolean = false) {
    triggerHaptic();
    
    // Check if player has started the leg (must start on double)
    const hasPlayerStarted = currentGameState.currentThrower === 'home' 
      ? legStartStatusValue?.homeStarted 
      : legStartStatusValue?.awayStarted;
    
    // If player hasn't started and this isn't a double, reject the dart
    if (!hasPlayerStarted && dartScore > 0 && !isDouble) {
      alert('You must start on a double! Please throw at a double to begin scoring.');
      return;
    }

    const newScore = currentScoreValue - dartScore;
    
    // Enhanced checkout detection
    const wasCheckoutOpportunity = checkoutService.isCheckoutOpportunity(currentScoreValue);
    const isValidFinish = newScore === 0 && isDouble;
    
    // Check for bust
    if (newScore < 0 || newScore === 1) {
      handleBust();
      return;
    }

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

    // Add dart to current turn
    scoringActions.addDartToCurrentTurn(
      dartScore, 
      isDouble, 
      wasCheckoutOpportunity, 
      isValidFinish
    );

    // Dispatch dart thrown event
    dispatch('dartThrown', { dart: dartThrow });

    // Animate dart
    lastDartAnimation = currentTurnDartsValue.length;
    setTimeout(() => lastDartAnimation = null, 300);

    // Check for game completion
    if (isValidFinish) {
      completeGame();
    } else if (currentTurnDartsValue.length >= 2) { // Will be 3 after this dart is added
      setTimeout(() => completeTurn(), 100);
    }
  }

  // Validate dart score
  function isValidDartScore(score: number): boolean {
    if (score === 0 || score === 25 || score === 50) return true;
    if (score >= 1 && score <= 20) return true;
    if (score >= 2 && score <= 40 && score % 2 === 0) return true; // Doubles
    if (score >= 3 && score <= 60 && score % 3 === 0) return true; // Trebles
    return false;
  }

  // Handle bust scenario
  function handleBust() {
    alert(`Bust! Score remains ${currentScoreValue}`);
    triggerHaptic();
    
    // Dispatch turn complete with bust flag
    dispatch('turnComplete', { 
      turnDarts: [...currentTurnDartsValue], 
      turnTotal: currentTurnTotalValue 
    });
    
    // Switch thrower and reset turn
    switchThrower();
    scoringActions.clearCurrentTurn();
  }

  // Complete current turn
  function completeTurn() {
    // Update game score
    updateGameScore();
    
    // Dispatch turn complete event
    dispatch('turnComplete', { 
      turnDarts: [...currentTurnDartsValue], 
      turnTotal: currentTurnTotalValue 
    });
    
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

    // Dispatch score update
    dispatch('scoreUpdate', {
      homeScore: currentGameState.currentThrower === 'home' ? newScore : currentGameState.homeScore,
      awayScore: currentGameState.currentThrower === 'away' ? newScore : currentGameState.awayScore
    });
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

    // Dispatch game complete event
    dispatch('gameComplete', { 
      winner: currentGameState.currentThrower,
      finalStats: { /* Add final stats calculation */ }
    });
  }

  // Update checkout suggestions
  function updateCheckoutSuggestions() {
    if (currentScoreValue && dartsRemainingValue) {
      const routes = checkoutService.getRecommendedFinishes(currentScoreValue, dartsRemainingValue);
      scoringActions.setCheckoutRoutes(routes);
    }
  }

  // Undo last dart
  function undoLastDart() {
    scoringActions.undoLastDart();
    triggerHaptic();
  }

  // Clear current turn
  function clearCurrentTurn() {
    scoringActions.clearCurrentTurn();
    triggerHaptic();
  }

  // Toggle stats display
  function toggleStats() {
    showStats = !showStats;
  }

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

  // Current player info
  $: currentPlayer = currentGameState.currentThrower === 'home' ? homePlayerName : awayPlayerName;
  $: isCurrentPlayerThrowing = true; // Could be modified for multiplayer
</script>

<!-- Main Mobile Interface -->
<div 
  class="min-h-screen bg-black text-white overflow-hidden"
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  <!-- Header with Score Display -->
  <div class="bg-gray-900 p-4 shadow-lg">
    <!-- Game Status -->
    <div class="text-center mb-3">
      <h1 class="text-xl font-bold text-orange-400">Darts Tracker</h1>
      <p class="text-gray-400 text-sm">Leg {currentGameState.currentLeg || 1} • {isLeagueMatch ? 'League Match' : 'Practice Game'}</p>
    </div>

    <!-- Players Score Display -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Home Player -->
      <div class="bg-gray-800 rounded-lg p-3 text-center {currentGameState.currentThrower === 'home' ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''}">
        <p class="text-gray-300 text-sm font-medium">{homePlayerName}</p>
        <p class="text-3xl font-bold {currentGameState.currentThrower === 'home' ? 'text-orange-400' : 'text-white'}">
          {currentGameState.homeScore || startingScore}
        </p>
        <div class="text-xs {legStartStatusValue?.homeStarted ? 'text-green-400' : 'text-red-400'}">
          {legStartStatusValue?.homeStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>

      <!-- Away Player -->
      <div class="bg-gray-800 rounded-lg p-3 text-center {currentGameState.currentThrower === 'away' ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''}">
        <p class="text-gray-300 text-sm font-medium">{awayPlayerName}</p>
        <p class="text-3xl font-bold {currentGameState.currentThrower === 'away' ? 'text-orange-400' : 'text-white'}">
          {currentGameState.awayScore || startingScore}
        </p>
        <div class="text-xs {legStartStatusValue?.awayStarted ? 'text-green-400' : 'text-red-400'}">
          {legStartStatusValue?.awayStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>
    </div>

    <!-- Current Thrower Indicator -->
    <div class="text-center mt-3">
      <p class="text-orange-400 font-medium">
        {currentPlayer} to throw
      </p>
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 overflow-y-auto pb-20">
    <!-- Dart Visual Indicators -->
    <div class="p-4">
      <DartVisualIndicators 
        currentTurnDarts={currentTurnDartsValue}
        dartsRemaining={dartsRemainingValue}
        currentTurnTotal={currentTurnTotalValue}
        showTurnTotal={true}
      />
    </div>

    <!-- Stats Toggle -->
    <div class="px-4 mb-4">
      <button
        on:click={toggleStats}
        class="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-3 
               flex items-center justify-between transition-all min-h-[60px]"
        style="touch-action: manipulation;"
      >
        <span class="text-white font-medium">
          {showStats ? 'Hide' : 'Show'} Statistics
        </span>
        <span class="text-gray-400 text-2xl {showStats ? 'rotate-180' : ''} transition-transform">
          ▼
        </span>
      </button>
    </div>

    <!-- Statistics (Collapsible) -->
    {#if showStats}
      <div class="px-4 mb-4">
        <LiveDartStats
          currentLegStats={statsValue}
          currentTurnDarts={currentTurnDartsValue}
          currentScore={currentScoreValue}
          startingScore={startingScore}
          playerName={currentPlayer}
          isCurrentThrower={isCurrentPlayerThrowing}
          showDetailed={true}
        />
      </div>
    {/if}

    <!-- Checkout Suggestions -->
    {#if showCheckoutsValue && checkoutService.isCheckoutOpportunity(currentScoreValue)}
      <div class="px-4 mb-4">
        <CheckoutSuggestions
          currentScore={currentScoreValue}
          dartsRemaining={dartsRemainingValue}
          checkoutRoutes={checkoutRoutesValue}
          isVisible={true}
          onDismiss={() => scoringActions.toggleCheckouts()}
        />
      </div>
    {/if}

    <!-- Number Grid -->
    <div class="px-4">
      <NumberGrid on:numberSelect={handleNumberSelect} />
    </div>

    <!-- Action Buttons -->
    <div class="p-4">
      <div class="grid grid-cols-2 gap-3">
        <button
          on:click={undoLastDart}
          disabled={currentTurnDartsValue.length === 0}
          class="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 
                 disabled:text-gray-500 text-white font-bold py-4 rounded-xl
                 transition-all active:scale-95 min-h-[60px]"
          style="touch-action: manipulation;"
        >
          ↶ UNDO
        </button>
        
        <button
          on:click={clearCurrentTurn}
          disabled={currentTurnDartsValue.length === 0}
          class="bg-red-600 hover:bg-red-500 disabled:bg-gray-700 
                 disabled:text-gray-500 text-white font-bold py-4 rounded-xl
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
  <div class="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
    <div class="bg-gray-900 rounded-2xl p-6 max-w-sm w-full text-center">
      <div class="text-6xl mb-4">🎯</div>
      <h2 class="text-2xl font-bold text-green-400 mb-2">Game Complete!</h2>
      <p class="text-white text-lg mb-4">
        {currentGameState.winner === 'home' ? homePlayerName : awayPlayerName} Wins!
      </p>
      
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="text-gray-400 text-sm">{homePlayerName}</p>
          <p class="text-2xl font-bold {currentGameState.winner === 'home' ? 'text-green-400' : 'text-white'}">
            {currentGameState.homeScore}
          </p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="text-gray-400 text-sm">{awayPlayerName}</p>
          <p class="text-2xl font-bold {currentGameState.winner === 'away' ? 'text-green-400' : 'text-white'}">
            {currentGameState.awayScore}
          </p>
        </div>
      </div>

      <button 
        on:click={() => window.location.reload()}
        class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
      >
        New Game
      </button>
    </div>
  </div>
{/if}

<style>
  /* Prevent zoom on double tap */
  * {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Custom scrollbar for webkit */
  ::-webkit-scrollbar {
    width: 4px;
  }

  ::-webkit-scrollbar-track {
    background: #1f2937;
  }

  ::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 2px;
  }

  /* Focus states */
  button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }

  /* Prevent body scroll when modal is open */
  .modal-open {
    overflow: hidden;
  }
</style>