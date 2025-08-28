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

  // Calculate comprehensive game statistics
  calculateGameStats(
    playerId: string,
    playerName: string,
    darts: DartThrow[],
    legs: LegData[],
    gameWon: boolean
  ): PlayerGameStats {
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
      doubleAttempts: darts.filter(d => d.isDoubleAttempt).length,
      doubleHits: darts.filter(d => d.isDoubleAttempt && d.dartScore > 0).length,
      doublePercentage: 0,
      checkoutAttempts: darts.filter(d => d.isCheckoutAttempt).length,
      checkoutHits: darts.filter(d => d.checkoutSuccessful).length,
      checkoutPercentage: 0,
      highestCheckout: 0,
      highestScore: 0,
      finishPositions: []
    };

    // Calculate averages
    stats.average = stats.totalDarts > 0 ? stats.totalPoints / stats.totalDarts : 0;

    // Calculate turn-based statistics
    const turnStats = this.calculateTurnStatistics(darts);
    stats.scores80Plus = turnStats.scores80Plus;
    stats.scores100Plus = turnStats.scores100Plus;
    stats.scores140Plus = turnStats.scores140Plus;
    stats.scores180 = turnStats.scores180;
    stats.highestScore = turnStats.highestScore;

    // Calculate percentages
    stats.doublePercentage = stats.doubleAttempts > 0 
      ? (stats.doubleHits / stats.doubleAttempts) * 100 
      : 0;
    
    stats.checkoutPercentage = stats.checkoutAttempts > 0 
      ? (stats.checkoutHits / stats.checkoutAttempts) * 100 
      : 0;

    // Find highest checkout and finishing positions
    const checkoutDarts = darts.filter(d => d.checkoutSuccessful);
    if (checkoutDarts.length > 0) {
      stats.highestCheckout = Math.max(...checkoutDarts.map(d => this.calculateCheckoutValue(d, darts)));
      stats.finishPositions = checkoutDarts.map(d => this.calculateCheckoutValue(d, darts));
    }

    // Round decimal values
    stats.average = Math.round(stats.average * 100) / 100;
    stats.doublePercentage = Math.round(stats.doublePercentage * 100) / 100;
    stats.checkoutPercentage = Math.round(stats.checkoutPercentage * 100) / 100;

    return stats;
  }

  // Calculate turn-based statistics (80+, 100+, 140+, 180s)
  private calculateTurnStatistics(darts: DartThrow[]): {
    scores80Plus: number;
    scores100Plus: number;
    scores140Plus: number;
    scores180: number;
    highestScore: number;
  } {
    // Group darts by turn
    const turnTotals = new Map<string, number>();
    
    darts.forEach(dart => {
      const turnKey = `${dart.legNumber}-${dart.turnNumber}`;
      turnTotals.set(turnKey, (turnTotals.get(turnKey) || 0) + dart.dartScore);
    });

    const scores = Array.from(turnTotals.values());
    
    return {
      scores80Plus: scores.filter(score => score >= 80).length,
      scores100Plus: scores.filter(score => score >= 100).length,
      scores140Plus: scores.filter(score => score >= 140).length,
      scores180: scores.filter(score => score === 180).length,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0
    };
  }

  // Calculate the value of a checkout (what score they finished from)
  private calculateCheckoutValue(checkoutDart: DartThrow, allDarts: DartThrow[]): number {
    // Find all darts in the same turn as the checkout
    const turnDarts = allDarts.filter(d => 
      d.legNumber === checkoutDart.legNumber && 
      d.turnNumber === checkoutDart.turnNumber &&
      d.dartNumber <= checkoutDart.dartNumber
    );

    // The checkout value is the sum of all darts in the finishing turn
    return turnDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
  }

  // Calculate statistics for current leg (real-time during game)
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

  // Calculate match statistics (multiple legs)
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
        bestLeg = wonLegs.reduce((best, leg) => 
          leg.totalDarts < best.totalDarts ? 
          { legNumber: leg.legNumber, darts: leg.totalDarts } : best,
          { legNumber: wonLegs[0].legNumber, darts: wonLegs[0].totalDarts }
        );

        worstLeg = wonLegs.reduce((worst, leg) => 
          leg.totalDarts > worst.totalDarts ? 
          { legNumber: leg.legNumber, darts: leg.totalDarts } : worst,
          { legNumber: wonLegs[0].legNumber, darts: wonLegs[0].totalDarts }
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

  // Calculate seasonal statistics
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

    const averages = allGameStats
      .filter(game => game.average > 0)
      .map(game => game.average);
    
    const bestAverage = averages.length > 0 ? Math.max(...averages) : 0;
    const worstAverage = averages.length > 0 ? Math.min(...averages) : 0;

    // Checkout statistics
    const totalCheckoutAttempts = allGameStats.reduce((sum, game) => sum + game.checkoutAttempts, 0);
    const totalCheckoutHits = allGameStats.reduce((sum, game) => sum + game.checkoutHits, 0);
    const totalDoubleAttempts = allGameStats.reduce((sum, game) => sum + game.doubleAttempts, 0);
    const totalDoubleHits = allGameStats.reduce((sum, game) => sum + game.doubleHits, 0);

    // Find favourite finish (most common checkout position)
    const allFinishes = allGameStats.flatMap(game => game.finishPositions);
    const finishCounts = new Map<number, number>();
    allFinishes.forEach(finish => {
      finishCounts.set(finish, (finishCounts.get(finish) || 0) + 1);
    });

    let favouriteFinish: number | null = null;
    if (finishCounts.size > 0) {
      favouriteFinish = Array.from(finishCounts.entries()).reduce((a, b) => 
        b[1] > a[1] ? b : a
      )[0];
    }

    return {
      gamesPlayed,
      gamesWon,
      winPercentage: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100 * 100) / 100 : 0,
      totalDarts,
      overallAverage: totalDarts > 0 ? Math.round((totalPoints / totalDarts) * 100) / 100 : 0,
      total180s,
      totalMaximums,
      bestAverage: Math.round(bestAverage * 100) / 100,
      worstAverage: Math.round(worstAverage * 100) / 100,
      checkoutPercentage: totalCheckoutAttempts > 0 ? 
        Math.round((totalCheckoutHits / totalCheckoutAttempts) * 100 * 100) / 100 : 0,
      doublePercentage: totalDoubleAttempts > 0 ? 
        Math.round((totalDoubleHits / totalDoubleAttempts) * 100 * 100) / 100 : 0,
      highestCheckout: Math.max(...allGameStats.map(game => game.highestCheckout), 0),
      favouriteFinish
    };
  }

  // Calculate form guide (last N games)
  calculateFormGuide(recentGameStats: PlayerGameStats[], gamesCount: number = 5): {
    recentForm: boolean[]; // true = win, false = loss
    recentWinPercentage: number;
    recentAverage: number;
    trend: 'improving' | 'declining' | 'stable';
    streakType: 'winning' | 'losing' | 'none';
    streakLength: number;
  } {
    const recent = recentGameStats.slice(-gamesCount);
    const recentForm = recent.map(game => game.gameWon);
    const recentWins = recentForm.filter(win => win).length;
    
    const recentDarts = recent.reduce((sum, game) => sum + game.totalDarts, 0);
    const recentPoints = recent.reduce((sum, game) => sum + game.totalPoints, 0);
    const recentAverage = recentDarts > 0 ? recentPoints / recentDarts : 0;

    // Calculate trend (compare first half vs second half of recent games)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recent.length >= 4) {
      const halfPoint = Math.floor(recent.length / 2);
      const firstHalf = recent.slice(0, halfPoint);
      const secondHalf = recent.slice(halfPoint);

      const firstHalfAvg = this.calculateAverageForGames(firstHalf);
      const secondHalfAvg = this.calculateAverageForGames(secondHalf);

      if (secondHalfAvg > firstHalfAvg + 1) trend = 'improving';
      else if (firstHalfAvg > secondHalfAvg + 1) trend = 'declining';
    }

    // Calculate current streak
    let streakLength = 0;
    let streakType: 'winning' | 'losing' | 'none' = 'none';
    
    if (recentForm.length > 0) {
      const lastResult = recentForm[recentForm.length - 1];
      streakType = lastResult ? 'winning' : 'losing';
      
      for (let i = recentForm.length - 1; i >= 0; i--) {
        if (recentForm[i] === lastResult) {
          streakLength++;
        } else {
          break;
        }
      }
    }

    return {
      recentForm,
      recentWinPercentage: recent.length > 0 ? (recentWins / recent.length) * 100 : 0,
      recentAverage: Math.round(recentAverage * 100) / 100,
      trend,
      streakType: streakLength > 1 ? streakType : 'none',
      streakLength
    };
  }

  private calculateAverageForGames(games: PlayerGameStats[]): number {
    const totalDarts = games.reduce((sum, game) => sum + game.totalDarts, 0);
    const totalPoints = games.reduce((sum, game) => sum + game.totalPoints, 0);
    return totalDarts > 0 ? totalPoints / totalDarts : 0;
  }

  // Calculate comparative statistics (player vs team average)
  calculateComparativeStats(
    playerStats: PlayerGameStats,
    teamAverageStats: Partial<PlayerGameStats>
  ): {
    averageComparison: number; // positive = better than average
    winRateComparison: number;
    checkoutComparison: number;
    doubleComparison: number;
    consistencyRating: 'excellent' | 'good' | 'average' | 'below-average';
  } {
    const averageComparison = playerStats.average - (teamAverageStats.average || 0);
    const winRateComparison = (playerStats.gameWon ? 100 : 0) - 50; // vs 50% baseline
    const checkoutComparison = playerStats.checkoutPercentage - (teamAverageStats.checkoutPercentage || 0);
    const doubleComparison = playerStats.doublePercentage - (teamAverageStats.doublePercentage || 0);

    // Calculate consistency rating based on multiple factors
    let consistencyScore = 0;
    if (playerStats.average >= 40) consistencyScore += 2;
    else if (playerStats.average >= 30) consistencyScore += 1;
    
    if (playerStats.checkoutPercentage >= 40) consistencyScore += 2;
    else if (playerStats.checkoutPercentage >= 25) consistencyScore += 1;
    
    if (playerStats.doublePercentage >= 35) consistencyScore += 1;

    const consistencyRating = 
      consistencyScore >= 4 ? 'excellent' :
      consistencyScore >= 3 ? 'good' :
      consistencyScore >= 2 ? 'average' : 'below-average';

    return {
      averageComparison: Math.round(averageComparison * 100) / 100,
      winRateComparison: Math.round(winRateComparison * 100) / 100,
      checkoutComparison: Math.round(checkoutComparison * 100) / 100,
      doubleComparison: Math.round(doubleComparison * 100) / 100,
      consistencyRating
    };
  }

  // Format statistics for display
  formatStatForDisplay(stat: number, type: 'average' | 'percentage' | 'count'): string {
    switch (type) {
      case 'average':
        return stat.toFixed(2);
      case 'percentage':
        return `${stat.toFixed(1)}%`;
      case 'count':
        return Math.floor(stat).toString();
      default:
        return stat.toString();
    }
  }

  // Generate insights based on statistics
  generateInsights(stats: PlayerGameStats): string[] {
    const insights: string[] = [];

    // Average insights
    if (stats.average >= 45) {
      insights.push("🎯 Excellent scoring average - you're hitting consistently high scores!");
    } else if (stats.average >= 35) {
      insights.push("👍 Good scoring average - keep working on those high scores!");
    } else if (stats.average < 25) {
      insights.push("💪 Focus on improving your scoring consistency for better results.");
    }

    // Checkout insights
    if (stats.checkoutPercentage >= 50) {
      insights.push("🏆 Outstanding checkout percentage - you're clinical under pressure!");
    } else if (stats.checkoutPercentage < 20) {
      insights.push("🎯 Practice your finishing - checkout percentage could be improved.");
    }

    // High score insights
    if (stats.scores180 > 0) {
      insights.push(`🔥 ${stats.scores180} maximum${stats.scores180 > 1 ? 's' : ''} - excellent power scoring!`);
    }
    
    if (stats.scores140Plus >= stats.totalDarts / 30) {
      insights.push("⚡ High frequency of 140+ scores shows great consistency!");
    }

    // Double insights
    if (stats.doublePercentage >= 40) {
      insights.push("🎪 Strong double hitting - your accuracy is paying off!");
    } else if (stats.doublePercentage < 25) {
      insights.push("🎯 Work on your double accuracy to improve your finishing.");
    }

    return insights;
  }
}

// Singleton export
export const statisticsService = StatisticsService.getInstance();