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

// Match format and leg tracking
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

// Game status for pause/resume/quit functionality
export const gameStatus = writable<'setup' | 'playing' | 'paused' | 'finished'>('setup');

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

// Enhanced undo/redo functionality with full game state snapshots
interface GameSnapshot {
  dartHistory: DartThrow[];
  currentTurnDarts: DartThrow[];
  gameState: GameState;
  legStartStatus: { homeStarted: boolean; awayStarted: boolean };
}

export const dartHistoryStack = writable<GameSnapshot[]>([]);
export const redoStack = writable<GameSnapshot[]>([]);

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

// Mobile-specific UI state
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

// Derived stores for computed values
export const currentScore: Readable<number> = derived(
  gameState,
  ($gameState) => $gameState.currentThrower === 'home' ? $gameState.homeScore : $gameState.awayScore
);

export const currentDartsRemaining: Readable<number> = derived(
  [currentTurnDarts],
  ([$currentTurnDarts]) => Math.max(0, 3 - $currentTurnDarts.length)
);

export const canAddDart: Readable<boolean> = derived(
  [currentTurnDarts],
  ([$currentTurnDarts]) => $currentTurnDarts.length < 3
);

export const dartsRemaining: Readable<number> = derived(
  [currentTurnDarts],
  ([$currentTurnDarts]) => Math.max(0, 3 - $currentTurnDarts.length)
);

export const canUndo: Readable<boolean> = derived(
  [dartHistoryStack],
  ([$dartHistoryStack]) => $dartHistoryStack.length > 0
);

export const canRedo: Readable<boolean> = derived(
  [redoStack],
  ([$redoStack]) => $redoStack.length > 0
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
  initializeGame: (gameId: string, homePlayer: string, awayPlayer: string, gameType: GameState['gameType'] = 'league', venue?: 'home' | 'away') => {
    // Determine who throws first based on venue:
    // HOME: Our player throws SECOND (opponent throws first)
    // AWAY: Our player throws FIRST
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

  // Add a dart to current turn (dart-by-dart mode) with comprehensive snapshot
  addDartToCurrentTurn: (score: number, isDouble: boolean = false, isCheckoutAttempt: boolean = false, checkoutSuccessful: boolean = false) => {
    let currentGameState: GameState;
    let currentDarts: DartThrow[];
    let currentHistory: DartThrow[];
    let currentLegStart: { homeStarted: boolean; awayStarted: boolean };

    gameState.subscribe(s => currentGameState = s)();
    currentTurnDarts.subscribe(d => currentDarts = d)();
    dartHistory.subscribe(h => currentHistory = h)();
    legStartStatus.subscribe(l => currentLegStart = l)();

    if (currentDarts.length >= 3) return;

    dartHistoryStack.update(stack => [...stack, {
      dartHistory: [...currentHistory],
      currentTurnDarts: [...currentDarts],
      gameState: { ...currentGameState },
      legStartStatus: { ...currentLegStart }
    }]);

    redoStack.set([]);

    currentTurnDarts.update(darts => {
      const newDart: DartThrow = {
        id: crypto.randomUUID(),
        legNumber: 0,
        turnNumber: 0,
        dartNumber: darts.length + 1,
        dartScore: score,
        runningScore: 0,
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

  // Undo last dart with full state restoration
  undoLastDart: () => {
    let currentGameState: GameState;
    let currentDarts: DartThrow[];
    let currentHistory: DartThrow[];
    let currentLegStart: { homeStarted: boolean; awayStarted: boolean };

    gameState.subscribe(s => currentGameState = s)();
    currentTurnDarts.subscribe(d => currentDarts = d)();
    dartHistory.subscribe(h => currentHistory = h)();
    legStartStatus.subscribe(l => currentLegStart = l)();

    let lastSnapshot: GameSnapshot | undefined;
    dartHistoryStack.update(stack => {
      lastSnapshot = stack.pop();
      return stack;
    });

    if (lastSnapshot) {
      redoStack.update(stack => [...stack, {
        dartHistory: [...currentHistory],
        currentTurnDarts: [...currentDarts],
        gameState: { ...currentGameState },
        legStartStatus: { ...currentLegStart }
      }]);

      gameState.set(lastSnapshot.gameState);
      currentTurnDarts.set(lastSnapshot.currentTurnDarts);
      dartHistory.set(lastSnapshot.dartHistory);
      legStartStatus.set(lastSnapshot.legStartStatus);
    }
  },

  // Redo last undone dart with full state restoration
  redoLastDart: () => {
    let currentGameState: GameState;
    let currentDarts: DartThrow[];
    let currentHistory: DartThrow[];
    let currentLegStart: { homeStarted: boolean; awayStarted: boolean };

    gameState.subscribe(s => currentGameState = s)();
    currentTurnDarts.subscribe(d => currentDarts = d)();
    dartHistory.subscribe(h => currentHistory = h)();
    legStartStatus.subscribe(l => currentLegStart = l)();

    let nextSnapshot: GameSnapshot | undefined;
    redoStack.update(stack => {
      nextSnapshot = stack.pop();
      return stack;
    });

    if (nextSnapshot) {
      dartHistoryStack.update(stack => [...stack, {
        dartHistory: [...currentHistory],
        currentTurnDarts: [...currentDarts],
        gameState: { ...currentGameState },
        legStartStatus: { ...currentLegStart }
      }]);

      gameState.set(nextSnapshot.gameState);
      currentTurnDarts.set(nextSnapshot.currentTurnDarts);
      dartHistory.set(nextSnapshot.dartHistory);
      legStartStatus.set(nextSnapshot.legStartStatus);
    }
  },

  // Clear current turn with snapshot
  clearCurrentTurn: () => {
    let currentGameState: GameState;
    let currentDarts: DartThrow[];
    let currentHistory: DartThrow[];
    let currentLegStart: { homeStarted: boolean; awayStarted: boolean };

    gameState.subscribe(s => currentGameState = s)();
    currentTurnDarts.subscribe(d => currentDarts = d)();
    dartHistory.subscribe(h => currentHistory = h)();
    legStartStatus.subscribe(l => currentLegStart = l)();

    if (currentDarts.length > 0) {
      dartHistoryStack.update(stack => [...stack, {
        dartHistory: [...currentHistory],
        currentTurnDarts: [...currentDarts],
        gameState: { ...currentGameState },
        legStartStatus: { ...currentLegStart }
      }]);

      redoStack.set([]);
    }

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
    
    // Update game start time if this is the first dart
    enhancedStats.update(stats => ({
      ...stats,
      gameStartTime: stats.gameStartTime || new Date(),
      lastDartTime: new Date()
    }));
  },
  
  // Update mobile UI state
  updateMobileUI: (updates: Partial<{
    showStats: boolean;
    showCheckouts: boolean;
    isFullscreen: boolean;
    orientation: 'portrait' | 'landscape';
    hapticEnabled: boolean;
  }>) => {
    mobileUIState.update(state => ({ ...state, ...updates }));
  },
  
  // Reset game state for new game
  resetGame: () => {
    gameState.set({
      gameId: '',
      currentLeg: 1,
      homeScore: 501,
      awayScore: 501,
      currentThrower: 'home',
      dartsThrown: 0,
      gameComplete: false,
      gameType: 'league'
    });
    
    legStartStatus.set({
      homeStarted: false,
      awayStarted: false
    });
    
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
  },

  // Pause current match
  pauseMatch: () => {
    gameStatus.set('paused');
    // Save match to localStorage for persistence
    saveMatchToLocalStorage();
  },

  // Resume paused match
  resumeMatch: () => {
    gameStatus.set('playing');
  },

  // Quit current match
  quitMatch: () => {
    gameStatus.set('finished');
    // Clear localStorage
    clearMatchFromLocalStorage();
  },

  // Set match format
  setMatchFormat: (format: 'single' | 'bo3' | 'bo5' | 'bo7') => {
    const requiredLegsMap = {
      single: 1,
      bo3: 2,
      bo5: 3,
      bo7: 4
    };
    
    matchFormat.set({
      legFormat: format,
      homeLegsWon: 0,
      awayLegsWon: 0,
      requiredLegs: requiredLegsMap[format]
    });
  },

  // Complete current leg
  completeLeg: (winner: 'home' | 'away') => {
    let matchCompleted = false;
    
    matchFormat.update(format => {
      const newFormat = { ...format };
      if (winner === 'home') {
        newFormat.homeLegsWon++;
      } else {
        newFormat.awayLegsWon++;
      }
      
      // Check if match is complete
      if (newFormat.homeLegsWon >= newFormat.requiredLegs || newFormat.awayLegsWon >= newFormat.requiredLegs) {
        matchCompleted = true;
        gameState.update(state => ({ ...state, gameComplete: true, winner }));
        gameStatus.set('finished');
      }
      
      return newFormat;
    });
    
    if (!matchCompleted) {
      // Start next leg
      gameState.update(state => ({
        ...state,
        currentLeg: state.currentLeg + 1,
        homeScore: 501,
        awayScore: 501,
        dartsThrown: 0
      }));
      
      // Reset leg start status
      legStartStatus.set({
        homeStarted: false,
        awayStarted: false
      });
      
      // Clear current turn
      currentTurnDarts.set([]);
    }
  },

  // Get required legs for current format
  getRequiredLegs: (): Promise<number> => {
    return new Promise(resolve => {
      const unsubscribe = matchFormat.subscribe(format => {
        resolve(format.requiredLegs);
        unsubscribe();
      });
    });
  }
};

// Helper functions for localStorage
function saveMatchToLocalStorage() {
  // Implementation would save current game state to localStorage
  // For now, this is a placeholder
}

function clearMatchFromLocalStorage() {
  // Implementation would clear match data from localStorage
  // For now, this is a placeholder
}

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