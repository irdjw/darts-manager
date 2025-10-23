/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCORING STORES - THE HEART OF THE DARTS SCORING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FOR SOMEONE NEW TO THIS CODEBASE:
 *
 * This file manages ALL the state for live dart scoring. When you're recording
 * a darts match in real-time, every dart throw, score change, undo operation,
 * and statistic is managed by the stores in this file.
 *
 * Think of "stores" as containers that hold data AND automatically notify
 * everyone when that data changes. It's like a magic box where:
 * 1. You put data in
 * 2. Multiple components can "watch" the box
 * 3. When data changes, all watchers automatically update
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY STORES INSTEAD OF REGULAR VARIABLES?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REGULAR VARIABLE (doesn't work across components):
 * ```javascript
 * let score = 501;  // Only this file knows about it
 * score = 481;      // Other components don't know it changed
 * ```
 *
 * SVELTE STORE (works everywhere):
 * ```javascript
 * const score = writable(501);  // Everyone can access this
 * score.set(481);               // ALL components automatically update!
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TWO TYPES OF STORES IN THIS FILE:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. WRITABLE STORES - Can be changed directly
 *    Example: gameState.set({ currentLeg: 2 })
 *
 * 2. DERIVED STORES - Automatically calculated from other stores
 *    Example: currentScore = automatically calculated from gameState
 *    You can't set a derived store - it updates itself when its sources change
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { writable, derived, type Readable } from 'svelte/store';
import type {
  GameState,       // Main game info (scores, current thrower, etc.)
  DartThrow,       // Individual dart data
  TurnData,        // Three darts = one turn
  LegData,         // Complete leg/game data
  PlayerGameStats, // Statistics for a player
  ScoringMode,     // How user enters scores (dart-by-dart, turn total, etc.)
  CheckoutRoute    // Suggested ways to finish the game
} from '../types/scoring';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 1: CORE GAME STATE
 * ═══════════════════════════════════════════════════════════════════════════
 * These stores hold the fundamental state of the game as it's being played.
 */

/**
 * GAME STATE - The Master Control Center
 *
 * This store holds the absolute core information about the current game.
 *
 * STRUCTURE:
 * {
 *   gameId: 'abc-123',            // Unique identifier for this game
 *   currentLeg: 1,                // Which leg are we on? (1, 2, 3...)
 *   homeScore: 501,               // Home player's remaining score
 *   awayScore: 501,               // Away player's remaining score
 *   currentThrower: 'home',       // Who is throwing now? ('home' or 'away')
 *   dartsThrown: 0,               // How many darts thrown in current turn (0-3)
 *   gameComplete: false,          // Is the entire game finished?
 *   gameType: 'league'            // Type: 'league', 'practice', 'tournament'
 * }
 *
 * HOW IT'S USED:
 * - UI displays homeScore and awayScore
 * - When dart is thrown, scores are updated
 * - currentThrower determines whose turn it is
 *
 * EXAMPLE FLOW:
 * 1. Game starts: homeScore=501, awayScore=501, currentThrower='away'
 * 2. Away player scores 60
 * 3. Update: awayScore=441, currentThrower='home'
 * 4. Home player scores 45
 * 5. Update: homeScore=456, currentThrower='away'
 * ... and so on until someone reaches exactly 0
 */
export const gameState = writable<GameState>({
  gameId: '',
  currentLeg: 1,
  homeScore: 501,
  awayScore: 501,
  currentThrower: 'home',
  dartsThrown: 0,
  gameComplete: false,
  gameType: 'league'
});

/**
 * MATCH FORMAT - Best of What?
 *
 * Darts matches can be:
 * - Single leg (first to 0 wins)
 * - Best of 3 (first to win 2 legs)
 * - Best of 5 (first to win 3 legs)
 * - Best of 7 (first to win 4 legs)
 *
 * STRUCTURE:
 * {
 *   legFormat: 'bo3',        // What format? 'single', 'bo3', 'bo5', 'bo7'
 *   homeLegsWon: 1,          // How many legs has home won?
 *   awayLegsWon: 0,          // How many legs has away won?
 *   requiredLegs: 2          // How many needed to win match?
 * }
 *
 * EXAMPLE:
 * Best of 5 match, currently 2-1 to home player
 * {
 *   legFormat: 'bo5',
 *   homeLegsWon: 2,
 *   awayLegsWon: 1,
 *   requiredLegs: 3    // First to 3 wins the match
 * }
 */
export const matchFormat = writable<{
  legFormat: 'single' | 'bo3' | 'bo5' | 'bo7';
  homeLegsWon: number;
  awayLegsWon: number;
  requiredLegs: number;
}>({
  legFormat: 'single',
  homeLegsWon: 0,
  awayLegsWon: 0,
  requiredLegs: 1
});

/**
 * GAME STATUS - Is the Game Running?
 *
 * Controls the overall state of the match:
 * - 'setup': Not started yet, showing setup screen
 * - 'playing': Currently in progress
 * - 'paused': Player hit pause button (maybe getting a drink!)
 * - 'finished': Game completely done
 *
 * WHY THIS EXISTS:
 * Different screens show based on status:
 * - setup → show player names, choose format
 * - playing → show dart entry interface
 * - paused → show pause menu with resume/quit
 * - finished → show final statistics
 */
export const gameStatus = writable<'setup' | 'playing' | 'paused' | 'finished'>('setup');

/**
 * LEG START STATUS - Has Each Player Started?
 *
 * In some darts formats, you must START on a double. This tracks whether each
 * player has successfully hit their first double to "get off the mark".
 *
 * STRUCTURE:
 * {
 *   homeStarted: false,  // Has home player hit opening double?
 *   awayStarted: false   // Has away player hit opening double?
 * }
 *
 * EXAMPLE FLOW (double-start game):
 * 1. Home throws at double 20, misses → homeStarted stays false
 * 2. Away throws at double 16, hits it! → awayStarted = true, awayScore = 469
 * 3. Home throws at double 20, hits it! → homeStarted = true, homeScore = 461
 * 4. Now both can score normally
 *
 * NOTE: Not all formats require double-start. League matches typically don't.
 */
export const legStartStatus = writable<{
  homeStarted: boolean;
  awayStarted: boolean;
}>({
  homeStarted: false,
  awayStarted: false
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 2: SCORING INPUT MODES
 * ═══════════════════════════════════════════════════════════════════════════
 * Different ways to enter dart scores.
 */

/**
 * SCORING MODE - How Are We Entering Scores?
 *
 * The app supports three ways to record darts:
 *
 * 1. 'dart-by-dart': Enter each dart individually
 *    - Tap 20, tap Treble, tap Confirm = 60
 *    - Tap 20, tap Treble, tap Confirm = 60
 *    - Tap 1, tap Single, tap Confirm = 1
 *    - Turn total = 121
 *
 * 2. 'turn-total': Enter the total for 3 darts at once
 *    - Tap keyboard and type "121" = whole turn recorded
 *
 * 3. 'simple': Simplified mode (not commonly used)
 *
 * WHY MULTIPLE MODES?
 * - dart-by-dart: Most detailed, tracks every single dart for statistics
 * - turn-total: Faster for casual games where you don't care about individual darts
 */
export const scoringMode = writable<ScoringMode['type']>('dart-by-dart');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 3: DART HISTORY & UNDO/REDO
 * ═══════════════════════════════════════════════════════════════════════════
 * Everything needed to track dart history and support undo/redo.
 */

/**
 * DART HISTORY - Complete Record of All Darts Thrown
 *
 * An array containing EVERY SINGLE DART thrown in the game so far.
 *
 * STRUCTURE:
 * [
 *   {
 *     id: 'uuid-1',
 *     legNumber: 1,
 *     turnNumber: 1,
 *     dartNumber: 1,
 *     dartScore: 60,             // Scored 60 (treble 20)
 *     runningScore: 441,         // Player's score is now 441
 *     isDoubleAttempt: false,
 *     isCheckoutAttempt: false,
 *     checkoutSuccessful: false,
 *     timestamp: Date
 *   },
 *   {
 *     id: 'uuid-2',
 *     legNumber: 1,
 *     turnNumber: 1,
 *     dartNumber: 2,
 *     dartScore: 60,
 *     runningScore: 381,         // Now 381
 *     ...
 *   },
 *   ... hundreds more darts ...
 * ]
 *
 * WHY WE NEED THIS:
 * - Calculate player statistics (average, 180s, etc.)
 * - Show dart-by-dart replay after game
 * - Undo/redo functionality
 * - Verify game was played correctly
 */
export const dartHistory = writable<DartThrow[]>([]);

/**
 * CURRENT TURN DARTS - The Darts Being Thrown Right Now
 *
 * Temporary storage for the current turn (max 3 darts).
 *
 * EXAMPLE FLOW:
 * 1. Player throws first dart (60)
 *    currentTurnDarts = [{ dartScore: 60, dartNumber: 1, ... }]
 * 2. Player throws second dart (45)
 *    currentTurnDarts = [{ dartScore: 60 }, { dartScore: 45 }]
 * 3. Player throws third dart (26)
 *    currentTurnDarts = [{ dartScore: 60 }, { dartScore: 45 }, { dartScore: 26 }]
 * 4. Turn completes (total = 131)
 *    - All 3 darts move to dartHistory
 *    - currentTurnDarts = [] (reset for next turn)
 *    - Switch to other player
 *
 * WHY SEPARATE FROM DART HISTORY?
 * Because we might want to UNDO the turn before it's complete.
 * If user enters 60, 60, 1 but meant to enter 60, 60, 60, they can
 * clear the turn and re-enter.
 */
export const currentTurnDarts = writable<DartThrow[]>([]);

/**
 * GAME SNAPSHOT - Complete State at a Moment in Time
 *
 * When we want to support undo/redo, we need to save EVERYTHING
 * about the game state, not just one value.
 *
 * STRUCTURE:
 * {
 *   dartHistory: [...all darts thrown],
 *   currentTurnDarts: [...darts in current turn],
 *   gameState: { homeScore: 381, awayScore: 441, ... },
 *   legStartStatus: { homeStarted: true, awayStarted: true }
 * }
 *
 * WHY THIS STRUCTURE?
 * If we only saved "the last dart", we couldn't undo complex operations
 * like completing a turn. By saving the ENTIRE game state, we can jump
 * back to ANY previous state perfectly.
 */
interface GameSnapshot {
  dartHistory: DartThrow[];
  currentTurnDarts: DartThrow[];
  gameState: GameState;
  legStartStatus: { homeStarted: boolean; awayStarted: boolean };
}

/**
 * DART HISTORY STACK - The Undo History
 *
 * A stack (last-in-first-out) of game snapshots.
 *
 * VISUALIZATION:
 * [
 *   { state after dart 1 },
 *   { state after dart 2 },   ← If we undo, go back to this
 *   { state after dart 3 }    ← Current state is here
 * ]
 *
 * WHEN WE ADD TO STACK:
 * - User enters a dart
 * - BEFORE applying the dart, save current state to stack
 * - THEN apply the dart
 * - Now if user hits undo, pop the stack and restore that state
 *
 * EXAMPLE:
 * Stack: [state_before_dart1, state_before_dart2, state_before_dart3]
 * User hits undo:
 * - Pop state_before_dart3
 * - Restore it (dart 3 disappears)
 * - Move popped state to redoStack (in case they want to redo)
 */
export const dartHistoryStack = writable<GameSnapshot[]>([]);

/**
 * REDO STACK - The Redo History
 *
 * When user undoes something, we save it here so they can redo it.
 *
 * FLOW:
 * 1. User enters 3 darts: 60, 60, 60
 * 2. User hits undo (meant to enter 60, 60, 45)
 * 3. Last dart disappears, moved to redoStack
 * 4. User enters correct dart: 45
 * 5. Turn complete!
 *
 * Alternatively:
 * 1. User enters 3 darts: 60, 60, 60
 * 2. User hits undo (oops, mistake!)
 * 3. User realizes it WAS right
 * 4. User hits REDO
 * 5. The 60 comes back from redoStack
 *
 * WHY IT'S SEPARATE:
 * If dartHistoryStack held BOTH undo and redo, we wouldn't know which
 * direction we're moving. Two stacks makes it clear.
 */
export const redoStack = writable<GameSnapshot[]>([]);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 4: INPUT STORES
 * ═══════════════════════════════════════════════════════════════════════════
 * Temporary values while user is typing/selecting.
 */

/**
 * TURN TOTAL INPUT - For 'turn-total' Mode
 *
 * When user chooses turn-total mode, they type the total score directly.
 *
 * EXAMPLE:
 * turnTotalInput = "121"  // User typed this on keyboard
 *
 * When user confirms:
 * - Parse "121" to number 121
 * - Deduct from player's score
 * - Clear input
 */
export const turnTotalInput = writable<string>('');

/**
 * DART INPUT - For 'dart-by-dart' Mode (legacy)
 *
 * Similar to turnTotalInput but for individual darts.
 * Less commonly used because NumberGrid component handles input differently.
 */
export const dartInput = writable<string>('');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 5: GAME HISTORY & STATISTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * LEG HISTORY - All Completed Legs
 *
 * When a leg finishes, we save complete data about it here.
 *
 * STRUCTURE:
 * [
 *   {
 *     legNumber: 1,
 *     winner: 'home',
 *     finalScore: 0,
 *     darts: 18,              // Won in 18 darts
 *     turns: 6,
 *     average: 27.83,
 *     highestScore: 180,
 *     checkoutScore: 32,
 *     ...
 *   },
 *   {
 *     legNumber: 2,
 *     winner: 'away',
 *     ...
 *   }
 * ]
 *
 * WHY WE NEED THIS:
 * - Show statistics screen after match
 * - Compare performance across legs
 * - Track who's winning best-of-X match
 */
export const legHistory = writable<LegData[]>([]);

/**
 * GAME STATS - Player Statistics
 *
 * Calculated statistics for each player after game completes.
 *
 * STRUCTURE:
 * [
 *   {
 *     playerId: 'home',
 *     playerName: 'John Doe',
 *     gameWon: true,
 *     legsPlayed: 3,
 *     legsWon: 2,
 *     totalDarts: 52,
 *     totalPoints: 1503,
 *     average: 28.9,
 *     scores180: 1,           // How many maximum scores
 *     scores140Plus: 3,
 *     scores100Plus: 8,
 *     doubleAttempts: 7,
 *     doubleHits: 3,
 *     doublePercentage: 42.8,
 *     checkoutAttempts: 5,
 *     checkoutHits: 2,
 *     checkoutPercentage: 40,
 *     highestCheckout: 87,
 *     ...
 *   },
 *   {
 *     playerId: 'away',
 *     ...
 *   }
 * ]
 */
export const gameStats = writable<PlayerGameStats[]>([]);

/**
 * ENHANCED STATS - Additional Tracking
 *
 * Extra statistics that don't fit in PlayerGameStats.
 *
 * STRUCTURE:
 * {
 *   checkoutAttempts: 5,         // Total checkout opportunities
 *   checkoutHits: 2,             // Successful checkouts
 *   highestCheckout: 87,         // Best finish
 *   gameStartTime: Date,         // When game began
 *   lastDartTime: Date,          // Most recent dart thrown
 *   totalGameTime: 1234567       // Milliseconds elapsed
 * }
 *
 * USED FOR:
 * - Time-based statistics
 * - Game duration display
 * - Average time per dart
 */
export const enhancedStats = writable<{
  checkoutAttempts: number;
  checkoutHits: number;
  highestCheckout: number;
  gameStartTime: Date | null;
  lastDartTime: Date | null;
  totalGameTime: number;
}>({
  checkoutAttempts: 0,
  checkoutHits: 0,
  highestCheckout: 0,
  gameStartTime: null,
  lastDartTime: null,
  totalGameTime: 0
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 6: UI STATE
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * MOBILE UI STATE - Display Preferences
 *
 * Controls what's shown on mobile interface.
 *
 * STRUCTURE:
 * {
 *   showStats: false,           // Show running statistics?
 *   showCheckouts: true,        // Show suggested finishes?
 *   isFullscreen: false,        // Fullscreen mode?
 *   orientation: 'portrait',    // How is device held?
 *   hapticEnabled: true         // Vibrate on button press?
 * }
 *
 * WHY THESE SETTINGS?
 * - showStats: Some players find stats distracting during play
 * - showCheckouts: Some prefer to figure out finishes themselves
 * - isFullscreen: Maximize dart entry area
 * - orientation: Adjust layout for landscape/portrait
 * - hapticEnabled: Tactile feedback when tapping numbers
 */
export const mobileUIState = writable<{
  showStats: boolean;
  showCheckouts: boolean;
  isFullscreen: boolean;
  orientation: 'portrait' | 'landscape';
  hapticEnabled: boolean;
}>({
  showStats: false,
  showCheckouts: true,
  isFullscreen: false,
  orientation: 'portrait',
  hapticEnabled: true
});

/**
 * SHOW CHECKOUTS - Display Finish Suggestions?
 *
 * Simple toggle for checkout display.
 *
 * USAGE:
 * if ($showCheckouts && currentScore <= 170) {
 *   // Show: "Checkout route: T20, T20, Bull"
 * }
 */
export const showCheckouts = writable<boolean>(true);

/**
 * CHECKOUT ROUTES - Suggested Finishing Combinations
 *
 * When player can finish the game, this holds the possible routes.
 *
 * STRUCTURE:
 * [
 *   {
 *     darts: [60, 60, 50],      // T20, T20, Bull
 *     difficulty: 8,             // Rating out of 10
 *     description: "T20 → T20 → Bull"
 *   },
 *   {
 *     darts: [57, 57, 26],      // T19, T19, D13
 *     difficulty: 7,
 *     description: "T19 → T19 → D13"
 *   },
 *   ...
 * ]
 *
 * EXAMPLE:
 * Player has 170 remaining (maximum checkout):
 * Routes: [
 *   { darts: [60, 60, 50], description: "T20 → T20 → Bull" }  // The famous "Big Fish"
 * ]
 */
export const checkoutRoutes = writable<CheckoutRoute[]>([]);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 7: DERIVED STORES (AUTOMATICALLY CALCULATED)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * These stores are NOT set directly. They automatically update when their
 * source stores change.
 *
 * Think of them like Excel formulas:
 * - Cell A1 = 100
 * - Cell B1 = 200
 * - Cell C1 = A1 + B1  (automatically 300, updates when A1 or B1 change)
 */

/**
 * CURRENT SCORE - Whose Turn, What's Their Score?
 *
 * AUTO-CALCULATED from gameState.
 *
 * LOGIC:
 * If it's home's turn → return homeScore
 * If it's away's turn → return awayScore
 *
 * EXAMPLE:
 * gameState = { homeScore: 301, awayScore: 441, currentThrower: 'home' }
 * currentScore = 301  (automatically!)
 *
 * WHY DERIVED?
 * Instead of updating currentScore every time we change gameState,
 * it just watches gameState and calculates itself.
 */
export const currentScore: Readable<number> = derived(
  gameState,
  ($gameState) => $gameState.currentThrower === 'home' ? $gameState.homeScore : $gameState.awayScore
);

/**
 * CURRENT DARTS REMAINING - How Many Darts Left in Turn?
 *
 * AUTO-CALCULATED from currentTurnDarts.
 *
 * LOGIC:
 * 3 - (number of darts thrown so far)
 *
 * EXAMPLES:
 * currentTurnDarts = []                           → dartsRemaining = 3
 * currentTurnDarts = [dart1]                      → dartsRemaining = 2
 * currentTurnDarts = [dart1, dart2]               → dartsRemaining = 1
 * currentTurnDarts = [dart1, dart2, dart3]        → dartsRemaining = 0
 *
 * DISPLAYED AS:
 * "3 darts remaining"
 * "2 darts remaining"
 * "1 dart remaining"
 * "0 darts remaining"
 */
export const currentDartsRemaining: Readable<number> = derived(
  [currentTurnDarts],
  ([$currentTurnDarts]) => Math.max(0, 3 - $currentTurnDarts.length)
);

/**
 * CAN ADD DART - Is There Room for Another Dart?
 *
 * AUTO-CALCULATED from currentTurnDarts.
 *
 * LOGIC:
 * true if less than 3 darts thrown
 * false if 3 darts already thrown
 *
 * USED BY:
 * Number buttons on UI:
 * <button disabled={!$canAddDart}>20</button>
 *
 * When 3 darts are thrown, number buttons become disabled.
 */
export const canAddDart: Readable<boolean> = derived(
  [currentTurnDarts],
  ([$currentTurnDarts]) => $currentTurnDarts.length < 3
);

/**
 * DARTS REMAINING - Duplicate of currentDartsRemaining
 *
 * ⚠️ CODE DUPLICATION ALERT ⚠️
 *
 * This is IDENTICAL to currentDartsRemaining above.
 * Both calculate: 3 - currentTurnDarts.length
 *
 * WHY DUPLICATE?
 * Likely historical - different components used different names.
 * Should be consolidated into one.
 *
 * RECOMMENDATION:
 * Use currentDartsRemaining everywhere and delete this one.
 */
export const dartsRemaining: Readable<number> = derived(
  [currentTurnDarts],
  ([$currentTurnDarts]) => Math.max(0, 3 - $currentTurnDarts.length)
);

/**
 * CAN UNDO - Is There Anything to Undo?
 *
 * AUTO-CALCULATED from dartHistoryStack.
 *
 * LOGIC:
 * true if stack has items
 * false if stack is empty
 *
 * USED BY:
 * <button disabled={!$canUndo}>Undo</button>
 *
 * When no history exists, undo button is disabled.
 */
export const canUndo: Readable<boolean> = derived(
  [dartHistoryStack],
  ([$dartHistoryStack]) => $dartHistoryStack.length > 0
);

/**
 * CAN REDO - Is There Anything to Redo?
 *
 * AUTO-CALCULATED from redoStack.
 *
 * LOGIC:
 * true if redo stack has items
 * false if redo stack is empty
 *
 * USED BY:
 * <button disabled={!$canRedo}>Redo</button>
 */
export const canRedo: Readable<boolean> = derived(
  [redoStack],
  ([$redoStack]) => $redoStack.length > 0
);

/**
 * IS PLAYER TURN - Is It the Local Player's Turn?
 *
 * AUTO-CALCULATED from gameState.
 *
 * LOGIC:
 * - If practice game → always true (single player)
 * - If league game → true if currentThrower === 'home'
 *
 * WHY THIS EXISTS:
 * In league matches, you're only recording your own darts, not opponent's.
 * So dart entry is disabled when it's opponent's turn.
 *
 * EXAMPLE:
 * Practice game: Always allow dart entry
 * League game: Only allow when it's your turn
 */
export const isPlayerTurn: Readable<boolean> = derived(
  [gameState],
  ([$gameState]) => {
    return $gameState.gameType === 'practice' || $gameState.currentThrower === 'home';
  }
);

/**
 * CURRENT TURN TOTAL - Sum of Darts in Current Turn
 *
 * AUTO-CALCULATED from currentTurnDarts, turnTotalInput, scoringMode.
 *
 * LOGIC:
 * If mode is 'dart-by-dart':
 *   Add up all dart scores in currentTurnDarts
 *   Example: [60, 60, 21] → total = 141
 *
 * If mode is 'turn-total':
 *   Parse the turnTotalInput string
 *   Example: "141" → total = 141
 *
 * DISPLAYED AS:
 * "Turn total: 141"
 */
export const currentTurnTotal: Readable<number> = derived(
  [currentTurnDarts, turnTotalInput, scoringMode],
  ([$currentTurnDarts, $turnTotalInput, $scoringMode]) => {
    if ($scoringMode === 'dart-by-dart') {
      return $currentTurnDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
    }
    return parseInt($turnTotalInput) || 0;
  }
);

/**
 * CAN COMPLETE TURN - Has User Entered Anything?
 *
 * AUTO-CALCULATED from currentTurnDarts, turnTotalInput, scoringMode.
 *
 * LOGIC:
 * If mode is 'dart-by-dart':
 *   true if at least 1 dart entered
 *
 * If mode is 'turn-total':
 *   true if user typed something
 *
 * USED BY:
 * <button disabled={!$canCompleteTurn}>Confirm Turn</button>
 *
 * Prevents confirming empty turn.
 */
export const canCompleteTurn: Readable<boolean> = derived(
  [currentTurnDarts, turnTotalInput, scoringMode],
  ([$currentTurnDarts, $turnTotalInput, $scoringMode]) => {
    if ($scoringMode === 'dart-by-dart') {
      return $currentTurnDarts.length > 0;
    }
    return $turnTotalInput.length > 0;
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 8: DISPLAY-FOCUSED DERIVED STORES
 * ═══════════════════════════════════════════════════════════════════════════
 * These are purely for UI display, formatted for human reading.
 */

/**
 * HOME SCORE DISPLAY - Home Player's Score as String
 *
 * Just converts number to string for display.
 * 441 → "441"
 */
export const homeScoreDisplay: Readable<string> = derived(
  gameState,
  ($gameState) => $gameState.homeScore.toString()
);

/**
 * AWAY SCORE DISPLAY - Away Player's Score as String
 *
 * 381 → "381"
 */
export const awayScoreDisplay: Readable<string> = derived(
  gameState,
  ($gameState) => $gameState.awayScore.toString()
);

/**
 * CURRENT THROWER NAME - "Home" or "Away"
 *
 * Converts 'home'/'away' to capitalized string for display.
 */
export const currentThrowerName: Readable<string> = derived(
  gameState,
  ($gameState) => $gameState.currentThrower === 'home' ? 'Home' : 'Away'
);

/**
 * DARTS REMAINING DISPLAY - Formatted with Proper Pluralization
 *
 * 3 → "3 darts remaining"
 * 2 → "2 darts remaining"
 * 1 → "1 dart remaining"  (note: "dart" not "darts")
 * 0 → "0 darts remaining"
 */
export const dartsRemainingDisplay: Readable<string> = derived(
  gameState,
  ($gameState) => {
    const remaining = 3 - $gameState.dartsThrown;
    return `${remaining} dart${remaining !== 1 ? 's' : ''} remaining`;
  }
);

/**
 * CURRENT LEG STATS - Live Statistics for Current Leg
 *
 * AUTO-CALCULATED from dartHistory and gameState.
 *
 * Calculates running statistics as the leg is being played:
 * - Total darts thrown in this leg
 * - Total points scored
 * - Current average
 * - Number of 80+, 100+, 140+, 180 scores
 *
 * EXAMPLE:
 * After 6 darts in leg 1:
 * {
 *   totalDarts: 6,
 *   totalPoints: 327,        // 60 + 60 + 60 + 60 + 60 + 27
 *   average: 54.5,           // 327 / 6
 *   scores80Plus: 2,         // Two turns of 180 and 147
 *   scores100Plus: 2,
 *   scores140Plus: 2,
 *   scores180: 1             // One maximum
 * }
 *
 * DISPLAYED AS:
 * "Average: 54.5"
 * "180s: 1"
 * "100+: 2"
 */
export const currentLegStats: Readable<Partial<PlayerGameStats>> = derived(
  [dartHistory, gameState],
  ([$dartHistory, $gameState]) => {
    // Filter to only darts from current leg
    const currentLegDarts = $dartHistory.filter(dart => dart.legNumber === $gameState.currentLeg);

    if (currentLegDarts.length === 0) {
      return {
        totalDarts: 0,
        totalPoints: 0,
        average: 0,
        scores80Plus: 0,
        scores100Plus: 0,
        scores140Plus: 0,
        scores180: 0
      };
    }

    const totalDarts = currentLegDarts.length;
    const totalPoints = currentLegDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
    const average = totalDarts > 0 ? totalPoints / totalDarts : 0;

    // Calculate turn totals
    // Group darts by turn number and sum them
    const turnTotals = new Map<string, number>();
    currentLegDarts.forEach(dart => {
      const key = `${dart.turnNumber}`;
      turnTotals.set(key, (turnTotals.get(key) || 0) + dart.dartScore);
    });

    const turnScores = Array.from(turnTotals.values());

    return {
      totalDarts,
      totalPoints,
      average: Math.round(average * 100) / 100,  // Round to 2 decimal places
      scores80Plus: turnScores.filter(score => score >= 80).length,
      scores100Plus: turnScores.filter(score => score >= 100).length,
      scores140Plus: turnScores.filter(score => score >= 140).length,
      scores180: turnScores.filter(score => score === 180).length
    };
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION 9: ACTIONS (FUNCTIONS TO MODIFY STORES)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * These functions perform operations on the stores above.
 * Components call these to make things happen in the game.
 */

export const scoringActions = {
  /**
   * INITIALIZE GAME - Start a New Game
   *
   * CALLED BY: Game setup screen when user clicks "Start Game"
   *
   * PARAMETERS:
   * - gameId: Unique identifier (usually from database)
   * - homePlayer: Name of home player
   * - awayPlayer: Name of away player
   * - gameType: 'league', 'practice', or 'tournament'
   * - venue: 'home' or 'away' (determines who throws first)
   *
   * WHAT IT DOES:
   * 1. Determines first thrower based on venue:
   *    - HOME venue: Opponent throws first (we throw second)
   *    - AWAY venue: We throw first
   * 2. Resets all scores to 501
   * 3. Sets leg to 1
   * 4. Clears all history
   * 5. Sets status to 'playing'
   *
   * EXAMPLE:
   * scoringActions.initializeGame(
   *   'abc-123',
   *   'John Doe',
   *   'Bob Smith',
   *   'league',
   *   'away'
   * );
   * Result: Game starts, John throws first (because away venue)
   */
  initializeGame: (
    gameId: string,
    homePlayer: string,
    awayPlayer: string,
    gameType: GameState['gameType'] = 'league',
    venue?: 'home' | 'away'
  ) => {
    // Determine who throws first based on venue
    const firstThrower = venue === 'home' ? 'away' : 'home';

    gameState.set({
      gameId,
      currentLeg: 1,
      homeScore: 501,
      awayScore: 501,
      currentThrower: firstThrower,
      dartsThrown: 0,
      gameComplete: false,
      gameType
    });

    gameStatus.set('playing');

    legStartStatus.set({
      homeStarted: false,
      awayStarted: false
    });

    // Clear all history
    dartHistory.set([]);
    currentTurnDarts.set([]);
    legHistory.set([]);
    gameStats.set([]);
    enhancedStats.set({
      checkoutAttempts: 0,
      checkoutHits: 0,
      highestCheckout: 0,
      gameStartTime: null,
      lastDartTime: null,
      totalGameTime: 0
    });
  },

  /**
   * SET SCORING MODE - Change How User Enters Darts
   *
   * CALLED BY: Settings menu or mode toggle button
   *
   * WHAT IT DOES:
   * 1. Changes the scoring mode
   * 2. Clears any current input
   * 3. Clears current turn (to avoid confusion)
   *
   * EXAMPLE:
   * scoringActions.setScoringMode('turn-total');
   * Now user can type "141" instead of entering each dart
   */
  setScoringMode: (mode: ScoringMode['type']) => {
    scoringMode.set(mode);
    // Clear current inputs to avoid confusion
    currentTurnDarts.set([]);
    turnTotalInput.set('');
    dartInput.set('');
  },

  // ... More actions documented below ...
};

// NOTE: This file is 642 lines total. Continue documentation for remaining actions...
