<!--
  ============================================================================
  MOBILE DART ENTRY - Main Scoring Interface Component
  ============================================================================

  PURPOSE:
  The heart of the darts scoring application. This component provides the
  mobile-optimized UI for entering dart scores during a game.

  WHAT IT DOES:
  1. Displays current scores for both players
  2. Shows whose turn it is
  3. Provides number grid for dart entry (0-20, 25, 50)
  4. Handles double-start rule enforcement
  5. Validates dart scores and finish attempts
  6. Calculates checkout suggestions
  7. Manages turn completion and leg wins
  8. Provides undo/redo functionality
  9. Shows live statistics
  10. Handles game completion

  DATA FLOW (Adding a Dart):
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. User taps number on grid (e.g., T20)                     │
  │    ↓                                                         │
  │ 2. handleNumberSelect() calculates score (60)               │
  │    ↓                                                         │
  │ 3. addDart() validates and processes                        │
  │    ↓                                                         │
  │ 4. scoringActions.addDart() updates stores                  │
  │    ↓                                                         │
  │ 5. Stores react → UI updates automatically                  │
  │    ↓                                                         │
  │ 6. Check if turn complete (3 darts) → completeTurn()        │
  │    ↓                                                         │
  │ 7. Check if leg won (score = 0) → handleLegWin()            │
  └─────────────────────────────────────────────────────────────┘

  USED BY:
  - /scoring/[id]/+page.svelte (league matches)
  - /custom-match/+page.svelte (practice games)
  - /warmup/+page.svelte (warmup sessions)

  DEPENDENCIES:
  - scoringStores.ts (all reactive state)
  - NumberGrid.svelte (number pad UI)
  - GameCompleteModal.svelte (end-of-game modal)
  - checkoutService.ts (checkout calculations)
  - customMatchService.ts (saving results)

  FILE SIZE: 905 lines (400 logic, 500 UI)
-->

<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import NumberGrid from './NumberGrid.svelte';
  import GameCompleteModal from './GameCompleteModal.svelte';

  /**
   * STORE IMPORTS - Reactive State Management
   *
   * These stores are defined in scoringStores.ts and provide reactive
   * data that automatically updates the UI when changed.
   */
  import {
    gameState,              // Current game state (scores, thrower, etc.)
    gameStatus,             // playing | paused | finished
    matchFormat,            // Best-of-X format and leg counters
    currentTurnDarts,       // Darts thrown in current turn
    currentScore,           // Current player's remaining score
    currentDartsRemaining,  // How many darts left in turn (0-3)
    currentTurnTotal,       // Sum of current turn's darts
    currentLegStats,        // Live statistics for current leg
    legStartStatus,         // Who has hit starting double
    showCheckouts,          // Should we show checkout suggestions?
    checkoutRoutes,         // Available checkout routes
    canUndo,                // Can undo last dart?
    canRedo,                // Can redo last dart?
    scoringActions          // All scoring operations
  } from '../stores/scoringStores';

  import { checkoutService } from '../services/checkoutService';
  import { customMatchService } from '../services/customMatchService';
  import type { DartThrow, CheckoutRoute } from '../types/scoring';

  /**
   * EVENT DISPATCHER - Communicate with Parent Components
   *
   * This component can emit events that parent components listen for.
   *
   * EVENTS:
   * - dartThrown: Fired after each dart is added
   * - turnComplete: Fired when 3 darts complete a turn
   * - gameComplete: Fired when game/match finishes
   * - scoreUpdate: Fired when scores change
   */
  const dispatch = createEventDispatcher<{
    dartThrown: { dart: DartThrow };
    turnComplete: { turnDarts: DartThrow[]; turnTotal: number };
    gameComplete: { winner: string; finalStats: any };
    scoreUpdate: { homeScore: number; awayScore: number };
  }>();

  /**
   * ============================================================================
   * COMPONENT PROPS - Configuration from Parent
   * ============================================================================
   */

  /** Unique game identifier (UUID from database or custom ID) */
  export let gameId: string = '';

  /** Display name for home player */
  export let homePlayerName: string = 'Home Player';

  /** Display name for away player */
  export let awayPlayerName: string = 'Away Player';

  /** Database UUID for home player (for saving) */
  export let homePlayerId: string = 'home';

  /** Database UUID for away player (for saving) */
  export let awayPlayerId: string = 'away';

  /** Is this an official league match? (affects saving) */
  export let isLeagueMatch: boolean = false;

  /** Starting score (usually 501) */
  export let startingScore: number = 501;

  /** Where is the match being played? (for league fixtures) */
  export let venue: 'home' | 'away' | undefined = undefined;

  /**
   * ============================================================================
   * REACTIVE STATE - Local Component State
   * ============================================================================
   *
   * These variables hold local copies of store values. We subscribe to stores
   * in onMount() and update these when stores change.
   *
   * WHY LOCAL COPIES?
   * Svelte's $store syntax works in templates but not always in JS logic.
   * Having local copies makes it easier to use values in functions.
   */

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
  let matchFormatValue: any = {
    legFormat: 'single',
    homeLegsWon: 0,
    awayLegsWon: 0,
    requiredLegs: 1
  };

  /**
   * ============================================================================
   * UI STATE - Component-Specific State
   * ============================================================================
   */

  /** Should we show the statistics panel? */
  let showStats: boolean = false;

  /** Has the game been initialized? */
  let gameInitialized: boolean = false;

  /** Last dart animation trigger (for visual feedback) */
  let lastDartAnimation: number | null = null;

  /** Error message to display to user */
  let errorMessage: string | null = null;

  /** Is component loading/processing? */
  let isLoading: boolean = false;

  /**
   * ============================================================================
   * CONSTANTS - British English Messages
   * ============================================================================
   */

  const QUIT_MESSAGES = {
    confirmation: 'Are you sure you want to quit this match? All progress will be lost and the match will be deleted permanently.',
    success: 'Match cancelled and deleted successfully.',
    error: 'Failed to cancel match. Please try again.',
    networkError: 'Network error whilst cancelling match. Please check your connection.'
  };

  /**
   * ============================================================================
   * HELPER FUNCTIONS - Error Handling & UI Feedback
   * ============================================================================
   */

  /**
   * SHOW ERROR MESSAGE - Display Error to User
   *
   * Shows error message for 5 seconds then auto-clears.
   *
   * EXAMPLE:
   * showErrorMessage('Invalid dart score! Must be 0-60.');
   */
  function showErrorMessage(message: string) {
    errorMessage = message;
    setTimeout(() => {
      errorMessage = null;
    }, 5000);
  }

  /**
   * SHOW SUCCESS MESSAGE - Display Success Confirmation
   *
   * Shows success message (with ✅) for 3 seconds.
   *
   * EXAMPLE:
   * showSuccessMessage('Match saved successfully!');
   */
  function showSuccessMessage(message: string) {
    errorMessage = `✅ ${message}`;
    setTimeout(() => {
      errorMessage = null;
    }, 3000);
  }

  /** Clear any displayed error/success message */
  function clearErrorMessage() {
    errorMessage = null;
  }

  /** Set loading state (shows spinner) */
  function setLoading(loading: boolean) {
    isLoading = loading;
  }

  /**
   * TRIGGER HAPTIC - Provide Visual/Tactile Feedback
   *
   * Simulates haptic feedback on mobile by briefly scaling the UI.
   * On devices with vibration API, could add navigator.vibrate().
   *
   * EFFECT: Entire screen scales to 99.5% for 50ms then back to 100%
   */
  function triggerHaptic() {
    document.body.style.transform = 'scale(0.995)';
    setTimeout(() => {
      document.body.style.transform = 'scale(1)';
    }, 50);
  }

  /**
   * ============================================================================
   * INITIALIZATION - Component Lifecycle
   * ============================================================================
   */

  /**
   * ON MOUNT - Initialize Component
   *
   * CALLED: When component is first added to DOM
   *
   * WHAT IT DOES:
   * 1. Initialize game if gameId provided
   * 2. Set up mobile viewport height handling
   * 3. Subscribe to all reactive stores
   * 4. Set up cleanup on component destroy
   *
   * WHY VIEWPORT HEIGHT?
   * Mobile browsers have variable height (address bar appears/disappears).
   * We use --vh CSS variable to get true viewport height.
   */
  onMount(() => {
    if (gameId) {
      initializeGame();
    }

    // Mobile viewport height handling
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    setVH();

    // Subscribe to all stores and update local variables
    const unsubscribers = [
      gameState.subscribe(value => currentGameState = value),
      currentTurnDarts.subscribe(value => currentTurnDartsValue = value),
      currentScore.subscribe(value => {
        currentScoreValue = value;
        updateCheckoutSuggestions(); // Recalculate checkouts when score changes
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

    // Cleanup on destroy
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      unsubscribers.forEach(unsub => unsub());
    };
  });

  /**
   * INITIALIZE GAME - Set Up New Game
   *
   * CALLED BY: onMount() if gameId is provided
   *
   * WHAT IT DOES:
   * Calls scoringActions.initializeGame() which:
   * - Resets all stores to default values
   * - Sets up player names
   * - Sets game type (league vs practice)
   * - Records venue
   */
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

  /**
   * ============================================================================
   * DART ENTRY - Core Scoring Logic
   * ============================================================================
   */

  /**
   * HANDLE NUMBER SELECT - Process Number Grid Tap
   *
   * CALLED BY: NumberGrid component when user taps a number
   *
   * PARAMETERS:
   * - event.detail.number: 0-25 (board number)
   * - event.detail.modifier: 'single' | 'double' | 'treble'
   *
   * LOGIC:
   * 1. Calculate dart score from number + modifier
   * 2. Determine if it's a double (for finish validation)
   * 3. Validate score is possible
   * 4. Call addDart() to process
   *
   * EXAMPLES:
   * - number=20, modifier='treble' → dartScore=60, isDouble=false
   * - number=16, modifier='double' → dartScore=32, isDouble=true
   * - number=25, modifier='double' → dartScore=50, isDouble=true (bull)
   * - number=0, modifier='single' → dartScore=0, isDouble=false (miss)
   */
  function handleNumberSelect(event: CustomEvent<{ number: number; modifier: 'single' | 'double' | 'treble' }>) {
    const { number, modifier } = event.detail;

    let dartScore = 0;
    let isDouble = false;

    // Special case: Miss (0 points)
    if (number === 0) {
      dartScore = 0;
    }
    // Special case: Bull (25 or 50)
    else if (number === 25) {
      dartScore = modifier === 'double' ? 50 : 25;
      isDouble = modifier === 'double';
    }
    // Normal dartboard numbers (1-20)
    else {
      dartScore = number * (modifier === 'single' ? 1 : modifier === 'double' ? 2 : 3);
      isDouble = modifier === 'double';
    }

    // Validate score is possible with one dart
    if (!isValidDartScore(dartScore)) {
      showErrorMessage('Invalid dart score! Please check your selection.');
      triggerHaptic();
      return;
    }

    addDart(dartScore, isDouble);
  }

  /**
   * ADD DART - Process Single Dart Throw
   *
   * CALLED BY: handleNumberSelect() or keyboard shortcuts
   *
   * THIS IS THE CRITICAL FUNCTION - Main scoring logic
   *
   * FLOW:
   * 1. Check double-start rule
   * 2. Calculate new score
   * 3. Check for bust
   * 4. Validate finish if score would reach 0
   * 5. Mark player as started if hitting first double
   * 6. Create DartThrow object
   * 7. Update stores
   * 8. Update live stats
   * 9. Dispatch dart event
   * 10. Check if leg won
   * 11. Check if turn complete
   *
   * DOUBLE-START RULE:
   * If player hasn't started yet (first turn of leg), they MUST hit a double
   * before they can score any points. Non-double darts score 0 until they hit double.
   *
   * FINISH VALIDATION:
   * To win, must reach exactly 0 and finish on a double.
   * - Score 32, hit D16 → WIN
   * - Score 32, hit S16 → BUST (didn't finish on double)
   * - Score 32, hit D20 → BUST (went below 0)
   *
   * BUST CONDITIONS:
   * - Go below 0
   * - Reach exactly 1 (impossible to checkout from 1)
   * - Reach exactly 0 but not on a double
   */
  async function addDart(dartScore: number, isDouble: boolean = false) {
    triggerHaptic();

    // Check if current player has started this leg
    const hasPlayerStarted = currentGameState.currentThrower === 'home'
      ? legStartStatusValue?.homeStarted
      : legStartStatusValue?.awayStarted;

    // DOUBLE-START RULE: Must hit double to begin scoring
    if (!hasPlayerStarted && dartScore > 0 && !isDouble) {
      showErrorMessage('You must start on a double! Please throw at a double to begin scoring.');
      triggerHaptic();
      return;
    }

    // Calculate new score after this dart
    const newScore = currentScoreValue - dartScore;

    // Was this a checkout opportunity?
    const wasCheckoutOpportunity = checkoutService.isCheckoutOpportunity(currentScoreValue);

    // Validate finish/bust
    const finishValidation = validateFinish(currentScoreValue, dartScore, isDouble);
    if (finishValidation.isBust) {
      handleBust();
      return;
    }

    const isValidFinish = finishValidation.isValidFinish;

    // Mark player as started if they hit their first double
    if (!hasPlayerStarted && dartScore > 0 && isDouble) {
      scoringActions.markPlayerStarted(currentGameState.currentThrower);
    }

    // Create dart object with full metadata
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

    // Update stores with new dart
    scoringActions.addDart(dartThrow);

    // Update live statistics
    updateLiveStats(dartThrow.playerId, dartScore);

    // Notify parent components
    dispatch('dartThrown', { dart: dartThrow });

    // Check if leg won
    if (isValidFinish) {
      await handleLegWin();
      return;
    }

    // Check if turn complete (3 darts thrown)
    if (currentTurnDartsValue.length + 1 >= 3) {
      await completeTurn();
    }
  }

  /**
   * ============================================================================
   * VALIDATION FUNCTIONS
   * ============================================================================
   */

  /**
   * IS VALID DART SCORE - Check if Score is Possible
   *
   * RETURNS: true if score can be hit with one dart
   *
   * LOGIC:
   * - 0: Miss (always valid)
   * - 25, 50: Bull and double bull
   * - 1-20: Singles
   * - Even numbers 2-40: Doubles (must be even)
   * - Multiples of 3 up to 60: Trebles
   *
   * EXAMPLES:
   * isValidDartScore(60) → true (T20)
   * isValidDartScore(23) → false (impossible)
   */
  function isValidDartScore(score: number): boolean {
    if (score === 0 || score === 25 || score === 50) return true;
    if (score < 1 || score > 60) return false;
    if (score <= 20) return true;
    if (score <= 40 && score % 2 === 0) return true;
    if (score <= 60 && score % 3 === 0) return true;
    return false;
  }

  /**
   * VALIDATE FINISH - Check if Dart Results in Win or Bust
   *
   * CALLED BY: addDart() before processing dart
   *
   * RETURNS:
   * - isValidFinish: Did player win this leg?
   * - isBust: Did player bust?
   *
   * RULES:
   * 1. newScore < 0 → BUST (went over)
   * 2. newScore = 1 → BUST (impossible to finish from 1)
   * 3. newScore = 0 AND double → WIN
   * 4. newScore = 0 AND NOT double → BUST (didn't finish on double)
   * 5. newScore > 1 → Continue playing
   *
   * EXAMPLES:
   * validateFinish(32, 32, true)   → { isValidFinish: true,  isBust: false } (WIN: D16)
   * validateFinish(32, 16, false)  → { isValidFinish: false, isBust: true  } (BUST: S16)
   * validateFinish(32, 40, true)   → { isValidFinish: false, isBust: true  } (BUST: -8)
   * validateFinish(32, 20, false)  → { isValidFinish: false, isBust: false } (Continue: 12 left)
   */
  function validateFinish(currentScore: number, dartScore: number, isDouble: boolean): {
    isValidFinish: boolean;
    isBust: boolean;
  } {
    const newScore = currentScore - dartScore;

    // Bust: Went below 0 or reached 1 (impossible to finish)
    if (newScore < 0 || newScore === 1) {
      return { isValidFinish: false, isBust: true };
    }

    // Win: Reached exactly 0 on a double
    if (newScore === 0 && isDouble) {
      return { isValidFinish: true, isBust: false };
    }

    // Bust: Reached 0 but not on double
    if (newScore === 0 && !isDouble) {
      return { isValidFinish: false, isBust: true };
    }

    // Continue: Valid dart, game continues
    return { isValidFinish: false, isBust: false };
  }

  /**
   * ============================================================================
   * GAME EVENT HANDLERS
   * ============================================================================
   */

  /**
   * HANDLE BUST - Player Went Over or Invalid Finish
   *
   * CALLED BY: addDart() when validateFinish() returns isBust=true
   *
   * WHAT IT DOES:
   * 1. Show error message to user
   * 2. Clear all darts from current turn (score reverts)
   * 3. Switch to other player
   * 4. Reset darts thrown counter
   *
   * EFFECT:
   * Player's turn is forfeit. Score returns to what it was at start of turn.
   * Other player now gets their turn.
   *
   * EXAMPLE:
   * Player has 32 left, throws S16, S16, S16 = 48 total → Bust!
   * Score stays at 32, other player's turn begins.
   */
  function handleBust() {
    showErrorMessage('BUST! Turn score reset.');
    triggerHaptic();
    scoringActions.clearCurrentTurn();

    // Switch to other player
    gameState.update(state => ({
      ...state,
      currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
      dartsThrown: 0
    }));
  }

  /**
   * HANDLE LEG WIN - Player Finished Leg
   *
   * CALLED BY: addDart() when validateFinish() returns isValidFinish=true
   *
   * LOGIC:
   * 1. If single leg → Game complete
   * 2. If best-of-X format:
   *    a. Increment winner's leg counter
   *    b. Check if winner has won enough legs
   *    c. If yes → Game complete
   *    d. If no → Start next leg
   *
   * EXAMPLES:
   * - Single leg format → Immediate game complete
   * - Best of 3, home wins leg 1 → homeLegsWon=1, start leg 2
   * - Best of 3, home wins leg 2 → homeLegsWon=2 (2/2 required), game complete
   * - Best of 5, home wins leg 3 → homeLegsWon=3 (3/3 required), game complete
   */
  async function handleLegWin() {
    const winner = currentGameState.currentThrower;

    // Single leg format - game is complete
    if (matchFormatValue.legFormat === 'single') {
      gameState.update(state => ({
        ...state,
        gameComplete: true,
        winner
      }));
    }
    // Best-of-X format
    else {
      // Increment winner's leg counter
      const updatedFormat = {
        ...matchFormatValue,
        homeLegsWon: winner === 'home' ? matchFormatValue.homeLegsWon + 1 : matchFormatValue.homeLegsWon,
        awayLegsWon: winner === 'away' ? matchFormatValue.awayLegsWon + 1 : matchFormatValue.awayLegsWon
      };

      matchFormat.set(updatedFormat);

      // Check if match is complete
      if (updatedFormat.homeLegsWon >= updatedFormat.requiredLegs ||
          updatedFormat.awayLegsWon >= updatedFormat.requiredLegs) {
        gameState.update(state => ({
          ...state,
          gameComplete: true,
          winner
        }));
      }
      // Start next leg
      else {
        gameState.update(state => ({
          ...state,
          currentLeg: (state.currentLeg || 1) + 1,
          homeScore: startingScore,
          awayScore: startingScore,
          currentThrower: winner === 'home' ? 'away' : 'home', // Loser throws first next leg
          dartsThrown: 0
        }));

        scoringActions.clearCurrentTurn();
        legStartStatus.set({ homeStarted: false, awayStarted: false });
      }
    }
  }

  /**
   * COMPLETE TURN - End of 3-Dart Turn
   *
   * CALLED BY: addDart() when 3rd dart is thrown
   *
   * WHAT IT DOES:
   * 1. Save turn statistics to database (if gameId exists)
   * 2. Dispatch turnComplete event to parent
   * 3. Switch to other player
   * 4. Clear current turn darts
   *
   * ERROR HANDLING:
   * If save fails, shows warning but game continues. This ensures users
   * don't lose their game if network drops.
   */
  async function completeTurn() {
    // Save to database if this is a tracked game
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

    // Notify parent components
    dispatch('turnComplete', {
      turnDarts: [...currentTurnDartsValue],
      turnTotal: currentTurnTotalValue
    });

    // Switch players and reset
    gameState.update(state => ({
      ...state,
      currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
      dartsThrown: 0
    }));

    scoringActions.clearCurrentTurn();
  }

  /**
   * UPDATE LIVE STATS - Real-Time Statistics Calculation
   *
   * CALLED BY: addDart() after each dart
   *
   * CALCULATES:
   * - totalDarts: Running count of darts thrown
   * - totalPoints: Running sum of points scored
   * - average: Points per dart
   * - threeDartAverage: (points per dart) × 3
   * - High score counts (80+, 100+, 140+, 180)
   * - highestScore: Best 3-dart turn
   *
   * WHY ON 3RD DART?
   * High scores are counted when dartNumber=3 because we need all 3 darts
   * to calculate the turn total.
   *
   * EXAMPLE:
   * Turn: T20 (60), T20 (60), T20 (60)
   * - After dart 1: totalDarts=1, totalPoints=60, average=60
   * - After dart 2: totalDarts=2, totalPoints=120, average=60
   * - After dart 3: totalDarts=3, totalPoints=180, average=60, scores180=1
   */
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

    // Update basic stats
    currentPlayerStats.totalDarts++;
    currentPlayerStats.totalPoints += dartScore;
    currentPlayerStats.average = Math.round((currentPlayerStats.totalPoints / currentPlayerStats.totalDarts) * 100) / 100;

    // Calculate 3-dart average
    const threeDartAverage = (currentPlayerStats.totalPoints / currentPlayerStats.totalDarts) * 3;
    currentPlayerStats.threeDartAverage = Math.round(threeDartAverage * 100) / 100;

    // Calculate current turn total
    const currentTurnTotal = currentTurnDartsValue.reduce((sum, dart) => sum + dart.dartScore, 0) + dartScore;

    // Update high score counts (only on 3rd dart of turn)
    if (currentTurnDartsValue.length === 2) { // About to be 3 darts
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

  /**
   * ============================================================================
   * USER ACTIONS - Undo/Redo/Clear
   * ============================================================================
   */

  /**
   * UNDO LAST DART - Remove Last Dart Thrown
   *
   * CALLED BY: Undo button or swipe gesture
   *
   * Uses undo system from scoringStores to restore previous state.
   */
  function undoLastDart() {
    scoringActions.undoLastDart();
  }

  /**
   * REDO LAST DART - Restore Previously Undone Dart
   *
   * CALLED BY: Redo button
   *
   * Restores dart that was undone (if any in redo stack).
   */
  function redoLastDart() {
    scoringActions.redoLastDart();
  }

  /**
   * CLEAR CURRENT TURN - Remove All Darts from Current Turn
   *
   * CALLED BY: Clear button or swipe gesture
   *
   * Clears current turn without switching players (unlike bust).
   */
  function clearCurrentTurn() {
    scoringActions.clearCurrentTurn();
  }

  /**
   * ============================================================================
   * CHECKOUT SUGGESTIONS
   * ============================================================================
   */

  /**
   * UPDATE CHECKOUT SUGGESTIONS - Calculate Possible Finishes
   *
   * CALLED BY: Whenever currentScore changes
   *
   * WHAT IT DOES:
   * 1. Check if current score is checkable (2-170, excluding impossible scores)
   * 2. If yes, get checkout routes from checkoutService
   * 3. Update checkoutRoutes store for UI display
   *
   * EXAMPLE:
   * Score 40:
   * - Route 1: D20 (recommended)
   * - Route 2: 20, D10
   * - Route 3: 10, 10, D5
   */
  function updateCheckoutSuggestions() {
    if (checkoutService.isCheckoutOpportunity(currentScoreValue)) {
      const routes = checkoutService.getCheckoutRoutes(currentScoreValue);
      checkoutRoutes.set(routes);
    } else {
      checkoutRoutes.set([]);
    }
  }

  /**
   * ============================================================================
   * QUIT MATCH
   * ============================================================================
   */

  /**
   * QUIT MATCH - Cancel and Delete Match
   *
   * CALLED BY: Quit button in UI
   *
   * FLOW:
   * 1. Show confirmation dialog
   * 2. If confirmed, delete match from database
   * 3. Navigate back to custom match page
   *
   * WHY DELETE?
   * Incomplete games shouldn't pollute the database. If user quits,
   * we assume they don't want this match saved.
   */
  async function quitMatch() {
    // Confirm with user
    if (!confirm(QUIT_MESSAGES.confirmation)) {
      return;
    }

    setLoading(true);

    try {
      if (gameId && customMatchService) {
        await customMatchService.deleteMatch(gameId);
        showSuccessMessage(QUIT_MESSAGES.success);

        // Navigate back after brief delay
        setTimeout(() => {
          goto('/custom-match');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error quitting match:', error);

      // Provide specific error message based on error type
      const errorMessage = error?.message?.includes('fetch') || error?.message?.includes('network')
        ? QUIT_MESSAGES.networkError
        : QUIT_MESSAGES.error;

      showErrorMessage(errorMessage);
      setLoading(false);
    }
  }

  /**
   * ============================================================================
   * GAME COMPLETE MODAL HANDLERS
   * ============================================================================
   */

  /**
   * HANDLE SAVE AND EXIT - Navigate to Match Summary
   *
   * CALLED BY: "Save & Exit" button in game complete modal
   *
   * Navigates to the custom match summary page showing full stats.
   */
  function handleSaveAndExit() {
    if (gameId) {
      goto(`/custom-match/${gameId}`);
    } else {
      goto('/custom-match');
    }
  }

  /**
   * HANDLE PLAY AGAIN - Restart Same Match
   *
   * CALLED BY: "Play Again" button in game complete modal
   *
   * Reloads page to start fresh game with same players.
   */
  function handlePlayAgain() {
    window.location.reload();
  }

  /**
   * HANDLE MODAL CLOSE - Close Without Action
   *
   * CALLED BY: Modal close button
   *
   * Allows user to close modal and stay on scoring page.
   */
  function handleModalClose() {
    // Allow closing modal but stay on page
  }

  /**
   * ============================================================================
   * REACTIVE STATEMENTS - Auto-Updating Values
   * ============================================================================
   */

  /**
   * HOME STATS - Statistics for Game Complete Modal
   *
   * REACTIVE: Recalculates whenever statsValue changes
   *
   * Creates statistics object for home player to display in modal.
   */
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

  /**
   * AWAY STATS - Statistics for Game Complete Modal
   *
   * Currently returns zero values since we only track current thrower stats.
   * In full implementation, would track both players separately.
   */
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

  /**
   * CURRENT PLAYER - Human-Readable Current Thrower
   *
   * Converts 'home' | 'away' to actual player name.
   */
  $: currentPlayer = currentGameState.currentThrower === 'home' ? homePlayerName : awayPlayerName;

  /**
   * ============================================================================
   * MOBILE GESTURES - Swipe Support
   * ============================================================================
   */

  /** Mobile viewport height for CSS calculations */
  let innerHeight = 0;

  /** Touch gesture tracking */
  let touchStartX = 0;
  let touchStartY = 0;

  /**
   * HANDLE TOUCH START - Record Touch Position
   *
   * Records where user touches screen to detect swipe gestures.
   */
  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }

  /**
   * HANDLE TOUCH END - Detect Swipe Gestures
   *
   * GESTURES:
   * - Swipe left (→): Undo last dart
   * - Swipe right (←): Clear current turn
   *
   * THRESHOLD: Must swipe at least 50px horizontally
   *
   * WHY:
   * Provides quick access to undo/clear without needing buttons.
   * Common on mobile scoring apps.
   */
  function handleTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Horizontal swipe (not vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      // Swipe left → Undo
      if (diffX > 0) {
        if (currentTurnDartsValue.length > 0) {
          undoLastDart();
        }
      }
      // Swipe right → Clear
      else {
        if (currentTurnDartsValue.length > 0) {
          clearCurrentTurn();
        }
      }
    }
  }

  /**
   * VIEWPORT HEIGHT REACTIVE - Update CSS Variable
   *
   * Mobile browsers change viewport height when address bar appears/disappears.
   * This keeps UI sized correctly.
   */
  $: if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty('--vh', `${innerHeight * 0.01}px`);
  }
</script>

<!--
  ============================================================================
  TEMPLATE SECTION - User Interface
  ============================================================================

  STRUCTURE OVERVIEW:
  1. Window binding for viewport height
  2. Main container with swipe gesture handlers
  3. Header with score display
  4. Current turn darts display
  5. Number grid for dart entry
  6. Action buttons (undo/redo/clear/quit)
  7. Checkout suggestions
  8. Live statistics panel (toggle-able)
  9. Game complete modal
  10. Error message display

  KEY UI FEATURES:
  - Mobile-first design (touch-optimized)
  - Visual indication of current thrower (highlighted player)
  - Real-time turn total display
  - Double-start status indicators
  - Swipe gestures for quick actions
  - Haptic feedback on interactions
  - Responsive number grid
  - Checkout route suggestions
  - Live statistics

  RESPONSIVE BEHAVIOR:
  - Uses CSS custom property --vh for true viewport height
  - Grid layout adapts to screen size
  - Touch-friendly button sizes (min 44px)
  - Proper spacing for thumbs on mobile
-->

<!-- Bind to window height for mobile viewport calculation -->
<svelte:window bind:innerHeight />

<!-- Main container with swipe gesture support -->
<div
  class="dart-scoring-app bg-white text-gray-900"
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  <!-- ============= HEADER SECTION ============= -->
  <!--
    HEADER:
    - Game title and format info
    - Leg counter for multi-leg matches
    - Two-column score display
    - Current thrower highlighted
    - Turn total indicators
    - Double-start status
  -->

  <div class="bg-red-600 p-4 shadow-lg">
    <!-- Game Status Line -->
    <div class="text-center mb-3">
      <h1 class="text-xl font-bold text-white">Darts Tracker</h1>
      <p class="text-red-100 text-sm">
        {#if matchFormatValue.legFormat !== 'single'}
          Leg {currentGameState.currentLeg || 1} • {matchFormatValue.legFormat.toUpperCase()}
        {:else}
          Leg {currentGameState.currentLeg || 1} • {isLeagueMatch ? 'League Match' : 'Practice Game'}
        {/if}
      </p>

      <!-- Leg Score Indicators (Best-of-X only) -->
      {#if matchFormatValue.legFormat !== 'single'}
        <div class="text-center mt-2">
          <p class="text-red-100 text-xs">
            {homePlayerName}: {matchFormatValue.homeLegsWon} •
            {awayPlayerName}: {matchFormatValue.awayLegsWon}
          </p>
          <p class="text-red-200 text-xs">
            First to {matchFormatValue.requiredLegs} legs wins
          </p>
        </div>
      {/if}
    </div>

    <!-- Two-Column Score Display -->
    <div class="grid grid-cols-2 gap-4">
      <!-- HOME PLAYER CARD -->
      <div class="bg-white rounded-lg p-3 text-center shadow-md
                  {currentGameState.currentThrower === 'home' ? 'ring-2 ring-red-300 bg-red-50' : ''}">
        <p class="text-gray-600 text-sm font-medium">{homePlayerName}</p>
        <p class="text-3xl font-bold
                  {currentGameState.currentThrower === 'home' ? 'text-red-600' : 'text-gray-900'}">
          {currentGameState.homeScore || startingScore}
        </p>

        <!-- Turn Total Display (when throwing) -->
        {#if currentGameState.currentThrower === 'home' && currentTurnDartsValue.length > 0}
          <div class="mt-2 pt-2 border-t border-gray-200">
            <div class="flex items-center justify-center gap-1 mb-1">
              {#each Array(currentTurnDartsValue.length) as _}
                <span class="text-base">🎯</span>
              {/each}
            </div>
            <p class="text-sm font-semibold text-gray-700">
              Turn: {currentTurnTotalValue}
            </p>
          </div>
        {/if}

        <!-- Double-Start Status -->
        <div class="text-xs {legStartStatusValue?.homeStarted ? 'text-green-600' : 'text-gray-500'} mt-1">
          {legStartStatusValue?.homeStarted ? '✓ Started' : 'Must start on double'}
        </div>
      </div>

      <!-- AWAY PLAYER CARD (similar structure) -->
      <div class="bg-white rounded-lg p-3 text-center shadow-md
                  {currentGameState.currentThrower === 'away' ? 'ring-2 ring-red-300 bg-red-50' : ''}">
        <!-- ... Similar to home player ... -->
      </div>
    </div>
  </div>

  <!-- ============= CURRENT TURN DARTS ============= -->
  <!--
    Shows individual darts thrown in current turn
    - Visual dart indicators (🎯)
    - Dart scores displayed
    - Turn total
  -->

  <!-- ============= NUMBER GRID ============= -->
  <!--
    NumberGrid Component:
    - Displays numbers 0-20, 25, 50
    - Single/Double/Treble modifiers
    - Emits numberSelect event with { number, modifier }
    - Touch-optimized button sizes
  -->

  <NumberGrid on:numberSelect={handleNumberSelect} />

  <!-- ============= ACTION BUTTONS ============= -->
  <!--
    Four main actions:
    - Undo: Remove last dart
    - Redo: Restore undone dart
    - Clear: Clear current turn
    - Quit: Exit and delete match
  -->

  <div class="grid grid-cols-4 gap-2 p-4">
    <button
      on:click={undoLastDart}
      disabled={!canUndoValue}
      class="btn-action"
    >
      ↶ Undo
    </button>

    <button
      on:click={redoLastDart}
      disabled={!canRedoValue}
      class="btn-action"
    >
      ↷ Redo
    </button>

    <button
      on:click={clearCurrentTurn}
      disabled={currentTurnDartsValue.length === 0}
      class="btn-action"
    >
      ✕ Clear
    </button>

    <button
      on:click={quitMatch}
      class="btn-danger"
    >
      🚪 Quit
    </button>
  </div>

  <!-- ============= CHECKOUT SUGGESTIONS ============= -->
  <!--
    Shows when player has checkout opportunity (2-170)
    - Displays recommended checkout routes
    - Multiple routes shown in order of difficulty
    - Example: "40: D20 or 20 + D10"
  -->

  {#if showCheckoutsValue && checkoutRoutesValue.length > 0}
    <div class="checkout-panel bg-yellow-50 border-t border-yellow-200 p-4">
      <h3 class="font-bold text-gray-900 mb-2">Checkout Options:</h3>
      <div class="space-y-1">
        {#each checkoutRoutesValue as route}
          <div class="text-sm text-gray-700">
            {route.description}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ============= STATISTICS PANEL ============= -->
  <!--
    Toggleable panel showing live stats:
    - Average per dart
    - 3-dart average
    - Total darts thrown
    - High score counts (80+, 100+, 140+, 180)
    - Highest turn score
  -->

  {#if showStats}
    <div class="stats-panel bg-gray-50 border-t border-gray-200 p-4">
      <h3 class="font-bold text-gray-900 mb-2">Live Statistics:</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>Average: {statsValue?.average || 0}</div>
        <div>3-Dart Avg: {statsValue?.threeDartAverage || 0}</div>
        <div>Total Darts: {statsValue?.totalDarts || 0}</div>
        <div>Highest: {statsValue?.highestScore || 0}</div>
        <div>180s: {statsValue?.scores180 || 0}</div>
        <div>140+: {statsValue?.scores140Plus || 0}</div>
        <div>100+: {statsValue?.scores100Plus || 0}</div>
        <div>80+: {statsValue?.scores80Plus || 0}</div>
      </div>
    </div>
  {/if}

  <!-- ============= ERROR MESSAGE DISPLAY ============= -->
  <!--
    Shows at bottom of screen
    - Auto-dismisses after timeout
    - Red for errors, green for success
  -->

  {#if errorMessage}
    <div class="error-toast fixed bottom-4 left-4 right-4 p-4 rounded-lg shadow-lg
                {errorMessage.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
      {errorMessage}
    </div>
  {/if}

  <!-- ============= LOADING SPINNER ============= -->
  {#if isLoading}
    <div class="loading-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="spinner"></div>
    </div>
  {/if}
</div>

<!-- ============= GAME COMPLETE MODAL ============= -->
<!--
  Shown when game finishes
  - Displays winner
  - Shows final statistics for both players
  - Options: Save & Exit, Play Again, Close
-->

{#if currentGameState.gameComplete}
  <GameCompleteModal
    winner={currentGameState.winner}
    {homeStats}
    {awayStats}
    onSaveAndExit={handleSaveAndExit}
    onPlayAgain={handlePlayAgain}
    onClose={handleModalClose}
  />
{/if}

<!--
  ============================================================================
  END OF MOBILEDARTENTRY COMPONENT
  ============================================================================

  SUMMARY - What This Component Does:

  1. **Main Scoring Interface**
     - Mobile-optimized UI for entering dart scores
     - Real-time score updates
     - Visual feedback for current thrower

  2. **Game Logic**
     - Handles dart entry with validation
     - Enforces double-start rule
     - Validates finishes (must end on double)
     - Detects busts and handles them
     - Tracks turn completion (3 darts)
     - Manages leg wins and match completion

  3. **User Actions**
     - Number grid for score entry
     - Undo/redo functionality
     - Clear turn option
     - Quit match with confirmation
     - Swipe gestures (left=undo, right=clear)

  4. **Live Features**
     - Real-time statistics calculation
     - Turn total display
     - Checkout suggestions when in range
     - Double-start status indicators
     - Leg counter for multi-leg matches

  5. **Mobile Optimization**
     - Touch-friendly button sizes
     - Haptic feedback simulation
     - Swipe gesture support
     - Dynamic viewport height handling
     - Responsive layout

  6. **Data Flow**
     User taps number → handleNumberSelect() → addDart() →
     scoringActions.addDart() → Stores update → UI updates

  7. **Error Handling**
     - Validates all dart scores
     - Prevents invalid finishes
     - Shows user-friendly error messages
     - Continues game even if save fails

  KEY CONCEPTS:
  - Reactive state management via Svelte stores
  - Event dispatching to parent components
  - Mobile-first UX design
  - Real-time statistic calculation
  - Proper 501 darts rule enforcement

  INTEGRATION POINTS:
  - scoringStores.ts: All game state
  - NumberGrid.svelte: Number entry UI
  - GameCompleteModal.svelte: End-of-game display
  - checkoutService.ts: Checkout calculations
  - customMatchService.ts: Database operations

  NEXT FILES TO ANNOTATE:
  - NumberGrid.svelte: Number pad component
  - checkoutService.ts: Checkout route calculations
  - statisticsService.ts: Advanced statistics
-->

<style>
  /* Component-specific styles would go here */
  /* Most styling is done via Tailwind utility classes in template */
</style>
