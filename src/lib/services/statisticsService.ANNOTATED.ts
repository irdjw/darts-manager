/**
 * ============================================================================
 * STATISTICS SERVICE - Comprehensive Darts Statistics Calculations
 * ============================================================================
 *
 * PURPOSE:
 * Calculates detailed performance statistics for darts players at various levels:
 * - Per-game stats (one complete game)
 * - Per-leg stats (real-time during single leg)
 * - Per-match stats (multiple legs in best-of-X)
 * - Seasonal stats (aggregated across all games)
 * - Form guide (recent performance trends)
 *
 * WHAT IT CALCULATES:
 * 1. Basic Stats: Total darts, total points, average
 * 2. High Scores: 80+, 100+, 140+, 180s (perfect turns)
 * 3. Double Performance: Attempts, hits, percentage
 * 4. Checkout Performance: Attempts, hits, percentage, highest
 * 5. Match Performance: Legs won/lost, best/worst legs
 * 6. Trends: Form guide, insights, patterns
 *
 * USED BY:
 * - MobileDartEntry (real-time stats during game)
 * - Game completion modal (final stats display)
 * - Player profile pages (seasonal stats)
 * - Leaderboards (overall performance)
 * - Statistics dashboard (insights and trends)
 *
 * SINGLETON PATTERN:
 * Only one instance exists for consistent calculations across app.
 */

import type { DartThrow, TurnData, LegData, PlayerGameStats } from '../types/scoring';

export class StatisticsService {
  private static instance: StatisticsService;

  private constructor() {}

  static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  /**
   * ============================================================================
   * GAME STATISTICS - Complete Game Performance
   * ============================================================================
   */

  /**
   * CALCULATE GAME STATS - Comprehensive End-of-Game Statistics
   *
   * CALLED BY: Game completion logic when match finishes
   *
   * PARAMETERS:
   * - playerId: UUID of player
   * - playerName: Player name for display
   * - darts: All darts thrown in game
   * - legs: All completed legs
   * - gameWon: Did player win?
   *
   * RETURNS: PlayerGameStats with 20+ fields
   *
   * EXAMPLE INPUT:
   * darts: [DartThrow, DartThrow, ...] // 87 darts total
   * legs: [{ legNumber: 1, won: true, totalDarts: 18 }, ...]
   * gameWon: true
   *
   * EXAMPLE OUTPUT:
   * {
   *   playerId: 'abc-123',
   *   playerName: 'John',
   *   gameWon: true,
   *   legsPlayed: 5,
   *   legsWon: 3,
   *   totalDarts: 87,
   *   totalPoints: 4185,
   *   average: 48.10,           // 4185 / 87
   *   scores80Plus: 15,
   *   scores100Plus: 8,
   *   scores140Plus: 3,
   *   scores180: 1,
   *   doubleAttempts: 12,
   *   doubleHits: 5,
   *   doublePercentage: 41.67,
   *   checkoutAttempts: 5,
   *   checkoutHits: 3,
   *   checkoutPercentage: 60.00,
   *   highestCheckout: 121,
   *   highestScore: 180,
   *   finishPositions: [32, 40, 16]
   * }
   */
  calculateGameStats(
    playerId: string,
    playerName: string,
    darts: DartThrow[],
    legs: LegData[],
    gameWon: boolean
  ): PlayerGameStats {
    // Initialize stats object with all fields
    const stats: PlayerGameStats = {
      playerId,
      playerName,
      gameWon,
      legsPlayed: legs.length,
      legsWon: legs.filter(leg => leg.won).length,
      totalDarts: darts.length,
      totalPoints: darts.reduce((sum, dart) => sum + dart.dartScore, 0),
      average: 0,
      scores80Plus: 0,
      scores100Plus: 0,
      scores140Plus: 0,
      scores180: 0,
      // Double stats (any dart thrown at double segment)
      doubleAttempts: darts.filter(d => d.isDoubleAttempt).length,
      doubleHits: darts.filter(d => d.isDoubleAttempt && d.dartScore > 0).length,
      doublePercentage: 0,
      // Checkout stats (darts thrown when checkout possible)
      checkoutAttempts: darts.filter(d => d.isCheckoutAttempt).length,
      checkoutHits: darts.filter(d => d.checkoutSuccessful).length,
      checkoutPercentage: 0,
      highestCheckout: 0,
      highestScore: 0,
      finishPositions: []
    };

    // Calculate average per dart
    stats.average = stats.totalDarts > 0 ? stats.totalPoints / stats.totalDarts : 0;

    // Calculate turn-based statistics (80+, 100+, etc.)
    const turnStats = this.calculateTurnStatistics(darts);
    stats.scores80Plus = turnStats.scores80Plus;
    stats.scores100Plus = turnStats.scores100Plus;
    stats.scores140Plus = turnStats.scores140Plus;
    stats.scores180 = turnStats.scores180;
    stats.highestScore = turnStats.highestScore;

    // Calculate double percentage
    stats.doublePercentage = stats.doubleAttempts > 0
      ? (stats.doubleHits / stats.doubleAttempts) * 100
      : 0;

    // Calculate checkout percentage
    stats.checkoutPercentage = stats.checkoutAttempts > 0
      ? (stats.checkoutHits / stats.checkoutAttempts) * 100
      : 0;

    // Find highest checkout and all finish positions
    const checkoutDarts = darts.filter(d => d.checkoutSuccessful);
    if (checkoutDarts.length > 0) {
      stats.highestCheckout = Math.max(...checkoutDarts.map(d => this.calculateCheckoutValue(d, darts)));
      stats.finishPositions = checkoutDarts.map(d => this.calculateCheckoutValue(d, darts));
    }

    // Round decimal values to 2 places
    stats.average = Math.round(stats.average * 100) / 100;
    stats.doublePercentage = Math.round(stats.doublePercentage * 100) / 100;
    stats.checkoutPercentage = Math.round(stats.checkoutPercentage * 100) / 100;

    return stats;
  }

  /**
   * ============================================================================
   * TURN STATISTICS - High Score Calculations
   * ============================================================================
   */

  /**
   * CALCULATE TURN STATISTICS - Count High-Scoring Turns
   *
   * CALLED BY: calculateGameStats() and calculateCurrentLegStats()
   *
   * LOGIC:
   * 1. Group all darts by turn (leg + turn number)
   * 2. Sum each turn's 3 darts
   * 3. Count how many turns hit each milestone
   *
   * TURN GROUPING:
   * Key: "legNumber-turnNumber"
   * Example: "1-5" = Leg 1, Turn 5
   *
   * MILESTONE COUNTS:
   * - 80+: Good turns (e.g., T20 + T20 + S20 = 100)
   * - 100+: "Tons" (triple-digit turn)
   * - 140+: High tons
   * - 180: Perfect turn (T20 + T20 + T20)
   *
   * EXAMPLE:
   * Darts: [60, 60, 60, 20, 20, 20, ...]
   * Turn 1: 60+60+60 = 180 → counts for 180, 140+, 100+, 80+
   * Turn 2: 20+20+20 = 60 → no counts
   */
  private calculateTurnStatistics(darts: DartThrow[]): {
    scores80Plus: number;
    scores100Plus: number;
    scores140Plus: number;
    scores180: number;
    highestScore: number;
  } {
    // Group darts by turn using "legNumber-turnNumber" key
    const turnTotals = new Map<string, number>();

    darts.forEach(dart => {
      const turnKey = `${dart.legNumber}-${dart.turnNumber}`;
      turnTotals.set(turnKey, (turnTotals.get(turnKey) || 0) + dart.dartScore);
    });

    // Get array of turn totals
    const scores = Array.from(turnTotals.values());

    // Count milestones
    return {
      scores80Plus: scores.filter(score => score >= 80).length,
      scores100Plus: scores.filter(score => score >= 100).length,
      scores140Plus: scores.filter(score => score >= 140).length,
      scores180: scores.filter(score => score === 180).length,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0
    };
  }

  /**
   * CALCULATE CHECKOUT VALUE - Determine Checkout Score
   *
   * CALLED BY: calculateGameStats() for each successful checkout
   *
   * PURPOSE:
   * When a player finishes, determine what score they checked out.
   * Example: Player on 121, throws T19 (57) + D32 (64) = 121 checkout
   *
   * LOGIC:
   * 1. Find all darts in the checkout turn
   * 2. Sum them up
   * 3. That's the checkout value
   *
   * WHY THIS MATTERS:
   * Checking out 170 (max) is more impressive than checking out 32.
   * This tracks the player's highest checkout achievement.
   *
   * EXAMPLE:
   * checkoutDart = { legNumber: 2, turnNumber: 15, dartNumber: 2, ... }
   * All darts in leg 2, turn 15, dartNumbers 1-2
   * Dart 1: 60 (T20)
   * Dart 2: 40 (D20) ← checkout dart
   * Return: 100 (checkout value)
   */
  private calculateCheckoutValue(checkoutDart: DartThrow, allDarts: DartThrow[]): number {
    // Find all darts in the same turn as the checkout
    const turnDarts = allDarts.filter(d =>
      d.legNumber === checkoutDart.legNumber &&
      d.turnNumber === checkoutDart.turnNumber &&
      d.dartNumber <= checkoutDart.dartNumber
    );

    // Sum all darts in the finishing turn
    return turnDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
  }

  /**
   * ============================================================================
   * REAL-TIME STATISTICS - Live Game Stats
   * ============================================================================
   */

  /**
   * CALCULATE CURRENT LEG STATS - Live Stats During Game
   *
   * CALLED BY: MobileDartEntry after each dart to update live display
   *
   * PURPOSE:
   * Shows player their real-time performance during current leg.
   * Updates after every dart thrown.
   *
   * FILTERS:
   * Only includes darts from current leg (ignores previous legs)
   *
   * EXAMPLE:
   * Currently in leg 3, player has thrown 12 darts
   * Returns stats for just those 12 darts, not entire game
   */
  calculateCurrentLegStats(darts: DartThrow[], currentLeg: number): Partial<PlayerGameStats> {
    const currentLegDarts = darts.filter(dart => dart.legNumber === currentLeg);

    if (currentLegDarts.length === 0) {
      return {
        totalDarts: 0,
        totalPoints: 0,
        average: 0,
        scores80Plus: 0,
        scores100Plus: 0,
        scores140Plus: 0,
        scores180: 0,
        highestScore: 0
      };
    }

    const totalDarts = currentLegDarts.length;
    const totalPoints = currentLegDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
    const turnStats = this.calculateTurnStatistics(currentLegDarts);

    return {
      totalDarts,
      totalPoints,
      average: Math.round((totalPoints / totalDarts) * 100) / 100,
      scores80Plus: turnStats.scores80Plus,
      scores100Plus: turnStats.scores100Plus,
      scores140Plus: turnStats.scores140Plus,
      scores180: turnStats.scores180,
      highestScore: turnStats.highestScore
    };
  }

  /**
   * ============================================================================
   * MATCH STATISTICS - Multi-Leg Match Analysis
   * ============================================================================
   */

  /**
   * CALCULATE MATCH STATS - Performance Across Multiple Legs
   *
   * CALLED BY: End of best-of-X matches
   *
   * CALCULATES:
   * - Total legs played and won
   * - Total darts and points across all legs
   * - Average darts per leg
   * - Best leg (fewest darts)
   * - Worst leg (most darts)
   *
   * USE CASE:
   * In a best-of-5 that went 3-2, analyze performance across all 5 legs
   */
  calculateMatchStats(allLegs: LegData[]): {
    totalLegs: number;
    legsWon: number;
    totalDarts: number;
    totalPoints: number;
    averageLegsWon: number;
    averageDartsPerLeg: number;
    bestLeg: { legNumber: number; darts: number } | null;
    worstLeg: { legNumber: number; darts: number } | null;
  } {
    const totalLegs = allLegs.length;
    const legsWon = allLegs.filter(leg => leg.won).length;
    const totalDarts = allLegs.reduce((sum, leg) => sum + leg.totalDarts, 0);
    const totalPoints = allLegs.reduce((sum, leg) => sum + (501 - leg.finalScore), 0);

    let bestLeg: { legNumber: number; darts: number } | null = null;
    let worstLeg: { legNumber: number; darts: number } | null = null;

    if (allLegs.length > 0) {
      const wonLegs = allLegs.filter(leg => leg.won);
      if (wonLegs.length > 0) {
        // Best leg = fewest darts to finish
        bestLeg = wonLegs.reduce((best, leg) =>
          leg.darts < best.darts ?
          { legNumber: leg.legNumber, darts: leg.darts } : best,
          { legNumber: wonLegs[0].legNumber, darts: wonLegs[0].darts }
        );

        // Worst leg = most darts to finish
        worstLeg = wonLegs.reduce((worst, leg) =>
          leg.darts > worst.darts ?
          { legNumber: leg.legNumber, darts: leg.darts } : worst,
          { legNumber: wonLegs[0].legNumber, darts: wonLegs[0].darts }
        );
      }
    }

    return {
      totalLegs,
      legsWon,
      totalDarts,
      totalPoints,
      averageLegsWon: totalLegs > 0 ? (legsWon / totalLegs) * 100 : 0,
      averageDartsPerLeg: totalLegs > 0 ? totalDarts / totalLegs : 0,
      bestLeg,
      worstLeg
    };
  }

  /**
   * ============================================================================
   * SEASONAL STATISTICS - Aggregated Performance
   * ============================================================================
   */

  /**
   * CALCULATE SEASON STATS - Overall Performance Summary
   *
   * CALLED BY: Player profile pages, leaderboards
   *
   * AGGREGATES:
   * All games across entire season (or time period)
   *
   * CALCULATES:
   * - Win percentage
   * - Overall average
   * - Total 180s
   * - Best/worst game averages
   * - Overall checkout percentage
   * - Favourite finish (most common checkout)
   *
   * EXAMPLE:
   * Player has played 20 games this season
   * Input: Array of 20 PlayerGameStats objects
   * Output: Aggregated seasonal statistics
   */
  calculateSeasonStats(allGameStats: PlayerGameStats[]): {
    gamesPlayed: number;
    gamesWon: number;
    winPercentage: number;
    totalDarts: number;
    overallAverage: number;
    total180s: number;
    totalMaximums: number;
    bestAverage: number;
    worstAverage: number;
    checkoutPercentage: number;
    doublePercentage: number;
    highestCheckout: number;
    favouriteFinish: number | null;
  } {
    const gamesPlayed = allGameStats.length;
    const gamesWon = allGameStats.filter(game => game.gameWon).length;
    const totalDarts = allGameStats.reduce((sum, game) => sum + game.totalDarts, 0);
    const totalPoints = allGameStats.reduce((sum, game) => sum + game.totalPoints, 0);

    const total180s = allGameStats.reduce((sum, game) => sum + game.scores180, 0);
    const totalMaximums = total180s; // In 501, 180 is maximum

    // Find best and worst game averages
    const averages = allGameStats
      .filter(game => game.average > 0)
      .map(game => game.average);

    const bestAverage = averages.length > 0 ? Math.max(...averages) : 0;
    const worstAverage = averages.length > 0 ? Math.min(...averages) : 0;

    // Aggregate checkout/double stats
    const totalCheckoutAttempts = allGameStats.reduce((sum, game) => sum + game.checkoutAttempts, 0);
    const totalCheckoutHits = allGameStats.reduce((sum, game) => sum + game.checkoutHits, 0);
    const totalDoubleAttempts = allGameStats.reduce((sum, game) => sum + game.doubleAttempts, 0);
    const totalDoubleHits = allGameStats.reduce((sum, game) => sum + game.doubleHits, 0);

    // Find favourite finish (most common checkout value)
    const allFinishes = allGameStats.flatMap(game => game.finishPositions);
    const finishCounts = new Map<number, number>();
    allFinishes.forEach(finish => {
      finishCounts.set(finish, (finishCounts.get(finish) || 0) + 1);
    });

    let favouriteFinish: number | null = null;
    if (finishCounts.size > 0) {
      // Find most frequent finish
      favouriteFinish = Array.from(finishCounts.entries()).reduce((a, b) =>
        b[1] > a[1] ? b : a
      )[0];
    }

    return {
      gamesPlayed,
      gamesWon,
      winPercentage: gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0,
      totalDarts,
      overallAverage: totalDarts > 0 ? totalPoints / totalDarts : 0,
      total180s,
      totalMaximums,
      bestAverage,
      worstAverage,
      checkoutPercentage: totalCheckoutAttempts > 0 ? (totalCheckoutHits / totalCheckoutAttempts) * 100 : 0,
      doublePercentage: totalDoubleAttempts > 0 ? (totalDoubleHits / totalDoubleAttempts) * 100 : 0,
      highestCheckout: Math.max(...allGameStats.map(g => g.highestCheckout), 0),
      favouriteFinish
    };
  }

  /**
   * ============================================================================
   * FORM GUIDE - Recent Performance Trends
   * ============================================================================
   */

  /**
   * CALCULATE FORM GUIDE - Recent Performance Analysis
   *
   * CALLED BY: Player profiles, match predictions
   *
   * ANALYZES:
   * Last N games (default 5) to determine current form
   *
   * RETURNS:
   * - Current form (wins in last N games)
   * - Average trend (improving/declining)
   * - Consistency (standard deviation)
   *
   * USE CASE:
   * "Player is 4-1 in last 5 games with improving average"
   */
  calculateFormGuide(recentGameStats: PlayerGameStats[], gamesCount: number = 5): {
    recentForm: string;
    wins: number;
    losses: number;
    averageTrend: 'improving' | 'declining' | 'stable';
    recentAverage: number;
  } {
    const recentGames = recentGameStats.slice(-gamesCount);
    const wins = recentGames.filter(g => g.gameWon).length;
    const losses = recentGames.length - wins;

    // Calculate recent average
    const recentAverage = this.calculateAverageForGames(recentGames);

    // Determine trend by comparing first half vs second half
    let averageTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentGames.length >= 4) {
      const midpoint = Math.floor(recentGames.length / 2);
      const firstHalf = this.calculateAverageForGames(recentGames.slice(0, midpoint));
      const secondHalf = this.calculateAverageForGames(recentGames.slice(midpoint));

      if (secondHalf > firstHalf + 2) averageTrend = 'improving';
      else if (firstHalf > secondHalf + 2) averageTrend = 'declining';
    }

    return {
      recentForm: `${wins}-${losses}`,
      wins,
      losses,
      averageTrend,
      recentAverage
    };
  }

  /**
   * Helper to calculate average across multiple games
   */
  private calculateAverageForGames(games: PlayerGameStats[]): number {
    if (games.length === 0) return 0;
    const totalDarts = games.reduce((sum, g) => sum + g.totalDarts, 0);
    const totalPoints = games.reduce((sum, g) => sum + g.totalPoints, 0);
    return totalDarts > 0 ? totalPoints / totalDarts : 0;
  }

  /**
   * ============================================================================
   * UTILITY METHODS - Formatting and Insights
   * ============================================================================
   */

  /**
   * FORMAT STAT FOR DISPLAY - Pretty Print Statistics
   *
   * Formats numbers appropriately:
   * - Averages: 2 decimal places (48.53)
   * - Percentages: 1 decimal place with % (42.5%)
   * - Counts: Whole numbers (15)
   */
  formatStatForDisplay(stat: number, type: 'average' | 'percentage' | 'count'): string {
    switch (type) {
      case 'average':
        return stat.toFixed(2);
      case 'percentage':
        return `${stat.toFixed(1)}%`;
      case 'count':
        return Math.round(stat).toString();
      default:
        return stat.toString();
    }
  }

  /**
   * GENERATE INSIGHTS - AI-Like Performance Insights
   *
   * Analyzes stats and generates human-readable insights.
   *
   * EXAMPLES:
   * - "Excellent checkout percentage of 65.2%!"
   * - "Average improving - up from 45 to 48"
   * - "Hit 3 maximums (180s) this game"
   * - "Checkout percentage needs work - only 28%"
   */
  generateInsights(stats: PlayerGameStats): string[] {
    const insights: string[] = [];

    // Checkout performance
    if (stats.checkoutPercentage > 50) {
      insights.push(`Excellent checkout percentage of ${stats.checkoutPercentage.toFixed(1)}%!`);
    } else if (stats.checkoutPercentage < 30 && stats.checkoutAttempts > 3) {
      insights.push(`Checkout percentage needs work - ${stats.checkoutPercentage.toFixed(1)}%`);
    }

    // 180s
    if (stats.scores180 > 0) {
      insights.push(`Hit ${stats.scores180} maximum${stats.scores180 > 1 ? 's' : ''} (180)!`);
    }

    // High average
    if (stats.average > 60) {
      insights.push('Outstanding average - professional level!');
    } else if (stats.average > 50) {
      insights.push('Great average - keep it up!');
    }

    // Consistency
    if (stats.scores100Plus > stats.totalDarts / 6) {
      insights.push('Very consistent - lots of 100+ scores');
    }

    return insights;
  }
}

/**
 * SINGLETON EXPORT
 */
export const statisticsService = StatisticsService.getInstance();

/**
 * ============================================================================
 * END OF STATISTICS SERVICE
 * ============================================================================
 *
 * SUMMARY:
 *
 * 1. **Game Statistics**
 *    - Complete game analysis with 20+ metrics
 *    - Double and checkout percentages
 *    - High score counts and milestones
 *
 * 2. **Real-Time Stats**
 *    - Live leg statistics during game
 *    - Updates after each dart
 *    - Provides immediate feedback
 *
 * 3. **Match Analysis**
 *    - Multi-leg performance
 *    - Best/worst legs identified
 *    - Average darts per leg
 *
 * 4. **Seasonal Aggregation**
 *    - Overall performance across time
 *    - Win percentage and trends
 *    - Favourite finishes identified
 *
 * 5. **Form Guide**
 *    - Recent performance trends
 *    - Improving/declining analysis
 *    - Current form tracking
 *
 * 6. **Insights Generation**
 *    - AI-like performance analysis
 *    - Highlight achievements
 *    - Identify areas for improvement
 *
 * KEY ALGORITHMS:
 * - Turn grouping for high score counts
 * - Checkout value calculation from turn darts
 * - Percentage calculations for success rates
 * - Trend analysis for form guide
 * - Most frequent finish detection
 *
 * INTEGRATION:
 * - Used by MobileDartEntry for live stats
 * - Used by game completion for final summary
 * - Used by player profiles for overall stats
 * - Used by leaderboards for rankings
 */
