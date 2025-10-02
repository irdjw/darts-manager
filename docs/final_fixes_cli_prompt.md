# Claude CLI Prompt - Final Darts Scorer Fixes
## With Git Integration and Verification

---

## 🎯 PROMPT FOR CLAUDE CLI (Copy from here)

```
You are working in VS Code with Git integration on the Isaac Wilson Darts application. I need you to complete the final fixes for the darts scorer interface refactoring. You must verify all changes work correctly before committing to main and syncing.

## CURRENT STATUS

The darts scorer interface is 80% complete. The following are working correctly:
✅ NumberGrid multiplier toggle workflow
✅ GameCompleteModal component
✅ Basic layout structure
✅ British English throughout
✅ No fixed positioning issues

## REMAINING ISSUES TO FIX

### Issue 1: Statistics Shown During Gameplay (HIGH PRIORITY)
**Problem**: LiveDartStats component is visible during gameplay, cluttering the interface.
**Location**: `src/lib/components/MobileDartEntry.svelte`
**Action**: Remove or conditionally hide LiveDartStats during gameplay. Only show statistics in GameCompleteModal at game end.

### Issue 2: Extra Components Cluttering Interface (HIGH PRIORITY)
**Problem**: DartVisualIndicators and CheckoutSuggestions components are visible, not matching the clean reference design.
**Location**: `src/lib/components/MobileDartEntry.svelte`
**Action**: Remove or conditionally hide these components during gameplay.

### Issue 3: Incomplete Undo/Redo System (MEDIUM PRIORITY)
**Problem**: Basic undo/redo exists but lacks comprehensive history tracking.
**Location**: `src/lib/stores/scoringStores.ts`
**Action**: Implement full history tracking with dartHistory and redoStack stores.

### Issue 4: Layout Verification (LOW PRIORITY)
**Problem**: Need to verify no scrolling occurs on all device sizes.
**Action**: Test and adjust if needed.

---

## STEP-BY-STEP IMPLEMENTATION PROCESS

### PHASE 1: Git Setup and Branch Creation

**Step 1.1: Check Current Git Status**
```bash
git status
```

**Step 1.2: Ensure You're on Main Branch**
```bash
git checkout main
git pull origin main
```

**Step 1.3: Create Feature Branch**
```bash
git checkout -b fix/darts-scorer-final-cleanup
```

**Step 1.4: Verify Branch Creation**
```bash
git branch
```
Expected output should show `* fix/darts-scorer-final-cleanup`

---

### PHASE 2: Fix Issue 1 - Remove Statistics During Gameplay

**Step 2.1: Open File**
Open `src/lib/components/MobileDartEntry.svelte`

**Step 2.2: Locate LiveDartStats Component**
Find this section (approximately line 120-130):
```svelte
<LiveDartStats 
  currentScore={currentScoreValue}
  currentTurnDarts={currentTurnDartsValue}
  {statsValue}
/>
```

**Step 2.3: Remove or Conditionally Hide**
Replace with:
```svelte
<!-- LiveDartStats removed - statistics only shown in GameCompleteModal at game end -->
```

**Step 2.4: Verify Import is Not Needed**
At the top of the file, find and remove:
```typescript
import LiveDartStats from './LiveDartStats.svelte';
```

**Step 2.5: Save File**

**Step 2.6: Verify Change**
```bash
git diff src/lib/components/MobileDartEntry.svelte
```
Review the diff to ensure only LiveDartStats was removed.

---

### PHASE 3: Fix Issue 2 - Remove Extra Components

**Step 3.1: Locate DartVisualIndicators**
In the same file `src/lib/components/MobileDartEntry.svelte`, find:
```svelte
<DartVisualIndicators ... />
```

**Step 3.2: Remove or Conditionally Hide**
Replace with:
```svelte
<!-- DartVisualIndicators removed for cleaner interface -->
```

**Step 3.3: Locate CheckoutSuggestions**
Find:
```svelte
<CheckoutSuggestions ... />
```

**Step 3.4: Remove or Conditionally Hide**
Replace with:
```svelte
<!-- CheckoutSuggestions removed - clean gameplay interface -->
```

**Step 3.5: Remove Unused Imports**
At the top of the file, remove:
```typescript
import DartVisualIndicators from './DartVisualIndicators.svelte';
import CheckoutSuggestions from './CheckoutSuggestions.svelte';
```

**Step 3.6: Save File**

**Step 3.7: Verify Changes**
```bash
git diff src/lib/components/MobileDartEntry.svelte
```

---

### PHASE 4: Fix Issue 3 - Comprehensive Undo/Redo System

**Step 4.1: Open Scoring Stores**
Open `src/lib/stores/scoringStores.ts`

**Step 4.2: Add History Interface**
After the existing interfaces, add:
```typescript
interface DartHistoryItem {
  dart: DartThrow;
  gameState: {
    homeScore: number;
    awayScore: number;
    currentThrower: 'home' | 'away';
    dartsThrown: number;
  };
  turnState: {
    turnDarts: DartThrow[];
    turnTotal: number;
  };
  legStartStatus: {
    homeStarted: boolean;
    awayStarted: boolean;
  };
  timestamp: number;
}
```

**Step 4.3: Add History Stores**
After the existing writable stores, add:
```typescript
// Comprehensive history tracking for undo/redo
export const dartHistory = writable<DartHistoryItem[]>([]);
export const redoStack = writable<DartHistoryItem[]>([]);
```

**Step 4.4: Add History Actions**
In the `scoringActions` object, add these new actions:

```typescript
// Add dart to history (call this before updating game state)
addDartToHistory: (dart: DartThrow, currentState: any) => {
  // Clear redo stack when new dart added
  redoStack.set([]);
  
  // Add to history
  dartHistory.update(history => [
    ...history,
    {
      dart,
      gameState: {
        homeScore: currentState.homeScore,
        awayScore: currentState.awayScore,
        currentThrower: currentState.currentThrower,
        dartsThrown: currentState.dartsThrown
      },
      turnState: {
        turnDarts: [...currentState.turnDarts],
        turnTotal: currentState.turnTotal
      },
      legStartStatus: { ...currentState.legStartStatus },
      timestamp: Date.now()
    }
  ]);
  
  // Update canUndo flag
  canUndo.set(true);
},

// Undo last dart
undoLastDart: () => {
  let undoneItem: DartHistoryItem | null = null;
  
  dartHistory.update(history => {
    if (history.length === 0) return history;
    
    undoneItem = history[history.length - 1];
    return history.slice(0, -1);
  });
  
  if (undoneItem) {
    // Add to redo stack
    redoStack.update(stack => [...stack, undoneItem!]);
    canRedo.set(true);
    
    // Restore game state BEFORE this dart
    gameState.update(state => ({
      ...state,
      ...undoneItem!.gameState
    }));
    
    // Restore turn state
    currentTurnDarts.set(undoneItem!.turnState.turnDarts);
    currentTurnTotal.set(undoneItem!.turnState.turnTotal);
    
    // Restore leg start status
    legStartStatus.set(undoneItem!.legStartStatus);
    
    // Update canUndo flag
    dartHistory.subscribe(h => canUndo.set(h.length > 0))();
  }
},

// Redo last undone dart
redoLastDart: () => {
  let redoItem: DartHistoryItem | null = null;
  
  redoStack.update(stack => {
    if (stack.length === 0) return stack;
    
    redoItem = stack[stack.length - 1];
    return stack.slice(0, -1);
  });
  
  if (redoItem) {
    // Add back to history
    dartHistory.update(history => [...history, redoItem!]);
    canUndo.set(true);
    
    // Restore game state AFTER this dart
    gameState.update(state => ({
      ...state,
      homeScore: redoItem!.gameState.homeScore,
      awayScore: redoItem!.gameState.awayScore,
      currentThrower: redoItem!.gameState.currentThrower,
      dartsThrown: redoItem!.gameState.dartsThrown
    }));
    
    // Restore turn state
    currentTurnDarts.set([...redoItem!.turnState.turnDarts]);
    currentTurnTotal.set(redoItem!.turnState.turnTotal);
    
    // Restore leg start status
    legStartStatus.set(redoItem!.legStartStatus);
    
    // Update canRedo flag
    redoStack.subscribe(s => canRedo.set(s.length > 0))();
  }
},

// Clear history (call when starting new game/leg)
clearHistory: () => {
  dartHistory.set([]);
  redoStack.set([]);
  canUndo.set(false);
  canRedo.set(false);
}
```

**Step 4.5: Update Existing undoLastDart**
Find the existing `undoLastDart` implementation and replace it with the new comprehensive version above.

**Step 4.6: Save File**

**Step 4.7: Verify Changes**
```bash
git diff src/lib/stores/scoringStores.ts
```

---

### PHASE 5: Integrate History Tracking in MobileDartEntry

**Step 5.1: Open MobileDartEntry**
Open `src/lib/components/MobileDartEntry.svelte`

**Step 5.2: Import History Stores**
Add to existing imports from scoringStores:
```typescript
import { 
  // ... existing imports
  dartHistory,
  redoStack,
  scoringActions
} from '../stores/scoringStores';
```

**Step 5.3: Find addDart Function**
Locate the function that processes dart throws (likely named `addDart` or `handleDartThrown`)

**Step 5.4: Add History Tracking**
Before updating the game state, add:
```typescript
// Add to history BEFORE updating state
scoringActions.addDartToHistory(dart, {
  homeScore: currentGameState.homeScore,
  awayScore: currentGameState.awayScore,
  currentThrower: currentGameState.currentThrower,
  dartsThrown: currentGameState.dartsThrown,
  turnDarts: currentTurnDartsValue,
  turnTotal: currentTurnTotalValue,
  legStartStatus: legStartStatusValue
});
```

**Step 5.5: Ensure Undo/Redo Buttons Call Correct Actions**
Verify the undo/redo buttons call:
```svelte
<button on:click={() => scoringActions.undoLastDart()}>
  ↶ UNDO
</button>

<button on:click={() => scoringActions.redoLastDart()}>
  ↷ REDO
</button>
```

**Step 5.6: Save File**

---

### PHASE 6: Testing and Verification

**Step 6.1: Start Development Server**
```bash
npm run dev
```

**Step 6.2: Open Browser**
Navigate to the development URL (typically http://localhost:5173)

**Step 6.3: Test Statistics Removal**
- [ ] Start a new game
- [ ] Verify NO statistics are visible during gameplay
- [ ] Verify you only see:
  - Player scores
  - Legs won
  - Turn total
  - Individual dart scores
  - Multiplier buttons
  - Number grid
  - Undo/Redo buttons

**Step 6.4: Test Clean Interface**
- [ ] Verify NO DartVisualIndicators component visible
- [ ] Verify NO CheckoutSuggestions component visible
- [ ] Interface should match the clean reference image provided

**Step 6.5: Test Undo/Redo Functionality**
- [ ] Throw 3 darts (e.g., 20, 20, 20)
- [ ] Click UNDO
- [ ] Verify score reverted and last dart removed
- [ ] Click UNDO again
- [ ] Verify score continues to revert
- [ ] Click REDO
- [ ] Verify dart is re-applied correctly
- [ ] Throw a new dart
- [ ] Verify REDO button is now disabled (redo stack cleared)

**Step 6.6: Test Multiple Undo Levels**
- [ ] Throw 9 darts (3 turns)
- [ ] Click UNDO 5 times
- [ ] Verify all 5 darts are correctly undone
- [ ] Click REDO 3 times
- [ ] Verify 3 darts are correctly re-applied

**Step 6.7: Test Game Complete Modal**
- [ ] Complete a full game
- [ ] Verify GameCompleteModal appears
- [ ] Verify comprehensive statistics are shown
- [ ] Verify both players' statistics are displayed
- [ ] Verify "Save & Exit" and "Play Again" buttons work

**Step 6.8: Test Responsive Layout - No Scrolling**
Test on multiple viewport sizes:

**iPhone SE (375px width):**
```javascript
// In browser DevTools, set viewport to 375x667
```
- [ ] Verify NO scrolling required
- [ ] All elements visible on screen
- [ ] Touch targets ≥ 44px

**iPhone 15 Pro (393px width):**
```javascript
// In browser DevTools, set viewport to 393x852
```
- [ ] Verify NO scrolling required
- [ ] All elements visible on screen

**iPad (768px width):**
```javascript
// In browser DevTools, set viewport to 768x1024
```
- [ ] Verify NO scrolling required
- [ ] Layout scales appropriately

**Landscape Orientation:**
```javascript
// In browser DevTools, rotate viewport to landscape
```
- [ ] Verify NO scrolling required
- [ ] All elements still visible

**Step 6.9: Test Starting Score Flexibility**
- [ ] Verify 501 games work correctly
- [ ] Verify 301 games work correctly
- [ ] Scores should NOT be hard-coded

**Step 6.10: Check Console for Errors**
- [ ] Open browser DevTools console
- [ ] Verify NO errors during gameplay
- [ ] Verify NO warnings about missing components

**Step 6.11: Stop Development Server**
```bash
# Press Ctrl+C in terminal
```

---

### PHASE 7: TypeScript and Build Verification

**Step 7.1: Run TypeScript Check**
```bash
npm run check
```

**Expected output:** No errors
If errors occur, fix them before proceeding.

**Step 7.2: Run Build**
```bash
npm run build
```

**Expected output:** Build succeeds with no errors
If build fails, fix errors before proceeding.

**Step 7.3: Test Production Build**
```bash
npm run preview
```

**Step 7.4: Open Preview**
Navigate to preview URL (typically http://localhost:4173)

**Step 7.5: Smoke Test Production Build**
- [ ] Start a game
- [ ] Throw a few darts
- [ ] Test undo/redo
- [ ] Verify no console errors
- [ ] Stop preview server (Ctrl+C)

---

### PHASE 8: Git Commit Process

**Step 8.1: Review All Changes**
```bash
git status
```

**Step 8.2: Review Detailed Diff**
```bash
git diff
```

Carefully review each change to ensure:
- Only intended changes are present
- No accidental deletions
- No debugging code left in

**Step 8.3: Stage Changes**
```bash
git add src/lib/components/MobileDartEntry.svelte
git add src/lib/stores/scoringStores.ts
```

**Step 8.4: Verify Staged Changes**
```bash
git diff --staged
```

**Step 8.5: Create Commit**
```bash
git commit -m "fix: Clean up darts scorer interface - remove statistics during gameplay

- Remove LiveDartStats component from gameplay view
- Remove DartVisualIndicators and CheckoutSuggestions components
- Implement comprehensive undo/redo with full state tracking
- Add dartHistory and redoStack stores
- Verify no scrolling on all device sizes
- Maintain clean interface matching reference design
- All tests passing, build successful

Statistics now only shown in GameCompleteModal at end of game.
Undo/redo now tracks complete game state for accurate restoration.

Tested on:
- iPhone SE (375px)
- iPhone 15 Pro (393px)
- iPad (768px)
- Landscape orientation

Resolves: Darts scorer final cleanup"
```

**Step 8.6: Verify Commit**
```bash
git log -1 --stat
```

Review the commit message and changed files.

---

### PHASE 9: Merge to Main with Verification

**Step 9.1: Switch to Main Branch**
```bash
git checkout main
```

**Step 9.2: Pull Latest Changes**
```bash
git pull origin main
```

**Step 9.3: Merge Feature Branch**
```bash
git merge fix/darts-scorer-final-cleanup
```

**Expected output:** Fast-forward merge or successful merge
If conflicts occur, resolve them carefully.

**Step 9.4: Run Final Verification**
```bash
npm run check
npm run build
```

Both must succeed before pushing.

**Step 9.5: Test After Merge**
```bash
npm run dev
```

Quick smoke test:
- [ ] Start game
- [ ] Throw darts
- [ ] Test undo/redo
- [ ] Complete game
- [ ] Check modal

Stop server (Ctrl+C).

---

### PHASE 10: Push to Remote and Sync

**Step 10.1: Push to Remote Main**
```bash
git push origin main
```

**Step 10.2: Verify Push Success**
```bash
git log -1
```

**Step 10.3: Check Remote Status**
```bash
git status
```

Expected output: "Your branch is up to date with 'origin/main'"

**Step 10.4: Delete Feature Branch Locally**
```bash
git branch -d fix/darts-scorer-final-cleanup
```

**Step 10.5: Verify Branch Deleted**
```bash
git branch
```

Should only show `* main`

---

### PHASE 11: Final Documentation Update

**Step 11.1: Create Summary Document**
Create a new file: `docs/darts-scorer-final-fixes-summary.md`

```markdown
# Darts Scorer Final Fixes - Completion Summary

## Date Completed
[Insert date]

## Changes Made

### 1. Removed Statistics During Gameplay
- Removed LiveDartStats component from MobileDartEntry.svelte
- Statistics now only shown in GameCompleteModal at game end
- Clean interface matching reference design

### 2. Removed Extra Components
- Removed DartVisualIndicators component
- Removed CheckoutSuggestions component
- Simplified gameplay view

### 3. Enhanced Undo/Redo System
- Implemented comprehensive history tracking
- Added dartHistory store with full game state
- Added redoStack store for redo functionality
- Each dart stores complete state for accurate restoration

### 4. Verified Layout
- Tested on iPhone SE (375px)
- Tested on iPhone 15 Pro (393px)
- Tested on iPad (768px)
- Tested landscape orientation
- No scrolling required on any device

## Tests Performed
- [x] Statistics removal verified
- [x] Undo/redo functionality tested
- [x] Multiple undo levels tested
- [x] Redo stack clearing verified
- [x] Game complete modal verified
- [x] Responsive layout tested
- [x] TypeScript check passed
- [x] Production build successful
- [x] No console errors

## Files Modified
- src/lib/components/MobileDartEntry.svelte
- src/lib/stores/scoringStores.ts

## Commit Hash
[Insert commit hash from git log]

## Status
✅ Complete - All fixes implemented and verified
✅ Merged to main
✅ Pushed to remote
✅ Build passing
```

**Step 11.2: Commit Documentation**
```bash
git add docs/darts-scorer-final-fixes-summary.md
git commit -m "docs: Add completion summary for darts scorer final fixes"
git push origin main
```

---

## VERIFICATION CHECKLIST

Before marking as complete, verify ALL items:

### Functionality
- [ ] Statistics NOT visible during gameplay
- [ ] DartVisualIndicators NOT visible
- [ ] CheckoutSuggestions NOT visible
- [ ] Undo removes last dart correctly
- [ ] Redo restores last dart correctly
- [ ] Multiple undo levels work
- [ ] Redo stack clears on new dart
- [ ] Game complete modal shows statistics
- [ ] All player statistics displayed correctly

### Layout and Responsive Design
- [ ] No scrolling on iPhone SE (375px)
- [ ] No scrolling on iPhone 15 Pro (393px)
- [ ] No scrolling on iPad (768px)
- [ ] No scrolling in landscape orientation
- [ ] All touch targets ≥ 44px
- [ ] Interface matches reference design

### Technical
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] No console errors
- [ ] No console warnings
- [ ] Starting score (301/501) not hard-coded

### Git and Code Quality
- [ ] All changes committed
- [ ] Commit message descriptive
- [ ] Merged to main
- [ ] Pushed to remote
- [ ] Feature branch deleted
- [ ] No merge conflicts
- [ ] No debugging code left in
- [ ] British English used throughout

---

## SUCCESS CRITERIA

✅ Interface is clean and uncluttered
✅ Statistics only shown at game end
✅ Comprehensive undo/redo works perfectly
✅ No scrolling on any device
✅ All tests passing
✅ Code committed to main
✅ Remote repository synced

---

## IF ISSUES OCCUR

### If Tests Fail
1. Do NOT commit
2. Fix the issues
3. Re-run all tests
4. Verify fixes work
5. Then proceed with commit

### If Build Fails
1. Check TypeScript errors carefully
2. Fix all type issues
3. Run `npm run check` again
4. Run `npm run build` again
5. Only commit when build succeeds

### If Merge Conflicts Occur
1. Carefully review conflicts
2. Keep your changes if they're correct
3. Test after resolving conflicts
4. Re-run all verification steps

---

## IMPORTANT NOTES

- **NEVER commit broken code to main**
- **ALWAYS verify tests pass before committing**
- **ALWAYS verify build succeeds before pushing**
- **Use British English spelling in all code and comments**
- **Touch targets must be ≥ 44px for accessibility**
- **No scrolling must be maintained on all devices**

---

## END OF INSTRUCTIONS

Follow these steps IN ORDER. Do not skip any verification steps. Confirm each phase is complete before moving to the next. All tests must pass before committing to main and syncing.

Good luck! 🎯
```

---

## USAGE INSTRUCTIONS

1. **Copy the entire prompt above** (everything between the triple backticks after "PROMPT FOR CLAUDE CLI")
2. **Open VS Code** with your project
3. **Open Claude CLI** in the integrated terminal
4. **Paste the prompt** and press Enter
5. **Claude Code will execute** all phases step-by-step
6. **Verify each phase** as Claude progresses
7. **Final verification** before allowing push to main

This prompt ensures:
- ✅ All fixes implemented correctly
- ✅ Comprehensive testing before commit
- ✅ Build verification
- ✅ Safe merge to main
- ✅ Git best practices followed
- ✅ Documentation created

The prompt is structured to prevent committing broken code and ensures thorough verification at every step.