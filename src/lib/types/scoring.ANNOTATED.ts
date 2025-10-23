/**
 * ============================================================================
 * SCORING TYPES - TypeScript Type Definitions for Darts Scoring System
 * ============================================================================
 *
 * PURPOSE:
 * Defines all data structures and types used throughout the scoring system.
 * These interfaces ensure type safety and document the shape of data.
 *
 * USED BY:
 * - scoringStores.ts (state management)
 * - MobileDartEntry.svelte (scoring UI)
 * - checkoutService.ts (checkout calculations)
 * - statisticsService.ts (statistics calculations)
 * - Database services (saving game data)
 *
 * WHY TYPESCRIPT TYPES MATTER:
 * - Catch errors at compile-time instead of runtime
 * - Provide autocomplete in editor
 * - Document expected data structure
 * - Enable refactoring with confidence
 */

/**
 * ============================================================================
 * DART & TURN TRACKING INTERFACES
 * ============================================================================
 */

/**
 * DART THROW - Single Dart Thrown
 *
 * Represents one dart out of three in a turn.
 *
 * FIELDS:
 * - id: Unique identifier (uuid)
 * - legNumber: Which leg (1, 2, 3, etc.)
 * - turnNumber: Which turn in the leg (1, 2, 3, etc.)
 * - dartNumber: Which dart in the turn (1, 2, or 3)
 * - dartScore: Points scored (0-60)
 * - runningScore: Score remaining AFTER this dart
 * - isDoubleAttempt: Was this dart thrown at a double?
 * - isCheckoutAttempt: Was this thrown to finish the game?
 * - checkoutSuccessful: Did this dart win the leg?
 * - timestamp: When dart was thrown
 * - playerId: Optional UUID of player who threw (for database)
 *
 * EXAMPLE:
 * {
 *   id: 'abc-123',
 *   legNumber: 1,
 *   turnNumber: 5,
 *   dartNumber: 2,           // Second dart of turn
 *   dartScore: 60,            // Hit triple 20
 *   runningScore: 281,        // Had 341, now 281
 *   isDoubleAttempt: false,
 *   isCheckoutAttempt: false,
 *   checkoutSuccessful: false,
 *   timestamp: new Date('2025-10-23T20:15:32Z')
 * }
 */
export interface DartThrow {
  id: string;
  legNumber: number;
  turnNumber: number;
  dartNumber: number; // 1, 2, or 3
  dartScore: number;
  runningScore: number;
  isDoubleAttempt: boolean;
  isCheckoutAttempt: boolean;
  checkoutSuccessful: boolean;
  timestamp: Date;
  playerId?: string;
}

/**
 * TURN DATA - Complete 3-Dart Turn
 *
 * Groups 3 darts into a single turn with summary data.
 *
 * FIELDS:
 * - id: Unique identifier
 * - legNumber: Which leg this turn is in
 * - turnNumber: Which turn (1st, 2nd, 3rd, etc.)
 * - totalScore: Sum of all 3 darts (0-180)
 * - darts: Array of 1-3 DartThrow objects
 * - bustTurn: Did player go below 0 or finish on non-double?
 * - checkoutAttempt: Did player try to finish?
 * - checkoutSuccessful: Did player actually finish?
 *
 * EXAMPLE (Good Turn):
 * {
 *   id: 'turn-123',
 *   legNumber: 1,
 *   turnNumber: 5,
 *   totalScore: 140,          // T20 + T20 + 20
 *   darts: [dart1, dart2, dart3],
 *   bustTurn: false,
 *   checkoutAttempt: false,
 *   checkoutSuccessful: false
 * }
 *
 * EXAMPLE (Bust Turn):
 * {
 *   id: 'turn-456',
 *   legNumber: 1,
 *   turnNumber: 12,
 *   totalScore: 0,            // Bust = score doesn't count
 *   darts: [dart1, dart2],    // Might have fewer than 3 darts
 *   bustTurn: true,           // Player went below 0
 *   checkoutAttempt: true,
 *   checkoutSuccessful: false
 * }
 */
export interface TurnData {
  id: string;
  legNumber: number;
  turnNumber: number;
  totalScore: number;
  darts: DartThrow[];
  bustTurn: boolean;
  checkoutAttempt: boolean;
  checkoutSuccessful: boolean;
}

/**
 * LEG DATA - Complete Leg Summary
 *
 * Represents one complete leg from 501 to 0.
 *
 * FIELDS:
 * - id: Unique identifier
 * - legNumber: Which leg (1, 2, 3, etc.)
 * - startingScore: Usually 501
 * - finalScore: Should be 0 if won, >0 if lost
 * - won: Did this player win this leg?
 * - totalDarts: How many darts to finish (or until opponent won)
 * - turns: Array of all TurnData objects
 * - duration: Optional time in seconds
 * - darts: Optional total darts (duplicate of totalDarts)
 *
 * EXAMPLE:
 * {
 *   id: 'leg-abc',
 *   legNumber: 1,
 *   startingScore: 501,
 *   finalScore: 0,
 *   won: true,
 *   totalDarts: 18,           // Finished in 6 turns (18 darts)
 *   turns: [turn1, turn2, turn3, turn4, turn5, turn6],
 *   duration: 245             // 4 minutes 5 seconds
 * }
 */
export interface LegData {
  id: string;
  legNumber: number;
  startingScore: number;
  finalScore: number;
  won: boolean;
  totalDarts: number;
  turns: TurnData[];
  duration?: number; // in seconds
  darts?: number;
}

/**
 * ============================================================================
 * GAME STATE INTERFACE
 * ============================================================================
 */

/**
 * GAME STATE - Current Game Status
 *
 * The master state object that tracks the live game.
 * This is what's stored in the `gameState` writable store.
 *
 * FIELDS:
 * - gameId: Unique identifier (uuid)
 * - currentLeg: Which leg is being played (1, 2, 3, etc.)
 * - homeScore: Home player's remaining score
 * - awayScore: Away player's remaining score
 * - currentThrower: Who's throwing now ('home' or 'away')
 * - dartsThrown: How many darts thrown in current turn (0, 1, or 2)
 *   NOTE: When dartsThrown = 3, turn is completed and this resets to 0
 * - gameComplete: Has someone won the match?
 * - winner: Optional 'home' | 'away' if game complete
 * - gameType: Type of game being played
 *
 * GAME TYPES:
 * - 'league': Official league match (saved to database)
 * - 'practice': Practice game (may or may not save)
 * - 'warmup': Warmup session (usually not saved)
 *
 * EXAMPLE (Mid-Game):
 * {
 *   gameId: 'game-123',
 *   currentLeg: 2,
 *   homeScore: 341,
 *   awayScore: 267,
 *   currentThrower: 'home',
 *   dartsThrown: 1,           // Home has thrown 1 dart so far
 *   gameComplete: false,
 *   gameType: 'league'
 * }
 *
 * EXAMPLE (Game Complete):
 * {
 *   gameId: 'game-456',
 *   currentLeg: 5,
 *   homeScore: 0,             // Home won by reaching 0
 *   awayScore: 89,
 *   currentThrower: 'home',
 *   dartsThrown: 2,           // Won on 2nd dart
 *   gameComplete: true,
 *   winner: 'home',
 *   gameType: 'league'
 * }
 */
export interface GameState {
  gameId: string;
  currentLeg: number;
  homeScore: number;
  awayScore: number;
  currentThrower: 'home' | 'away';
  dartsThrown: number; // 0, 1, or 2 for current turn
  gameComplete: boolean;
  winner?: 'home' | 'away';
  gameType: 'league' | 'practice' | 'warmup';
}

/**
 * ============================================================================
 * STATISTICS INTERFACE
 * ============================================================================
 */

/**
 * PLAYER GAME STATS - Complete Performance Statistics
 *
 * Calculated at the end of a game to track player performance.
 * Saved to database for historical tracking and leaderboards.
 *
 * FIELDS:
 * - playerId: UUID of player
 * - playerName: Name for display
 * - gameWon: Did they win this game?
 * - legsPlayed: How many legs played
 * - legsWon: How many legs won
 * - totalDarts: Total darts thrown across all legs
 * - totalPoints: Total points scored across all legs
 * - average: Points per dart (NOT 3-dart average)
 * - scores80Plus: Number of 80+ turns
 * - scores100Plus: Number of 100+ turns (tons)
 * - scores140Plus: Number of 140+ turns
 * - scores180: Number of perfect 180s (T20+T20+T20)
 * - doubleAttempts: How many darts thrown at doubles
 * - doubleHits: How many double darts hit
 * - doublePercentage: (doubleHits / doubleAttempts) * 100
 * - checkoutAttempts: How many times had checkout opportunity
 * - checkoutHits: How many times successfully checked out
 * - checkoutPercentage: (checkoutHits / checkoutAttempts) * 100
 * - highestCheckout: Biggest finish (e.g., 170 = T20+T20+Bull)
 * - highestScore: Best 3-dart turn (max 180)
 * - finishPositions: Array of scores finished on (e.g., [32, 40, 16])
 *
 * EXAMPLE:
 * {
 *   playerId: 'player-123',
 *   playerName: 'John Smith',
 *   gameWon: true,
 *   legsPlayed: 5,
 *   legsWon: 3,
 *   totalDarts: 87,
 *   totalPoints: 4185,
 *   average: 48.10,           // 4185 / 87 = 48.10 per dart
 *   scores80Plus: 15,
 *   scores100Plus: 8,
 *   scores140Plus: 3,
 *   scores180: 1,
 *   doubleAttempts: 12,
 *   doubleHits: 5,
 *   doublePercentage: 41.67,  // 5 / 12 = 41.67%
 *   checkoutAttempts: 5,
 *   checkoutHits: 3,
 *   checkoutPercentage: 60.00,
 *   highestCheckout: 121,     // T19 + T18 + D10
 *   highestScore: 180,
 *   finishPositions: [32, 40, 16]
 * }
 */
export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  gameWon: boolean;
  legsPlayed: number;
  legsWon: number;
  totalDarts: number;
  totalPoints: number;
  average: number;
  scores80Plus: number;
  scores100Plus: number;
  scores140Plus: number;
  scores180: number;
  doubleAttempts: number;
  doubleHits: number;
  doublePercentage: number;
  checkoutAttempts: number;
  checkoutHits: number;
  checkoutPercentage: number;
  highestCheckout: number;
  highestScore: number;
  finishPositions: number[]; // Scores they finished on
}

/**
 * ============================================================================
 * CHECKOUT INTERFACES
 * ============================================================================
 */

/**
 * CHECKOUT ROUTE - One Way to Finish
 *
 * Represents a single way to checkout a score.
 *
 * FIELDS:
 * - darts: Array of dart scores needed (e.g., [60, 20] = T20 then D10)
 * - difficulty: 1-10 rating (1 = easy, 10 = extremely hard)
 * - description: Human-readable explanation
 *
 * EXAMPLE:
 * {
 *   darts: [60, 60, 41],
 *   difficulty: 5,
 *   description: 'T20, T20, D20 (Bull)' // 161 checkout
 * }
 */
export interface CheckoutRoute {
  darts: number[];
  difficulty: number;
  description: string;
}

/**
 * CHECKOUT DATA - All Possible Checkouts for a Score
 *
 * Complete checkout information for a given score.
 *
 * FIELDS:
 * - score: The score to finish from (2-170)
 * - possible: Can this score be checked out?
 * - routes: All possible checkout routes grouped by dart count
 *   - singleDart: Finishes in 1 dart (only scores 2-40, 50)
 *   - twoDart: Finishes in 2 darts (e.g., 100 = T20 + D20)
 *   - threeDart: Finishes in 3 darts (e.g., 161 = T20 + T20 + D20)
 * - recommended: Best routes sorted by difficulty
 *
 * IMPOSSIBLE SCORES:
 * 169, 168, 166, 165, 163, 162, 159 cannot be checked out
 * (even with 3 darts you can't hit them with a double finish)
 *
 * EXAMPLE (40):
 * {
 *   score: 40,
 *   possible: true,
 *   routes: {
 *     singleDart: [[40]],     // D20
 *     twoDart: [[20, 20]],    // 20, D10
 *     threeDart: []
 *   },
 *   recommended: [
 *     { darts: [40], difficulty: 2, description: 'D20' },
 *     { darts: [20, 20], difficulty: 3, description: '20, D10' }
 *   ]
 * }
 */
export interface CheckoutData {
  score: number;
  possible: boolean;
  routes: {
    singleDart: number[][];
    twoDart: number[][];
    threeDart: number[][];
  };
  recommended: CheckoutRoute[];
}

/**
 * ============================================================================
 * SCORING MODE INTERFACE
 * ============================================================================
 */

/**
 * SCORING MODE - How User Enters Darts
 *
 * Defines different ways to record dart scores.
 *
 * TYPES:
 * - 'dart-by-dart': Record each individual dart (most detailed)
 * - 'turn-total': Enter total for all 3 darts (faster)
 * - 'simple': Just track who won legs (minimal data)
 *
 * FIELDS:
 * - type: Mode identifier
 * - label: Display name
 * - description: Explanation for user
 * - trackIndividualDarts: Save each dart separately?
 * - showCheckouts: Display checkout suggestions?
 * - calculateStatistics: Compute detailed stats?
 *
 * EXAMPLE:
 * {
 *   type: 'dart-by-dart',
 *   label: 'Dart-by-Dart',
 *   description: 'Record every dart throw with detailed statistics',
 *   trackIndividualDarts: true,   // Save each dart
 *   showCheckouts: true,           // Show finish suggestions
 *   calculateStatistics: true      // Compute averages, percentages, etc.
 * }
 */
export interface ScoringMode {
  type: 'dart-by-dart' | 'turn-total' | 'simple';
  label: string;
  description: string;
  trackIndividualDarts: boolean;
  showCheckouts: boolean;
  calculateStatistics: boolean;
}

/**
 * ============================================================================
 * COMPONENT PROPS INTERFACE
 * ============================================================================
 */

/**
 * SCORING ENGINE PROPS - Props for Scoring Components
 *
 * Configuration passed to scoring UI components.
 *
 * FIELDS:
 * - gameId: Unique game identifier
 * - homePlayerName: Name of home player
 * - awayPlayerName: Name of away player
 * - isLeagueMatch: Official match vs practice?
 * - startingScore: Starting points (default 501)
 * - mode: Scoring mode type (default 'dart-by-dart')
 * - onGameComplete: Callback when game finishes
 * - onScoreUpdate: Callback when score changes
 *
 * EXAMPLE:
 * {
 *   gameId: 'game-123',
 *   homePlayerName: 'John Smith',
 *   awayPlayerName: 'Jane Doe',
 *   isLeagueMatch: true,
 *   startingScore: 501,
 *   mode: 'dart-by-dart',
 *   onGameComplete: (stats) => {
 *     console.log('Game complete!', stats);
 *     saveStatsToDatabase(stats);
 *   },
 *   onScoreUpdate: (home, away) => {
 *     console.log(`Home: ${home}, Away: ${away}`);
 *   }
 * }
 */
export interface ScoringEngineProps {
  gameId: string;
  homePlayerName: string;
  awayPlayerName: string;
  isLeagueMatch: boolean;
  startingScore?: number;
  mode?: ScoringMode['type'];
  onGameComplete?: (stats: PlayerGameStats[]) => void;
  onScoreUpdate?: (homeScore: number, awayScore: number) => void;
}

/**
 * ============================================================================
 * CONSTANTS - Game Mode Configurations
 * ============================================================================
 */

/**
 * GAME MODES - Predefined Scoring Modes
 *
 * Three scoring modes with different levels of detail.
 *
 * DART-BY-DART:
 * - Most detailed
 * - Records every single dart
 * - Shows checkout suggestions
 * - Calculates full statistics
 * - Best for league matches
 *
 * TURN-TOTAL:
 * - Medium detail
 * - Enter total of 3 darts (e.g., "141")
 * - Shows checkout suggestions
 * - Calculates statistics
 * - Faster data entry
 *
 * SIMPLE:
 * - Minimal detail
 * - Just track leg winners
 * - No checkout suggestions
 * - No statistics
 * - Fastest for casual games
 */
export const GAME_MODES: Record<string, ScoringMode> = {
  'dart-by-dart': {
    type: 'dart-by-dart',
    label: 'Dart-by-Dart',
    description: 'Record every dart throw with detailed statistics',
    trackIndividualDarts: true,
    showCheckouts: true,
    calculateStatistics: true
  },
  'turn-total': {
    type: 'turn-total',
    label: 'Turn Total',
    description: 'Enter total score for each turn (3 darts)',
    trackIndividualDarts: false,
    showCheckouts: true,
    calculateStatistics: true
  },
  'simple': {
    type: 'simple',
    label: 'Simple',
    description: 'Basic leg recording with minimal data entry',
    trackIndividualDarts: false,
    showCheckouts: false,
    calculateStatistics: false
  }
};

/**
 * ============================================================================
 * VALIDATION CONSTANTS
 * ============================================================================
 */

/**
 * VALID DART SCORES - All Possible Single Dart Scores
 *
 * A dart can score:
 * - 0: Miss the board entirely
 * - 1-20: Single segment (20 possible)
 * - 2, 4, 6, ..., 40: Double segment (20 possible)
 * - 3, 6, 9, ..., 60: Treble segment (20 possible)
 * - 25: Single bull (outer bull)
 * - 50: Double bull (inner bull / bullseye)
 *
 * Total: 63 possible scores
 *
 * NOTABLE SCORES:
 * - 60: Treble 20 (highest single dart)
 * - 50: Bullseye
 * - 40: Double 20
 * - 25: Outer bull
 *
 * IMPOSSIBLE SCORES:
 * - 23: Can't hit this in one dart
 * - 29: Can't hit this in one dart
 * - 31: Can't hit this in one dart
 * - 35, 37, 41, 43, 44, 46, 47, 49, 52, 53, 55, 56, 58, 59
 */
export const VALID_DART_SCORES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48, 50, 51, 54, 57, 60
];

/**
 * DOUBLE SCORES - All Possible Double Scores
 *
 * Used to:
 * - Validate double-start rule (must hit double before scoring)
 * - Validate finish (must end on double)
 * - Detect double attempts for statistics
 *
 * SCORES:
 * - 2 (D1) to 40 (D20)
 * - 50 (Bullseye / Double bull)
 *
 * WHY IT MATTERS:
 * In 501 darts, you MUST finish on a double. So when player has
 * 32 remaining, they must hit D16 to win.
 */
export const DOUBLE_SCORES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];

/**
 * TREBLE SCORES - All Possible Treble Scores
 *
 * Treble ring multiplies segment by 3.
 *
 * SCORES:
 * - 3 (T1) to 60 (T20)
 *
 * NOTABLE:
 * - T20 (60): Most common target (highest treble)
 * - T19 (57): Second highest treble
 * - T18 (54): Third highest treble
 *
 * WHY TRACK TREBLES:
 * - High score indicator (good players hit lots of trebles)
 * - Used in checkout calculations (T20 + T20 + D20 = 160)
 */
export const TREBLE_SCORES = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60];

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * IS VALID DART SCORE - Check if Score is Possible
 *
 * CALLED BY: Input validation in scoring UI
 *
 * RETURNS: true if score can be hit with one dart, false otherwise
 *
 * EXAMPLES:
 * isValidDartScore(60)  → true  (T20)
 * isValidDartScore(50)  → true  (Bull)
 * isValidDartScore(23)  → false (impossible)
 * isValidDartScore(100) → false (max is 60)
 */
export const isValidDartScore = (score: number): boolean => {
  return VALID_DART_SCORES.includes(score);
};

/**
 * IS DOUBLE SCORE - Check if Score is a Double
 *
 * CALLED BY:
 * - Double-start validation (must hit double to begin scoring)
 * - Finish validation (must end on double)
 * - Statistics tracking (count double attempts/hits)
 *
 * RETURNS: true if score is a double, false otherwise
 *
 * EXAMPLES:
 * isDoubleScore(40) → true  (D20)
 * isDoubleScore(50) → true  (Bull)
 * isDoubleScore(60) → false (T20, not a double)
 * isDoubleScore(32) → true  (D16)
 */
export const isDoubleScore = (score: number): boolean => {
  return DOUBLE_SCORES.includes(score);
};

/**
 * IS CHECKOUT OPPORTUNITY - Can This Score Be Finished?
 *
 * CALLED BY: Checkout suggestion logic
 *
 * LOGIC:
 * - Minimum: 2 (can finish with D1)
 * - Maximum: 170 (T20 + T20 + Bull)
 * - Impossible: 169, 168, 166, 165, 163, 162, 159
 *
 * WHY SOME SCORES ARE IMPOSSIBLE:
 * With 3 darts and double-finish rule, these scores can't be checked out.
 *
 * Example: 169
 * - T20 (60) + T19 (57) = 117, leaving 52
 * - But 52 isn't a double (would need D26, which doesn't exist)
 * - No combination of 3 darts can checkout 169
 *
 * EXAMPLES:
 * isCheckoutOpportunity(40)  → true  (D20)
 * isCheckoutOpportunity(170) → true  (T20 + T20 + Bull)
 * isCheckoutOpportunity(169) → false (impossible)
 * isCheckoutOpportunity(1)   → false (no D0.5)
 * isCheckoutOpportunity(200) → false (too high)
 */
export const isCheckoutOpportunity = (score: number): boolean => {
  return score >= 2 && score <= 170 && score !== 169 && score !== 168 &&
         score !== 166 && score !== 165 && score !== 163 && score !== 162 && score !== 159;
};

/**
 * ============================================================================
 * ERROR CLASSES
 * ============================================================================
 */

/**
 * SCORING ERROR - Base Error Class
 *
 * Parent class for all scoring-related errors.
 * Extends JavaScript's built-in Error class.
 *
 * FIELDS:
 * - message: Error description
 * - code: Error code for programmatic handling
 * - name: 'ScoringError'
 *
 * EXAMPLE:
 * throw new ScoringError('Invalid dart score', 'INVALID_SCORE');
 */
export class ScoringError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ScoringError';
  }
}

/**
 * VALIDATION ERROR - Input Validation Failed
 *
 * Thrown when user input is invalid.
 *
 * EXAMPLES:
 * - User enters 61 (impossible dart score)
 * - User tries to score when they've busted
 * - User tries to finish on non-double
 *
 * USAGE:
 * if (score > 60) {
 *   throw new ValidationError('Dart score cannot exceed 60');
 * }
 */
export class ValidationError extends ScoringError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * GAME STATE ERROR - Invalid Game State Operation
 *
 * Thrown when trying to perform invalid operation on game state.
 *
 * EXAMPLES:
 * - Trying to add dart when game is complete
 * - Trying to undo when no history exists
 * - Trying to complete leg with score > 0
 *
 * USAGE:
 * if (gameComplete) {
 *   throw new GameStateError('Cannot add dart to completed game');
 * }
 */
export class GameStateError extends ScoringError {
  constructor(message: string) {
    super(message, 'GAME_STATE_ERROR');
  }
}

/**
 * ============================================================================
 * END OF SCORING TYPES ANNOTATION
 * ============================================================================
 *
 * SUMMARY:
 *
 * This file defines the complete type system for darts scoring:
 *
 * 1. **Data Structures**
 *    - DartThrow: Individual dart
 *    - TurnData: 3-dart turn
 *    - LegData: Complete leg
 *    - GameState: Live game status
 *    - PlayerGameStats: Performance metrics
 *
 * 2. **Checkout System**
 *    - CheckoutRoute: One way to finish
 *    - CheckoutData: All possible finishes for a score
 *
 * 3. **Configuration**
 *    - ScoringMode: How darts are entered
 *    - GAME_MODES: Predefined mode configurations
 *    - ScoringEngineProps: Component configuration
 *
 * 4. **Validation**
 *    - Valid dart scores (63 possibilities)
 *    - Double scores (for finish validation)
 *    - Treble scores (for high score tracking)
 *    - Utility functions for validation
 *
 * 5. **Error Handling**
 *    - ScoringError: Base error class
 *    - ValidationError: Invalid input
 *    - GameStateError: Invalid operation
 *
 * KEY CONCEPTS:
 * - All scores must be valid dart scores
 * - Must finish on double (2-40 or 50)
 * - Some scores (169, 168, etc.) are impossible to checkout
 * - Three scoring modes for different levels of detail
 * - Full statistics tracking for league matches
 *
 * NEXT FILES TO ANNOTATE:
 * - src/lib/components/MobileDartEntry.svelte - Main UI using these types
 * - src/lib/services/checkoutService.ts - Uses CheckoutData and CheckoutRoute
 * - src/lib/services/statisticsService.ts - Uses PlayerGameStats
 */
