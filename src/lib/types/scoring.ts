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

export interface CheckoutRoute {
  darts: number[];
  difficulty: number;
  description: string;
}

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

export interface ScoringMode {
  type: 'dart-by-dart' | 'turn-total' | 'simple';
  label: string;
  description: string;
  trackIndividualDarts: boolean;
  showCheckouts: boolean;
  calculateStatistics: boolean;
}

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

// Game configuration constants
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

// Validation utilities
export const VALID_DART_SCORES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48, 50, 51, 54, 57, 60
];

export const DOUBLE_SCORES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];

export const TREBLE_SCORES = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60];

// Utility functions for validation
export const isValidDartScore = (score: number): boolean => {
  return VALID_DART_SCORES.includes(score);
};

export const isDoubleScore = (score: number): boolean => {
  return DOUBLE_SCORES.includes(score);
};

export const isCheckoutOpportunity = (score: number): boolean => {
  return score >= 2 && score <= 170 && score !== 169 && score !== 168 && 
         score !== 166 && score !== 165 && score !== 163 && score !== 162 && score !== 159;
};

// Error types for the scoring system
export class ScoringError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ScoringError';
  }
}

export class ValidationError extends ScoringError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class GameStateError extends ScoringError {
  constructor(message: string) {
    super(message, 'GAME_STATE_ERROR');
  }
}