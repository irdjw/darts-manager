# Complete Claude Code CLI Command: Fix All 16 Dart Scoring Issues

```bash
claude code --files "src/lib/components/scoringEngine.svelte,src/lib/components/MobileDartEntry.svelte,src/lib/stores/scoringStores.ts,src/lib/components/NumberGrid.svelte,src/routes/custom-match/[id]/+page.svelte,src/lib/services/customMatchService.ts,src/lib/types/scoring.ts,src/lib/services/checkoutService.ts" --instructions "

Fix ALL 16 issues in this SvelteKit dart scoring application using British English throughout:

## CRITICAL BUG FIXES (Fix these first - they break basic functionality):

### Issue 9: Off-by-One Error in Dart Counting ⚠️ BLOCKING
CURRENT BROKEN CODE in MobileDartEntry.svelte:
```javascript
} else if (currentTurnDartsValue.length >= 2) { // WRONG! Completes after 2 darts
```
FIX TO:
```javascript
} else if (currentTurnDartsValue.length >= 3) { // Correct: complete after 3 darts
```
This is preventing 3-dart turns from working and must be fixed immediately.

### Issue 10: Dart Database Persistence Missing ⚠️ BLOCKING
PROBLEM: DartThrow objects are created but never saved to database
SOLUTION: Add database persistence in dart handling functions:
```typescript
// After creating dartThrow object, save to database
if (customMatch) {
  await customMatchService.saveDartThrow(
    customMatch.id,
    dartThrow.legNumber,
    dartThrow.turnNumber, 
    dartThrow.dartNumber,
    dartThrow.playerId === homePlayerId ? 1 : 2,
    dartThrow.dartScore,
    dartThrow.multiplier || 1,
    dartThrow.segment,
    0, // running total
    newScore, // remaining score
    false, // is bust
    dartThrow.isCheckoutAttempt,
    dartThrow.checkoutSuccessful
  );
}
```

### Issue 11: Turn Switching Logic Inconsistency ⚠️ BLOCKING
PROBLEM: Turn switching happens in multiple places inconsistently
SOLUTION: Create single turn management function:
```typescript
function completeTurn() {
  // Save turn statistics to database
  if (customMatch && currentTurnDartsValue.length > 0) {
    saveTurnStatistics();
  }
  
  // Switch thrower
  gameState.update(state => ({
    ...state,
    currentThrower: state.currentThrower === 'home' ? 'away' : 'home',
    dartsThrown: 0
  }));
  
  // Clear turn
  scoringActions.clearCurrentTurn();
}
```
Call this ONLY after 3 darts OR bust - nowhere else.

### Issue 12: Invalid Dart Score Validation ⚠️ BLOCKING
CURRENT BROKEN CODE:
```javascript
function isValidDartScore(score: number): boolean {
  if (score >= 2 && score <= 40 && score % 2 === 0) return true; // WRONG!
  // This rejects valid scores like 22, 24, 26, etc.
}
```
REPLACE WITH:
```javascript
function isValidDartScore(score: number): boolean {
  const validScores = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48, 50, 
    51, 54, 57, 60
  ];
  return validScores.includes(score);
}
```

## ORIGINAL ISSUES (1-8):

### Issue 1: Fix Dart Counting (Allow 3 darts per turn)
- Update scoringStores.ts to properly track 3 darts per turn
- Fix derived stores: `canAddDart` should return `currentTurn.darts.length < 3`
- Ensure all dart counting logic uses proper 3-dart validation

### Issue 2: Fix Darts Left Counter
- Add derived store in scoringStores.ts:
```typescript
export const dartsRemaining: Readable<number> = derived(
  currentTurnDarts,
  ($currentTurnDarts) => Math.max(0, 3 - $currentTurnDarts.length)
);
```
- Display this counter prominently: '3 darts left' → '2 darts left' → '1 dart left'

### Issue 3: Improve Input Flow (Multiplier then Number)
- Create input state machine in MobileDartEntry.svelte:
```typescript
let inputState: 'multiplier' | 'number' | 'submitting' = 'multiplier';
let selectedMultiplier: 1 | 2 | 3 = 1;
let selectedNumber: number | null = null;

function selectMultiplier(multiplier: 1 | 2 | 3) {
  selectedMultiplier = multiplier;
  inputState = 'number';
}

function selectNumber(number: number) {
  selectedNumber = number;
  inputState = 'submitting';
  // Auto-submit after 100ms delay
  setTimeout(() => submitDart(), 100);
}

function submitDart() {
  const dartScore = selectedNumber * selectedMultiplier;
  handleDartInput(dartScore);
  // Reset for next dart
  inputState = 'multiplier';
  selectedMultiplier = 1;
  selectedNumber = null;
}
```
- Show visual feedback for current state and selected multiplier

### Issue 4: Remove Enter Button (Auto-submission)
- Remove all manual submit/enter buttons from interface
- Implement automatic submission when dart input is complete (multiplier + number selected)
- Add 100ms delay for visual feedback before auto-submission

### Issue 5: Add Undo Functionality
- Install svelte-undo: `npm install svelte-undo`
- Implement in scoringStores.ts:
```typescript
import { createStack } from 'svelte-undo';

const undoStack = createStack(gameState);

export const undoActions = {
  undo: undoStack.undo,
  redo: undoStack.redo,
  canUndo: undoStack.canUndo,
  canRedo: undoStack.canRedo
};

export const scoringActions = {
  ...undoStack.actions,
  // existing actions
};
```
- Add undo/redo buttons with proper disabled states
- Track individual dart throws for precise undo

### Issue 6: Custom Match Management (Pause/Resume/Quit)
- Implement game state machine:
```typescript
type GameState = 'setup' | 'playing' | 'paused' | 'finished';

function pauseMatch() {
  gameState.update(state => ({ ...state, status: 'paused' }));
  saveMatchToLocalStorage();
}

function resumeMatch() {
  gameState.update(state => ({ ...state, status: 'playing' }));
}

function quitMatch() {
  if (confirm('Are you sure you want to quit this match?')) {
    goto('/custom-match');
  }
}

function saveMatchToLocalStorage() {
  localStorage.setItem(`match_${matchId}`, JSON.stringify({
    gameState: $gameState,
    currentTurnDarts: $currentTurnDarts,
    dartHistory: $dartHistory,
    timestamp: Date.now()
  }));
}
```
- Add pause/resume/quit controls to match interface

### Issue 7: Remove Double-25 Restrictions
- Ensure double-25 (50 points) is allowed in all validation
- Remove any code preventing double bull combinations
- Update checkout validation to handle double bull finishes

### Issue 8: Fix Mobile Viewport (Full Window Height)
- Implement proper mobile viewport:
```css
.dart-scoring-app {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```
```javascript
// Handle mobile viewport height changes
let innerHeight = 0;
$: if (browser) {
  document.documentElement.style.setProperty('--vh', `${innerHeight * 0.01}px`);
}
```
- Ensure minimum 44px touch targets
- Prevent scrolling with proper layout constraints

## ADDITIONAL CRITICAL FIXES (13-16):

### Issue 13: Real-Time Statistics Updates
- Calculate and display live statistics after each dart:
```typescript
function updateLiveStats(playerId: string, dartScore: number) {
  const playerStats = getCurrentPlayerStats(playerId);
  playerStats.totalDarts++;
  playerStats.totalPoints += dartScore;
  playerStats.threeDartAverage = (playerStats.totalPoints / playerStats.totalDarts) * 3;
  if (dartScore === 180) playerStats.total180s++;
  if (dartScore >= 140) playerStats.scores140Plus++;
  
  // Update UI immediately
  statsDisplay.update(stats => ({ ...stats, [playerId]: playerStats }));
}
```
- Show: current 3-dart average, darts thrown, 180s count, highest score

### Issue 14: Multi-Leg Support
- Implement leg progression for best-of-3/5/7:
```typescript
function completeLeg(winner: 'home' | 'away') {
  // Update leg scores
  gameState.update(state => ({
    ...state,
    [winner === 'home' ? 'homeLegsWon' : 'awayLegsWon']: 
      state[winner === 'home' ? 'homeLegsWon' : 'awayLegsWon'] + 1,
    currentLeg: state.currentLeg + 1,
    homeScore: startingScore,
    awayScore: startingScore
  }));
  
  // Check if match is complete
  const requiredLegs = getRequiredLegs(legFormat); // 1, 2, 3, 4 for single, bo3, bo5, bo7
  if (legsWon >= requiredLegs) {
    completeMatch();
  } else {
    startNextLeg();
  }
}
```
- Display leg indicators: 'Leg 2 of 3', 'John: 1, Mary: 0'

### Issue 15: Comprehensive Error Handling
- Wrap all database operations in try-catch:
```typescript
async function saveDartThrow(...args) {
  try {
    await customMatchService.saveDartThrow(...args);
  } catch (error) {
    console.error('Failed to save dart:', error);
    showErrorMessage('Failed to save dart throw. Please check your connection.');
    // Optionally queue for retry
  }
}
```
- Add network failure recovery with retry logic
- Show user-friendly error messages
- Add loading states during operations

### Issue 16: Checkout Validation Improvements
- Ensure double-finish requirement in all modes:
```typescript
function validateFinish(remainingScore: number, dartScore: number, isDouble: boolean): boolean {
  if (remainingScore !== dartScore) return false;
  if (!isDouble) {
    showErrorMessage('You must finish on a double!');
    return false;
  }
  if (remainingScore === 1) {
    showErrorMessage('Score of 1 cannot be finished - bust!');
    return false;
  }
  return true;
}
```
- Handle edge cases like 50 finish (single vs double bull)
- Validate checkout attempts in turn-total mode

## IMPLEMENTATION REQUIREMENTS:
- Maintain all existing database integration and API calls
- Use British English throughout (colour, realise, centre, etc.)
- Proper TypeScript types for all new functionality
- Add proper error handling and loading states
- Implement haptic feedback for mobile devices where available
- Follow SvelteKit best practices for form actions and progressive enhancement
- Use semantic HTML and proper accessibility attributes
- Maintain existing styling patterns and design consistency
- Ensure all fixes work together seamlessly
- Test thoroughly on mobile devices

## SUCCESS CRITERIA:
✅ 3 darts per turn work correctly
✅ Darts left counter counts down properly (3→2→1→0)
✅ Input flow: multiplier → number → auto-submit
✅ No enter/submit buttons needed
✅ Undo/redo functionality works for individual darts
✅ Pause/resume/quit functionality for custom matches
✅ Double-25 combinations allowed
✅ Full mobile viewport without scrolling
✅ All darts saved to database correctly
✅ Turn switching works consistently
✅ All valid dartboard scores accepted
✅ Real-time statistics update during play
✅ Multi-leg matches work properly
✅ Comprehensive error handling throughout
✅ Robust checkout validation in all scenarios

Make the scoring system rock-solid and mobile-optimised for tonight's use!"
```