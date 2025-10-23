/**
 * ============================================================================
 * CHECKOUT SERVICE - Calculates All Possible Checkout Routes
 * ============================================================================
 *
 * PURPOSE:
 * Calculates and provides all possible ways to checkout (finish) from any
 * score between 2 and 170 in the game of 501 darts.
 *
 * WHAT IS A CHECKOUT?
 * In 501 darts, you must finish by reducing your score to exactly 0 and
 * ending on a double. For example:
 * - Score 40: Hit D20 (double 20) = checkout in 1 dart
 * - Score 100: Hit T20 (60), then D20 (40) = checkout in 2 darts
 * - Score 161: Hit T20 (60), T19 (57), D22 (44) = checkout in 3 darts
 *
 * WHY THIS SERVICE?
 * The service pre-calculates all possible checkout routes when initialized,
 * then provides instant lookups during gameplay. This allows the UI to show
 * helpful checkout suggestions to players.
 *
 * SINGLETON PATTERN:
 * Only one instance exists (created on first access). This prevents
 * recalculating checkout routes multiple times.
 *
 * ARCHITECTURE:
 * 1. Initialize once with buildCheckoutRoutes()
 * 2. Store all routes in Map for O(1) lookup
 * 3. Provide public methods for checkout queries
 *
 * IMPOSSIBLE CHECKOUTS:
 * Some scores cannot be checked out even with 3 darts:
 * 169, 168, 166, 165, 163, 162, 159
 *
 * Example: Why 169 is impossible?
 * - Max with 3 darts ending on double: T20 (60) + T19 (57) = 117, leaving 52
 * - But 52 isn't a valid double (D26 doesn't exist on dartboard)
 * - No combination of 3 darts can checkout 169
 */

import type { CheckoutData, CheckoutRoute } from '../types/scoring';

/**
 * CHECKOUT SERVICE CLASS
 *
 * Singleton class that manages checkout route calculations.
 */
export class CheckoutService {
  /**
   * Singleton instance (only one exists)
   */
  private static instance: CheckoutService;

  /**
   * Checkout Routes Cache
   *
   * Map of score → CheckoutData
   * Pre-calculated for scores 2-170
   *
   * EXAMPLE:
   * checkoutRoutes.get(40) → {
   *   score: 40,
   *   possible: true,
   *   routes: {
   *     singleDart: [[40]],        // D20
   *     twoDart: [[20, 20], ...],  // 20, D10 etc.
   *     threeDart: [[10, 10, 20], ...]
   *   },
   *   recommended: [...]
   * }
   */
  private checkoutRoutes: Map<number, CheckoutData> = new Map();

  /**
   * ALL POSSIBLE SINGLE DART SCORES
   *
   * Every score that can be hit with one dart:
   * - 0: Miss
   * - 1-20: Singles
   * - 2,4,6...40: Doubles
   * - 3,6,9...60: Trebles
   * - 25: Single bull
   * - 50: Double bull
   *
   * Total: 63 possible scores
   *
   * GAPS: 23, 29, 31, 35, 37, 41, 43, 44, 46, 47, 49, 52, 53, 55, 56, 58, 59
   * These scores cannot be hit with a single dart.
   */
  private readonly singleScores = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48, 50, 51, 54, 57, 60
  ];

  /**
   * ALL FINISHING DOUBLES
   *
   * All valid double scores for finishing:
   * - 2 (D1) through 40 (D20)
   * - 50 (Double bull / Bullseye)
   *
   * Total: 21 possible finishes
   *
   * WHY THESE MATTER:
   * You MUST finish on a double in 501 darts. These are the only
   * valid finishing scores.
   */
  private readonly doubleFinishes = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];

  /**
   * PRIVATE CONSTRUCTOR - Singleton Pattern
   *
   * Constructor is private so only getInstance() can create instances.
   *
   * INITIALIZATION:
   * Immediately builds all checkout routes (2-170)
   */
  private constructor() {
    this.buildCheckoutRoutes();
  }

  /**
   * GET INSTANCE - Singleton Access
   *
   * Returns the single shared instance.
   * Creates it on first access.
   *
   * USAGE:
   * const service = CheckoutService.getInstance();
   * // or use exported singleton:
   * import { checkoutService } from './checkoutService';
   */
  static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService();
    }
    return CheckoutService.instance;
  }

  /**
   * ============================================================================
   * CHECKOUT ROUTE CALCULATION - Core Algorithm
   * ============================================================================
   */

  /**
   * BUILD CHECKOUT ROUTES - Pre-Calculate All Routes
   *
   * CALLED BY: Constructor on initialization
   *
   * WHAT IT DOES:
   * Calculates all possible checkout routes for scores 2-170
   * and stores them in the checkoutRoutes Map.
   *
   * WHY 2-170?
   * - Minimum: 2 (D1 is the smallest valid finish)
   * - Maximum: 170 (T20 + T20 + Bull is the highest possible checkout)
   *
   * PERFORMANCE:
   * Runs once on initialization, takes ~10-50ms depending on device.
   * After that, all lookups are instant O(1) from the Map.
   */
  private buildCheckoutRoutes(): void {
    // Build all possible checkout routes for scores 2-170
    for (let score = 2; score <= 170; score++) {
      this.checkoutRoutes.set(score, this.calculateRoutes(score));
    }
  }

  /**
   * CALCULATE ROUTES - Find All Ways to Checkout a Score
   *
   * CALLED BY: buildCheckoutRoutes() for each score 2-170
   *
   * ALGORITHM:
   * 1. Try single dart checkouts (score must be a double)
   * 2. Try two dart checkouts (any dart + double finish)
   * 3. Try three dart checkouts (any dart + any dart + double finish)
   * 4. Generate recommended routes sorted by difficulty
   *
   * RETURNS: CheckoutData with all possible routes
   *
   * EXAMPLE (score 40):
   * {
   *   score: 40,
   *   possible: true,
   *   routes: {
   *     singleDart: [[40]],                    // D20
   *     twoDart: [[20, 20], [10, 30], ...],    // 20 + D10, 10 + D15, etc.
   *     threeDart: [[10, 10, 20], ...]         // Many combinations
   *   },
   *   recommended: [
   *     { darts: [40], difficulty: 5, description: 'D20' },
   *     { darts: [20, 20], difficulty: 6, description: '20 → D10' },
   *     ...
   *   ]
   * }
   */
  private calculateRoutes(targetScore: number): CheckoutData {
    const routes: CheckoutData = {
      score: targetScore,
      possible: false,
      routes: {
        singleDart: [],
        twoDart: [],
        threeDart: []
      },
      recommended: []
    };

    /**
     * SINGLE DART FINISHES
     *
     * Score must be in doubleFinishes array (2, 4, 6, ..., 40, 50)
     *
     * EXAMPLES:
     * - Score 40 → [40] (D20)
     * - Score 32 → [32] (D16)
     * - Score 50 → [50] (Bull)
     */
    if (this.doubleFinishes.includes(targetScore)) {
      routes.routes.singleDart.push([targetScore]);
      routes.possible = true;
    }

    /**
     * TWO DART FINISHES
     *
     * Try all combinations of first dart + finishing double
     *
     * LOGIC:
     * For each possible first dart:
     *   remaining = targetScore - firstDart
     *   If remaining is a double → Valid route
     *
     * EXAMPLES (score 100):
     * - T20 (60) + D20 (40) = 100 ✓
     * - T16 (48) + D26 (52) = 100 ✗ (D26 doesn't exist)
     * - 20 + D40 = 100 ✗ (D40 is max double)
     */
    for (const first of this.singleScores) {
      if (first >= targetScore) continue; // Can't use all darts on first

      const remaining = targetScore - first;
      if (remaining > 0 && this.doubleFinishes.includes(remaining)) {
        if (first + remaining === targetScore) {
          routes.routes.twoDart.push([first, remaining]);
          routes.possible = true;
        }
      }
    }

    /**
     * THREE DART FINISHES
     *
     * Try all combinations of first + second + finishing double
     *
     * LOGIC:
     * For each possible first dart:
     *   For each possible second dart:
     *     remaining = targetScore - first - second
     *     If remaining is a double → Valid route
     *
     * EXAMPLES (score 161):
     * - T20 (60) + T19 (57) + D22 (44) = 161 ✓
     * - T20 (60) + T20 (60) + D20 (40) = 160 ✗ (doesn't sum to 161)
     * - T20 (60) + T20 (60) + D21 (42) = 162 ✗ (too high)
     *
     * PERFORMANCE NOTE:
     * This is a double loop (O(n²)) but only runs once on initialization.
     * n = 44 (singleScores length), so ~1,936 iterations per score.
     */
    for (const first of this.singleScores) {
      if (first >= targetScore) continue;

      const afterFirst = targetScore - first;

      for (const second of this.singleScores) {
        if (second >= afterFirst) continue;

        const remaining = afterFirst - second;
        if (remaining > 0 && this.doubleFinishes.includes(remaining)) {
          if (first + second + remaining === targetScore) {
            routes.routes.threeDart.push([first, second, remaining]);
            routes.possible = true;
          }
        }
      }
    }

    // Generate recommended routes sorted by difficulty
    routes.recommended = this.getRecommendedRoutes(routes);

    return routes;
  }

  /**
   * ============================================================================
   * ROUTE RECOMMENDATION - Sort and Filter Best Options
   * ============================================================================
   */

  /**
   * GET RECOMMENDED ROUTES - Best Routes Sorted by Difficulty
   *
   * CALLED BY: calculateRoutes() after finding all possible routes
   *
   * LOGIC:
   * 1. Collect all routes (1-dart, 2-dart, 3-dart)
   * 2. Calculate difficulty for each
   * 3. Limit quantities (10 two-dart, 5 three-dart to avoid overwhelming)
   * 4. Sort by fewest darts, then by difficulty
   * 5. Return top 5 recommendations
   *
   * SORTING PRIORITY:
   * - Prefer fewer darts (1-dart better than 2-dart)
   * - Within same dart count, prefer easier routes
   *
   * EXAMPLE (score 100):
   * 1. T20 + D20 (difficulty 12, 2 darts)
   * 2. 20 + D40 (difficulty 10, 2 darts)
   * 3. S16 + D42 (difficulty 8, 2 darts) - D42 doesn't exist, wouldn't be included
   */
  private getRecommendedRoutes(checkoutData: CheckoutData): CheckoutRoute[] {
    const allRoutes: CheckoutRoute[] = [];

    // Add all single dart routes (always best if available)
    checkoutData.routes.singleDart.forEach(route => {
      allRoutes.push({
        darts: route,
        difficulty: this.calculateDifficulty(route),
        description: this.formatRoute(route)
      });
    });

    // Add top 10 two dart routes
    checkoutData.routes.twoDart.slice(0, 10).forEach(route => {
      allRoutes.push({
        darts: route,
        difficulty: this.calculateDifficulty(route),
        description: this.formatRoute(route)
      });
    });

    // Add top 5 three dart routes
    checkoutData.routes.threeDart.slice(0, 5).forEach(route => {
      allRoutes.push({
        darts: route,
        difficulty: this.calculateDifficulty(route),
        description: this.formatRoute(route)
      });
    });

    // Sort by fewest darts first, then by difficulty
    return allRoutes.sort((a, b) => {
      if (a.darts.length !== b.darts.length) {
        return a.darts.length - b.darts.length; // Prefer fewer darts
      }
      return a.difficulty - b.difficulty; // Prefer easier routes
    }).slice(0, 5); // Return top 5 only
  }

  /**
   * CALCULATE DIFFICULTY - Assign Difficulty Score to Route
   *
   * CALLED BY: getRecommendedRoutes() for each route
   *
   * DIFFICULTY SCALE:
   * Higher number = harder route
   *
   * DIFFICULTY VALUES:
   * - Double bull (50): 8 (hardest)
   * - High trebles (T19, T20): 7
   * - Mid trebles (T14-T18): 6
   * - High doubles (D16-D20): 5
   * - Low trebles (T7-T13): 4
   * - Mid doubles (D10-D15): 3
   * - Single bull (25): 3
   * - Low doubles (D1-D9): 2
   * - Singles: 1 (easiest)
   *
   * EXAMPLE:
   * Route: T20 (60) + D20 (40)
   * Difficulty: 7 (high treble) + 5 (high double) = 12
   *
   * RATIONALE:
   * Smaller targets are harder to hit. T20 (the tiny treble ring on 20)
   * is much harder than hitting single 20 (the large segment).
   */
  private calculateDifficulty(route: number[]): number {
    let difficulty = 0;

    route.forEach(dart => {
      if (dart === 50) difficulty += 8;              // Double bull - hardest
      else if (dart === 25) difficulty += 3;         // Single bull
      else if (dart >= 57) difficulty += 7;          // High trebles (T19, T20)
      else if (dart >= 42 && dart % 3 === 0) difficulty += 6;  // Mid trebles
      else if (dart >= 21 && dart % 3 === 0) difficulty += 4;  // Low trebles
      else if (dart >= 32 && dart % 2 === 0) difficulty += 5;  // High doubles
      else if (dart >= 20 && dart % 2 === 0) difficulty += 3;  // Mid doubles
      else if (dart >= 2 && dart % 2 === 0) difficulty += 2;   // Low doubles
      else difficulty += 1;                           // Singles - easiest
    });

    return difficulty;
  }

  /**
   * ============================================================================
   * FORMATTING - Human-Readable Route Descriptions
   * ============================================================================
   */

  /**
   * FORMAT ROUTE - Convert Dart Array to String
   *
   * CALLED BY: getRecommendedRoutes() for route descriptions
   *
   * EXAMPLE:
   * [60, 40] → "T20 → D20"
   * [20, 20] → "20 → D10"
   * [50] → "Bull"
   */
  private formatRoute(route: number[]): string {
    return route.map(dart => this.formatDart(dart)).join(' → ');
  }

  /**
   * FORMAT DART - Convert Dart Score to String
   *
   * CALLED BY: formatRoute() for each dart
   *
   * NOTATION:
   * - Bull: Double bull (50)
   * - S25: Single bull
   * - D16: Double 16 (32 points)
   * - T20: Treble 20 (60 points)
   * - S20 or 20: Single 20
   * - Miss: 0 points
   *
   * LOGIC:
   * 1. Check special scores (50, 25, 0)
   * 2. Check if double (2-40, even)
   * 3. Check if treble (21-60, divisible by 3)
   * 4. Otherwise it's a single
   *
   * EXAMPLES:
   * formatDart(50) → "Bull"
   * formatDart(40) → "D20"
   * formatDart(60) → "T20"
   * formatDart(20) → "S20"
   */
  private formatDart(dart: number): string {
    if (dart === 50) return 'Bull';
    if (dart === 25) return 'S25';
    if (dart === 0) return 'Miss';

    // Check for doubles (even numbers 2-40)
    if (dart <= 40 && dart % 2 === 0 && dart > 0) {
      const segment = dart / 2;
      return `D${segment}`;
    }

    // Check for trebles (multiples of 3, 21-60)
    if (dart <= 60 && dart % 3 === 0 && dart > 20) {
      const segment = dart / 3;
      return `T${segment}`;
    }

    // Must be a single
    return `S${dart}`;
  }

  /**
   * ============================================================================
   * PUBLIC API - Methods for External Use
   * ============================================================================
   */

  /**
   * CAN CHECKOUT - Check if Checkout is Possible
   *
   * CALLED BY: UI to determine if player can finish
   *
   * PARAMETERS:
   * - currentScore: Points remaining (2-170)
   * - dartsRemaining: Darts left in turn (1-3)
   *
   * RETURNS: true if checkout is possible with given darts
   *
   * EXAMPLES:
   * canCheckout(40, 1) → true (D20)
   * canCheckout(100, 1) → false (no 1-dart checkout for 100)
   * canCheckout(100, 2) → true (T20 + D20)
   * canCheckout(169, 3) → false (impossible score)
   */
  canCheckout(currentScore: number, dartsRemaining: number): boolean {
    if (currentScore < 2 || currentScore > 170 || dartsRemaining < 1 || dartsRemaining > 3) {
      return false;
    }

    const routes = this.checkoutRoutes.get(currentScore);
    if (!routes || !routes.possible) return false;

    switch (dartsRemaining) {
      case 1:
        return routes.routes.singleDart.length > 0;
      case 2:
        return routes.routes.singleDart.length > 0 || routes.routes.twoDart.length > 0;
      case 3:
        return routes.possible; // Any route works with 3 darts
      default:
        return false;
    }
  }

  /**
   * GET POSSIBLE FINISHES - Get All Routes for Given Darts
   *
   * CALLED BY: Advanced UI features showing all options
   *
   * RETURNS: Array of dart arrays representing checkout routes
   *
   * EXAMPLE:
   * getPossibleFinishes(40, 2) → [
   *   [40],         // D20 in 1 dart
   *   [20, 20],     // 20, D10
   *   [10, 30],     // 10, D15
   *   ...
   * ]
   */
  getPossibleFinishes(currentScore: number, dartsRemaining: number): number[][] {
    if (!this.canCheckout(currentScore, dartsRemaining)) {
      return [];
    }

    const routes = this.checkoutRoutes.get(currentScore);
    if (!routes) return [];

    const possibleRoutes: number[][] = [];

    switch (dartsRemaining) {
      case 1:
        possibleRoutes.push(...routes.routes.singleDart);
        break;
      case 2:
        possibleRoutes.push(...routes.routes.singleDart, ...routes.routes.twoDart);
        break;
      case 3:
        possibleRoutes.push(
          ...routes.routes.singleDart,
          ...routes.routes.twoDart,
          ...routes.routes.threeDart
        );
        break;
    }

    return possibleRoutes;
  }

  /**
   * GET RECOMMENDED FINISHES - Get Best Routes for Given Darts
   *
   * CALLED BY: UI to show checkout suggestions
   *
   * RETURNS: Array of CheckoutRoute objects (sorted by difficulty)
   *
   * EXAMPLE:
   * getRecommendedFinishes(100, 2) → [
   *   {
   *     darts: [60, 40],
   *     difficulty: 12,
   *     description: 'T20 → D20'
   *   },
   *   {
   *     darts: [20, 80],  // Actually wouldn't exist (D40 is max)
   *     difficulty: 10,
   *     description: '20 → D40'
   *   },
   *   ...
   * ]
   */
  getRecommendedFinishes(currentScore: number, dartsRemaining: number): CheckoutRoute[] {
    const routes = this.checkoutRoutes.get(currentScore);
    if (!routes || !this.canCheckout(currentScore, dartsRemaining)) {
      return [];
    }

    // Filter to routes that fit within available darts
    return routes.recommended.filter(route => route.darts.length <= dartsRemaining);
  }

  /**
   * GET CHECKOUT ROUTES - Get All Routes for Score
   *
   * CONVENIENCE METHOD for direct access to checkout data
   */
  getCheckoutRoutes(score: number): CheckoutRoute[] {
    const routes = this.checkoutRoutes.get(score);
    return routes?.recommended || [];
  }

  /**
   * IS CHECKOUT ATTEMPT - Was Dart Thrown at Checkout?
   *
   * CALLED BY: Scoring logic to track checkout attempts for statistics
   *
   * RETURNS: true if player was in checkout range when dart was thrown
   *
   * NOTE: Doesn't check if dart succeeded, just if opportunity existed
   */
  isCheckoutAttempt(currentScore: number, dartScore: number, dartsRemaining: number): boolean {
    // First check if current score is a valid checkout position
    const totalDartsRemaining = dartsRemaining + 1; // Including this dart
    if (!this.canCheckout(currentScore, totalDartsRemaining)) {
      return false;
    }

    // The dart counts as a checkout attempt if we're in a valid checkout position
    return true;
  }

  /**
   * IS VALID DART SCORE - Check if Score Can Be Hit
   *
   * CALLED BY: Input validation
   *
   * RETURNS: true if score is in singleScores array
   */
  isValidDartScore(score: number): boolean {
    return this.singleScores.includes(score);
  }

  /**
   * IS DOUBLE SCORE - Check if Score is a Double
   *
   * CALLED BY: Finish validation, double-start tracking
   *
   * RETURNS: true if score is in doubleFinishes array
   */
  isDoubleScore(score: number): boolean {
    return this.doubleFinishes.includes(score);
  }

  /**
   * IS CHECKOUT OPPORTUNITY - Can Score Be Checked Out?
   *
   * CALLED BY: UI to show/hide checkout suggestions
   *
   * RETURNS: true if score has at least one possible checkout route
   *
   * EXAMPLE:
   * isCheckoutOpportunity(40) → true
   * isCheckoutOpportunity(169) → false (impossible)
   * isCheckoutOpportunity(1) → false (too low)
   * isCheckoutOpportunity(171) → false (too high)
   */
  isCheckoutOpportunity(score: number): boolean {
    return score >= 2 && score <= 170 && this.checkoutRoutes.get(score)?.possible === true;
  }

  /**
   * GET IMPOSSIBLE CHECKOUTS - List All Impossible Scores
   *
   * UTILITY METHOD for debugging or educational purposes
   *
   * RETURNS: Array of scores that cannot be checked out
   *
   * RESULT: [169, 168, 166, 165, 163, 162, 159]
   */
  getImpossibleCheckouts(): number[] {
    const impossible: number[] = [];
    for (let score = 2; score <= 170; score++) {
      const routes = this.checkoutRoutes.get(score);
      if (!routes || !routes.possible) {
        impossible.push(score);
      }
    }
    return impossible;
  }
}

/**
 * SINGLETON EXPORT - Ready-to-Use Instance
 *
 * USAGE:
 * import { checkoutService } from './checkoutService';
 * const routes = checkoutService.getRecommendedFinishes(100, 2);
 */
export const checkoutService = CheckoutService.getInstance();

/**
 * ============================================================================
 * END OF CHECKOUT SERVICE
 * ============================================================================
 *
 * SUMMARY - What This Service Provides:
 *
 * 1. **Checkout Route Calculation**
 *    - Pre-calculates all routes for scores 2-170
 *    - Handles 1-dart, 2-dart, and 3-dart finishes
 *    - Identifies impossible checkouts (169, 168, 166, 165, 163, 162, 159)
 *
 * 2. **Route Recommendation**
 *    - Sorts routes by fewest darts, then difficulty
 *    - Returns top 5 recommendations
 *    - Difficulty based on dart type (treble > double > single)
 *
 * 3. **Checkout Validation**
 *    - canCheckout(): Check if finish possible
 *    - isCheckoutOpportunity(): Check if in checkout range
 *    - isCheckoutAttempt(): Track attempts for statistics
 *
 * 4. **Route Formatting**
 *    - Human-readable descriptions (T20 → D20)
 *    - Proper dart notation (D16, T20, Bull, S25)
 *
 * 5. **Performance**
 *    - Singleton pattern (initialize once)
 *    - O(1) lookups from pre-built Map
 *    - ~10-50ms initialization time
 *    - Instant queries during gameplay
 *
 * KEY ALGORITHMS:
 * - Single dart: Check if score is in doubleFinishes
 * - Two dart: Try all (firstDart + finishingDouble) combinations
 * - Three dart: Try all (first + second + finishingDouble) combinations
 * - Difficulty: Weighted sum based on dart types
 *
 * INTEGRATION POINTS:
 * - Used by MobileDartEntry for checkout suggestions
 * - Used by scoring logic for checkout attempt tracking
 * - Used by statistics for checkout percentage
 *
 * NEXT FILES TO ANNOTATE:
 * - statisticsService.ts: Advanced statistics calculations
 * - games.ts: Database service for saving results
 */
