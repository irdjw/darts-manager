import { writable, derived, type Readable } from 'svelte/store';
import type { 
  GameState, 
  DartThrow, 
  TurnData, 
  LegData, 
  PlayerGameStats, 
  ScoringMode,
  CheckoutRoute 
} from '../types/scoring';

// Game state store
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

// Track whether players have started the leg (must start on double)
export const legStartStatus = writable<{
  homeStarted: boolean;
  awayStarted: boolean;
}>({
  homeStarted: false,
  awayStarted: false
});

// Current scoring mode
export const scoringMode = writable<ScoringMode['type']>('dart-by-dart');

// All dart throws in the current game
export const dartHistory = writable<DartThrow[]>([]);

// Current turn's darts (for dart-by-dart mode)
export const currentTurnDarts = writable<DartThrow[]>([]);

// Turn total input (for turn-total mode)
export const turnTotalInput = writable<string>('');

// Individual dart input (for dart-by-dart mode)
export const dartInput = writable<string>('');

// Leg history
export const legHistory = writable<LegData[]>([]);

// Show/hide checkout suggestions
export const showCheckouts = writable<boolean>(true);

// Current checkout routes
export const checkoutRoutes = writable<CheckoutRoute[]>([]);

// Game completion status and stats
export const gameStats = writable<PlayerGameStats[]>([]);

// Enhanced statistics tracking
export const enhancedStats = writable<{
  checkoutAttempts: number;
  checkoutHits: number;
  highestCheckout: number;
}>({
  checkoutAttempts: 0,
  checkoutHits: 0,
  highestCheckout: 0
});

// Derived stores for computed values
export const currentScore: Readable<number> = derived(
  gameState,
  ($gameState) => $gameState.currentThrower === 'home' ? $gameState.homeScore : $gameState.awayScore
);

export const currentDartsRemaining: Readable<number> = derived(
  gameState,
  ($gameState) => 3 - $gameState.dartsThrown
);

export const isPlayerTurn: Readable<boolean> = derived(
  [gameState],
  ([$gameState]) => {
    // For league matches, this would depend on team assignment
    // For practice games, always return true
    return $gameState.gameType === 'practice' || $gameState.currentThrower === 'home';
  }
);

export const currentTurnTotal: Readable<number> = derived(
  [currentTurnDarts, turnTotalInput, scoringMode],
  ([$currentTurnDarts, $turnTotalInput, $scoringMode]) => {
    if ($scoringMode === 'dart-by-dart') {
      return $currentTurnDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
    }
    return parseInt($turnTotalInput) || 0;
  }
);

export const canCompleteTurn: Readable<boolean> = derived(
  [currentTurnDarts, turnTotalInput, scoringMode],
  ([$currentTurnDarts, $turnTotalInput, $scoringMode]) => {
    if ($scoringMode === 'dart-by-dart') {
      return $currentTurnDarts.length > 0;
    }
    return $turnTotalInput.length > 0;
  }
);

// Store actions/methods
export const scoringActions = {
  // Initialize a new game
  initializeGame: (gameId: string, homePlayer: string, awayPlayer: string, gameType: GameState['gameType'] = 'league') => {
    gameState.set({
      gameId,
      currentLeg: 1,
      homeScore: 501,
      awayScore: 501,
      currentThrower: 'home',
      dartsThrown: 0,
      gameComplete: false,
      gameType
    });
    
    legStartStatus.set({
      homeStarted: false,
      awayStarted: false
    });
    
    dartHistory.set([]);
    currentTurnDarts.set([]);
    legHistory.set([]);
    gameStats.set([]);
    enhancedStats.set({ checkoutAttempts: 0, checkoutHits: 0, highestCheckout: 0 });
  },

  // Switch scoring mode
  setScoringMode: (mode: ScoringMode['type']) => {
    scoringMode.set(mode);
    // Clear current inputs when switching modes
    currentTurnDarts.set([]);
    turnTotalInput.set('');
    dartInput.set('');
  },

  // Add a dart to current turn (dart-by-dart mode)
  addDartToCurrentTurn: (score: number, isDouble: boolean = false, isCheckoutAttempt: boolean = false, checkoutSuccessful: boolean = false) => {
    currentTurnDarts.update(darts => {
      if (darts.length >= 3) return darts; // Max 3 darts per turn
      
      const newDart: DartThrow = {
        id: crypto.randomUUID(),
        legNumber: 0, // Will be set when turn is completed
        turnNumber: 0, // Will be set when turn is completed
        dartNumber: darts.length + 1,
        dartScore: score,
        runningScore: 0, // Will be calculated when turn is completed
        isDoubleAttempt: isDouble,
        isCheckoutAttempt,
        checkoutSuccessful,
        timestamp: new Date()
      };
      
      return [...darts, newDart];
    });
  },

  // Complete current turn
  completeTurn: (bustTurn: boolean = false) => {
    // This would integrate with the game logic to update scores
    // and move to next thrower
    currentTurnDarts.set([]);
    turnTotalInput.set('');
    dartInput.set('');
  },

  // Update dart input
  setDartInput: (value: string) => {
    dartInput.set(value);
  },

  // Update turn total input
  setTurnTotalInput: (value: string) => {
    turnTotalInput.set(value);
  },

  // Toggle checkout display
  toggleCheckouts: () => {
    showCheckouts.update(show => !show);
  },

  // Update checkout routes
  setCheckoutRoutes: (routes: CheckoutRoute[]) => {
    checkoutRoutes.set(routes);
  },

  // Undo last dart
  undoLastDart: () => {
    currentTurnDarts.update(darts => darts.slice(0, -1));
  },

  // Clear current turn
  clearCurrentTurn: () => {
    currentTurnDarts.set([]);
    turnTotalInput.set('');
    dartInput.set('');
  },

  // Update enhanced stats
  updateEnhancedStats: (updates: Partial<{ checkoutAttempts: number; checkoutHits: number; highestCheckout: number }>) => {
    enhancedStats.update(stats => ({ ...stats, ...updates }));
  },

  // Mark player as having started the leg (when they score their first double)
  markPlayerStarted: (player: 'home' | 'away') => {
    legStartStatus.update(status => ({
      ...status,
      [player + 'Started']: true
    }));
  },

  // Check if current player has started the leg
  hasPlayerStarted: (): Promise<boolean> => {
    return new Promise(resolve => {
      const gameUnsubscribe = gameState.subscribe(gameState => {
        const legUnsubscribe = legStartStatus.subscribe(legStatus => {
          const hasStarted = gameState.currentThrower === 'home' 
            ? legStatus.homeStarted 
            : legStatus.awayStarted;
          resolve(hasStarted);
          gameUnsubscribe();
          legUnsubscribe();
        });
      });
    });
  },

  // Get current game state (for external use)
  getCurrentGameState: (): Promise<GameState> => {
    return new Promise(resolve => {
      const unsubscribe = gameState.subscribe(state => {
        resolve(state);
        unsubscribe();
      });
    });
  }
};

// Utility derived stores for UI components
export const homeScoreDisplay: Readable<string> = derived(
  gameState,
  ($gameState) => $gameState.homeScore.toString()
);

export const awayScoreDisplay: Readable<string> = derived(
  gameState,
  ($gameState) => $gameState.awayScore.toString()
);

export const currentThrowerName: Readable<string> = derived(
  gameState,
  ($gameState) => $gameState.currentThrower === 'home' ? 'Home' : 'Away'
);

export const dartsRemainingDisplay: Readable<string> = derived(
  gameState,
  ($gameState) => {
    const remaining = 3 - $gameState.dartsThrown;
    return `${remaining} dart${remaining !== 1 ? 's' : ''} remaining`;
  }
);

// Statistics derived store
export const currentLegStats: Readable<Partial<PlayerGameStats>> = derived(
  [dartHistory, gameState],
  ([$dartHistory, $gameState]) => {
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

    // Calculate turn totals for high scores
    const turnTotals = new Map<string, number>();
    currentLegDarts.forEach(dart => {
      const key = `${dart.turnNumber}`;
      turnTotals.set(key, (turnTotals.get(key) || 0) + dart.dartScore);
    });

    const turnScores = Array.from(turnTotals.values());
    
    return {
      totalDarts,
      totalPoints,
      average: Math.round(average * 100) / 100,
      scores80Plus: turnScores.filter(score => score >= 80).length,
      scores100Plus: turnScores.filter(score => score >= 100).length,
      scores140Plus: turnScores.filter(score => score >= 140).length,
      scores180: turnScores.filter(score => score === 180).length
    };
  }
);