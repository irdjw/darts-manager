import type { CheckoutData, CheckoutRoute } from '../types/scoring';

export class CheckoutService {
  private static instance: CheckoutService;
  private checkoutRoutes: Map<number, CheckoutData> = new Map();

  // All possible single dart scores
  private readonly singleScores = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48, 50, 51, 54, 57, 60
  ];

  // All finishing doubles (including bull)
  private readonly doubleFinishes = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];

  private constructor() {
    this.buildCheckoutRoutes();
  }

  static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService();
    }
    return CheckoutService.instance;
  }

  private buildCheckoutRoutes(): void {
    // Build all possible checkout routes for scores 2-170
    for (let score = 2; score <= 170; score++) {
      this.checkoutRoutes.set(score, this.calculateRoutes(score));
    }
  }

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

    // Single dart finishes (must be double)
    if (this.doubleFinishes.includes(targetScore)) {
      routes.routes.singleDart.push([targetScore]);
      routes.possible = true;
    }

    // Two dart finishes
    for (const first of this.singleScores) {
      if (first >= targetScore) continue;
      
      const remaining = targetScore - first;
      if (remaining > 0 && this.doubleFinishes.includes(remaining)) {
        if (first + remaining === targetScore) {
          routes.routes.twoDart.push([first, remaining]);
          routes.possible = true;
        }
      }
    }

    // Three dart finishes
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

    // Generate recommended routes
    routes.recommended = this.getRecommendedRoutes(routes);

    return routes;
  }

  private getRecommendedRoutes(checkoutData: CheckoutData): CheckoutRoute[] {
    const allRoutes: CheckoutRoute[] = [];

    // Add single dart routes
    checkoutData.routes.singleDart.forEach(route => {
      allRoutes.push({
        darts: route,
        difficulty: this.calculateDifficulty(route),
        description: this.formatRoute(route)
      });
    });

    // Add two dart routes (limit to best ones)
    checkoutData.routes.twoDart.slice(0, 10).forEach(route => {
      allRoutes.push({
        darts: route,
        difficulty: this.calculateDifficulty(route),
        description: this.formatRoute(route)
      });
    });

    // Add three dart routes (limit to best ones)
    checkoutData.routes.threeDart.slice(0, 5).forEach(route => {
      allRoutes.push({
        darts: route,
        difficulty: this.calculateDifficulty(route),
        description: this.formatRoute(route)
      });
    });

    // Sort by fewest darts, then by difficulty
    return allRoutes.sort((a, b) => {
      if (a.darts.length !== b.darts.length) {
        return a.darts.length - b.darts.length;
      }
      return a.difficulty - b.difficulty;
    }).slice(0, 5); // Return top 5 recommendations
  }

  private calculateDifficulty(route: number[]): number {
    let difficulty = 0;
    
    route.forEach(dart => {
      if (dart === 50) difficulty += 8; // Double bull - hardest
      else if (dart === 25) difficulty += 3; // Single bull
      else if (dart >= 57) difficulty += 7; // High trebles (T19, T20)
      else if (dart >= 42 && dart % 3 === 0) difficulty += 6; // Mid trebles
      else if (dart >= 21 && dart % 3 === 0) difficulty += 4; // Low trebles
      else if (dart >= 32 && dart % 2 === 0) difficulty += 5; // High doubles
      else if (dart >= 20 && dart % 2 === 0) difficulty += 3; // Mid doubles
      else if (dart >= 2 && dart % 2 === 0) difficulty += 2; // Low doubles
      else difficulty += 1; // Singles
    });
    
    return difficulty;
  }

  private formatRoute(route: number[]): string {
    return route.map(dart => this.formatDart(dart)).join(' → ');
  }

  private formatDart(dart: number): string {
    if (dart === 50) return 'Bull';
    if (dart === 25) return 'S25';
    if (dart === 0) return 'Miss';
    
    // Check for doubles
    if (dart <= 40 && dart % 2 === 0 && dart > 0) {
      const segment = dart / 2;
      return `D${segment}`;
    }
    
    // Check for trebles
    if (dart <= 60 && dart % 3 === 0 && dart > 20) {
      const segment = dart / 3;
      return `T${segment}`;
    }
    
    // Must be a single
    return `S${dart}`;
  }

  // Public API methods
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

  getRecommendedFinishes(currentScore: number, dartsRemaining: number): CheckoutRoute[] {
    const routes = this.checkoutRoutes.get(currentScore);
    if (!routes || !this.canCheckout(currentScore, dartsRemaining)) {
      return [];
    }

    return routes.recommended.filter(route => route.darts.length <= dartsRemaining);
  }

  isCheckoutAttempt(currentScore: number, dartScore: number, dartsRemaining: number): boolean {
    // First check if current score is a valid checkout position
    const totalDartsRemaining = dartsRemaining + 1; // Including this dart
    if (!this.canCheckout(currentScore, totalDartsRemaining)) {
      return false;
    }

    // The dart counts as a checkout attempt if we're in a valid checkout position
    return true;
  }

  isValidDartScore(score: number): boolean {
    return this.singleScores.includes(score);
  }

  isDoubleScore(score: number): boolean {
    return this.doubleFinishes.includes(score);
  }

  isCheckoutOpportunity(score: number): boolean {
    return score >= 2 && score <= 170 && this.checkoutRoutes.get(score)?.possible === true;
  }

  // Get all impossible checkout scores
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

// Singleton export
export const checkoutService = CheckoutService.getInstance();