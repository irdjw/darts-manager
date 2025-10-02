# Claude CLI Implementation Prompt
## Darts Scorer Refactoring - Complete Instructions

---

## 🎯 Quick Start

Copy the prompt below and paste it into Claude CLI in your VS Code terminal.

---

## 📋 PROMPT FOR CLAUDE CLI

```
I need you to refactor the darts scoring interface in my SvelteKit application. This is a comprehensive refactoring to create a professional, single-screen, no-scroll darts scoring interface that matches commercial darts apps.

## CRITICAL REQUIREMENTS

1. **NO SCROLLING** - Everything must fit on screen on any device
2. **Remove statistics during gameplay** - Only show at game end
3. **Fix multiplier workflow** - Single points work WITHOUT selecting multiplier first
4. **Comprehensive undo/redo** - Track full game state for multiple levels
5. **Clean layout** - Match professional darts scoring applications
6. **British English** - Use throughout (favourite, colour, etc.)

## CURRENT PROBLEMS TO FIX

### Problem 1: Scrolling Issues
The scores at the top stay "at the top off the screen" causing scrolling. Need to fix layout so everything fits without scrolling.

**Files affected:**
- `src/lib/components/MobileDartEntry.svelte`
- Any components using fixed positioning

### Problem 2: Statistics Clutter
Statistics are shown during gameplay making interface cluttered.

**Remove during gameplay:**
- 3-dart average
- Last score
- Darts thrown counter
- 180s, 140+, 100+ displays
- Any statistics panels

**Show only:**
- Current scores (301/301)
- Legs won
- Turn total
- Current turn's dart scores

### Problem 3: Multiplier Workflow
Currently forces "select multiplier first" workflow with instruction text.

**Change to:**
- Single points work without selecting multiplier
- Multiplier buttons toggle on/off
- Auto-clear after dart thrown
- Remove instruction text "Select multiplier first"

### Problem 4: No Undo/Redo
Need comprehensive undo/redo system.

**Implement:**
- Track full game state for each dart
- Multiple levels of undo (all darts in game)
- Redo stack for undone darts
- Clear redo stack on new dart
- Restore complete state on undo

### Problem 5: Statistics at Game End
No proper display of statistics when game completes.

**Create:**
- `GameCompleteModal.svelte` component
- Show comprehensive statistics for both players
- Winner announcement
- Save & Exit and Play Again buttons

## LAYOUT STRUCTURE (Top to Bottom)

```
┌─────────────────────────────────────┐
│ 1. SCORE HEADER (~80px fixed)       │
│    - Player names                   │
│    - Legs won (0-0)                 │
│    - Active player indicator        │
├─────────────────────────────────────┤
│ 2. CURRENT SCORES (~120px fixed)    │
│    - Large numbers: 301 | 301       │
│    - Start status indicators        │
├─────────────────────────────────────┤
│ 3. TURN DISPLAY (~60px fixed)       │
│    - Turn total                     │
│    - 3 dart slots: [20][20][20]     │
├─────────────────────────────────────┤
│ 4. MULTIPLIER BUTTONS (~56px)       │
│    [MISS] [DOUBLE] [TREBLE]         │
├─────────────────────────────────────┤
│ 5. NUMBER GRID (flex: 1)            │
│    [1 ][2 ][3 ][4 ][5 ]             │
│    [6 ][7 ][8 ][9 ][10]             │
│    [11][12][13][14][15]             │
│    [16][17][18][19][20]             │
│    [BULL 25] [D-BULL 50]            │
├─────────────────────────────────────┤
│ 6. CONTROL BAR (~56px fixed)        │
│    [↶ UNDO] [↷ REDO]                │
└─────────────────────────────────────┘
```

## STEP-BY-STEP IMPLEMENTATION

### Step 1: Create Backup Branch
```bash
git checkout -b feature/darts-scorer-refactor
```

### Step 2: Update Layout CSS in MobileDartEntry.svelte

Replace the main container styling with:

```css
.dart-scorer-app {
  display: flex;
  flex-direction: column;
  height: calc(var(--vh, 1vh) * 100);
  max-height: calc(var(--vh, 1vh) * 100);
  overflow: hidden; /* CRITICAL - NO SCROLLING */
  background: #0f172a;
}

/* Fixed height sections */
.score-header {
  flex-shrink: 0;
  height: 80px;
  background: #1e293b;
}

.current-scores {
  flex-shrink: 0;
  height: 120px;
  background: #1e293b;
}

.turn-display {
  flex-shrink: 0;
  height: 60px;
  background: #1e293b;
}

/* Flexible section that takes remaining space */
.input-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

.multiplier-row {
  flex-shrink: 0;
  height: 56px;
}

.number-grid {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-bar {
  flex-shrink: 0;
  height: 56px;
}
```

Add viewport height fix in script section:
```typescript
onMount(() => {
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  setVH();
  
  return () => {
    window.removeEventListener('resize', setVH);
    window.removeEventListener('orientationchange', setVH);
  };
});
```

### Step 3: Remove Statistics During Gameplay

In `MobileDartEntry.svelte`, find and remove/comment out:

```svelte
<!-- REMOVE THIS -->
{#if !gameComplete}
  <div class="stats-panel">
    <div class="stat-item">
      <span>3-DART AVG.</span>
      <span>{threeDartAverage}</span>
    </div>
    <div class="stat-item">
      <span>LAST SCORE</span>
      <span>{lastScore}</span>
    </div>
    <div class="stat-item">
      <span>DARTS THROWN</span>
      <span>{dartsThrown}</span>
    </div>
  </div>
{/if}

<!-- KEEP ONLY THIS -->
{#if !gameComplete}
  <div class="turn-display">
    <div class="turn-total">
      <span class="label">Turn Total:</span>
      <span class="value">{currentTurnTotal}</span>
    </div>
    <div class="dart-slots">
      <div class="dart-slot">{dart1?.dartScore || '-'}</div>
      <div class="dart-slot">{dart2?.dartScore || '-'}</div>
      <div class="dart-slot">{dart3?.dartScore || '-'}</div>
    </div>
  </div>
{/if}
```

### Step 4: Fix Multiplier Workflow in NumberGrid.svelte

**Find and replace this section:**

OLD CODE (Remove):
```svelte
<script>
  let inputState: 'multiplier' | 'number' | 'submitting' = 'multiplier';
  let selectedModifier: 'single' | 'double' | 'treble' = 'single';
  
  function selectModifier(modifier: 'single' | 'double' | 'treble') {
    selectedModifier = modifier;
    inputState = 'number';
  }
  
  function selectNumber(number: number) {
    if (inputState !== 'number') {
      // Block number selection
      return;
    }
    selectedNumber = number;
    inputState = 'submitting';
    submitScore();
  }
</script>

<!-- Instruction text -->
{#if inputState === 'multiplier'}
  <p>Select Multiplier First</p>
{/if}
```

NEW CODE (Implement):
```svelte
<script>
  let activeMultiplier: 'double' | 'treble' | null = null;
  
  // Multiplier toggle
  function handleMultiplierClick(type: 'double' | 'treble') {
    if (activeMultiplier === type) {
      activeMultiplier = null; // Toggle off
    } else {
      activeMultiplier = type; // Toggle on
    }
  }
  
  // Number selection works without multiplier
  function handleNumberClick(num: number) {
    const multiplier = activeMultiplier || 'single';
    const score = calculateScore(num, multiplier);
    
    dispatch('numberSelect', {
      number: num,
      multiplier,
      score
    });
    
    // Auto-clear multiplier after use
    if (activeMultiplier) {
      activeMultiplier = null;
    }
  }
  
  function calculateScore(num: number, mult: string): number {
    if (num === 0) return 0;
    if (num === 25) return mult === 'double' ? 50 : 25;
    return num * (mult === 'single' ? 1 : mult === 'double' ? 2 : 3);
  }
</script>

<!-- NO instruction text -->
<!-- Just clean buttons -->
```

Update button classes:
```svelte
<button 
  class="multiplier-btn {activeMultiplier === 'double' ? 'active' : ''}"
  on:click={() => handleMultiplierClick('double')}
>
  DOUBLE
</button>

<button 
  class="multiplier-btn {activeMultiplier === 'treble' ? 'active' : ''}"
  on:click={() => handleMultiplierClick('treble')}
>
  TREBLE
</button>
```

### Step 5: Implement Undo/Redo System

In `src/lib/stores/scoringStores.ts`, add:

```typescript
// Add new stores
export const dartHistory = writable<DartHistoryItem[]>([]);
export const redoStack = writable<DartHistoryItem[]>([]);

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

// Add to scoringActions object
export const scoringActions = {
  // ... existing actions ...
  
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
  },
  
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
    }
  },
  
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
      
      // Restore game state AFTER this dart
      const newScore = redoItem!.gameState.currentThrower === 'home'
        ? redoItem!.gameState.homeScore
        : redoItem!.gameState.awayScore;
      
      gameState.update(state => ({
        ...state,
        homeScore: redoItem!.gameState.homeScore,
        awayScore: redoItem!.gameState.awayScore,
        currentThrower: redoItem!.gameState.currentThrower,
        dartsThrown: redoItem!.gameState.dartsThrown
      }));
      
      // Re-add the dart to turn
      currentTurnDarts.update(darts => [...darts, redoItem!.dart]);
      currentTurnTotal.update(total => total + redoItem!.dart.dartScore);
    }
  },
  
  clearHistory: () => {
    dartHistory.set([]);
    redoStack.set([]);
  }
};
```

### Step 6: Wire Up Undo/Redo in UI

In `MobileDartEntry.svelte`, add:

```svelte
<script>
  import { dartHistory, redoStack } from '$lib/stores/scoringStores';
  
  let canUndo = false;
  let canRedo = false;
  
  // Subscribe to history stores
  $: canUndo = $dartHistory.length > 0;
  $: canRedo = $redoStack.length > 0;
  
  function handleUndo() {
    scoringActions.undoLastDart();
  }
  
  function handleRedo() {
    scoringActions.redoLastDart();
  }
</script>

<!-- Control bar -->
<div class="control-bar">
  <button 
    class="control-btn undo"
    on:click={handleUndo}
    disabled={!canUndo}
  >
    ↶ UNDO
  </button>
  
  <button 
    class="control-btn redo"
    on:click={handleRedo}
    disabled={!canRedo}
  >
    ↷ REDO
  </button>
</div>
```

Update the dart throwing function to add to history:
```typescript
function addDart(dartScore: number, isDouble: boolean) {
  // ... existing validation ...
  
  // Create dart object
  const dart: DartThrow = {
    id: crypto.randomUUID(),
    dartScore,
    isDoubleAttempt: isDouble,
    // ... other properties
  };
  
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
  
  // Then update state normally
  // ... rest of function
}
```

### Step 7: Create GameCompleteModal Component

Create new file: `src/lib/components/GameCompleteModal.svelte`

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PlayerGameStats } from '$lib/types/scoring';
  
  export let winner: 'home' | 'away';
  export let homeStats: PlayerGameStats;
  export let awayStats: PlayerGameStats;
  export let homeLegsWon: number;
  export let awayLegsWon: number;
  
  const dispatch = createEventDispatcher();
  
  const winnerName = winner === 'home' ? homeStats.playerName : awayStats.playerName;
</script>

<div class="modal-overlay" on:click|self={() => dispatch('close')}>
  <div class="modal-content">
    <!-- Winner Announcement -->
    <div class="winner-section">
      <h2>🎯 Game Complete!</h2>
      <h3>{winnerName} Wins!</h3>
      <p class="final-score">{homeLegsWon} - {awayLegsWon}</p>
    </div>
    
    <!-- Statistics Grid -->
    <div class="stats-container">
      <!-- Home Player -->
      <div class="player-stats">
        <h4>{homeStats.playerName}</h4>
        <div class="stats-grid">
          <div class="stat">
            <span class="label">3-Dart Avg</span>
            <span class="value">{homeStats.average.toFixed(2)}</span>
          </div>
          <div class="stat">
            <span class="label">Total Darts</span>
            <span class="value">{homeStats.totalDarts}</span>
          </div>
          <div class="stat">
            <span class="label">180s</span>
            <span class="value">{homeStats.scores180}</span>
          </div>
          <div class="stat">
            <span class="label">140+</span>
            <span class="value">{homeStats.scores140Plus}</span>
          </div>
          <div class="stat">
            <span class="label">100+</span>
            <span class="value">{homeStats.scores100Plus}</span>
          </div>
          <div class="stat">
            <span class="label">Checkout %</span>
            <span class="value">{homeStats.checkoutPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- Away Player -->
      <div class="player-stats">
        <h4>{awayStats.playerName}</h4>
        <div class="stats-grid">
          <div class="stat">
            <span class="label">3-Dart Avg</span>
            <span class="value">{awayStats.average.toFixed(2)}</span>
          </div>
          <div class="stat">
            <span class="label">Total Darts</span>
            <span class="value">{awayStats.totalDarts}</span>
          </div>
          <div class="stat">
            <span class="label">180s</span>
            <span class="value">{awayStats.scores180}</span>
          </div>
          <div class="stat">
            <span class="label">140+</span>
            <span class="value">{awayStats.scores140Plus}</span>
          </div>
          <div class="stat">
            <span class="label">100+</span>
            <span class="value">{awayStats.scores100Plus}</span>
          </div>
          <div class="stat">
            <span class="label">Checkout %</span>
            <span class="value">{awayStats.checkoutPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="actions">
      <button class="btn-primary" on:click={() => dispatch('saveAndExit')}>
        Save & Exit
      </button>
      <button class="btn-secondary" on:click={() => dispatch('playAgain')}>
        Play Again
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }
  
  .modal-content {
    background: #1f2937;
    border-radius: 16px;
    padding: 24px;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    color: #f9fafb;
  }
  
  .winner-section {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 2px solid #374151;
  }
  
  .winner-section h2 {
    font-size: 28px;
    color: #f59e0b;
    margin-bottom: 8px;
  }
  
  .winner-section h3 {
    font-size: 24px;
    color: #10b981;
  }
  
  .final-score {
    font-size: 32px;
    font-weight: bold;
    margin-top: 8px;
  }
  
  .stats-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 24px;
  }
  
  .player-stats h4 {
    font-size: 20px;
    text-align: center;
    margin-bottom: 16px;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .stat {
    background: #374151;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .stat .label {
    font-size: 12px;
    color: #9ca3af;
  }
  
  .stat .value {
    font-size: 20px;
    font-weight: bold;
  }
  
  .divider {
    height: 2px;
    background: #374151;
  }
  
  .actions {
    display: flex;
    gap: 12px;
  }
  
  .actions button {
    flex: 1;
    padding: 16px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 8px;
    border: none;
    cursor: pointer;
  }
  
  .btn-primary {
    background: #f59e0b;
    color: #000;
  }
  
  .btn-secondary {
    background: #374151;
    color: #f9fafb;
  }
</style>
```

### Step 8: Integrate GameCompleteModal

In `MobileDartEntry.svelte`:

```svelte
<script>
  import GameCompleteModal from './GameCompleteModal.svelte';
  
  // ... existing code ...
</script>

{#if currentGameState.gameComplete}
  <GameCompleteModal
    {winner}
    {homeStats}
    {awayStats}
    {homeLegsWon}
    {awayLegsWon}
    on:saveAndExit={handleSaveAndExit}
    on:playAgain={handlePlayAgain}
    on:close={handleModalClose}
  />
{/if}
```

### Step 9: Test Implementation

Run these tests:

```bash
# Start dev server
npm run dev

# In browser, test:
# 1. Open on mobile viewport (iPhone SE, iPhone 15 Pro)
# 2. Verify no scrolling
# 3. Test multiplier toggle
# 4. Test single points without multiplier
# 5. Test undo/redo multiple times
# 6. Complete a game and check modal
# 7. Test in landscape orientation
```

### Step 10: Commit Changes

```bash
git add .
git commit -m "refactor: Professional darts scorer interface

- Remove scrolling with flex layout
- Hide statistics during gameplay
- Fix multiplier workflow (toggle, no forced selection)
- Implement comprehensive undo/redo system
- Add GameCompleteModal for end-game statistics
- Improve responsive design for all devices
- Use British English spelling throughout"

git push origin feature/darts-scorer-refactor
```

## TESTING CHECKLIST

Before marking as complete, verify:

- [ ] No scrolling on iPhone SE (375px width)
- [ ] No scrolling on iPhone 15 Pro (393px width)
- [ ] No scrolling on iPad (768px width)
- [ ] Layout works in landscape orientation
- [ ] Tapping number without multiplier = single point
- [ ] Tapping DOUBLE, then number = double points
- [ ] Tapping TREBLE, then number = treble points
- [ ] Multiplier auto-clears after dart thrown
- [ ] Tapping active multiplier again turns it off
- [ ] No statistics visible during gameplay
- [ ] Statistics modal appears when game completes
- [ ] UNDO button removes last dart
- [ ] REDO button restores undone dart
- [ ] Multiple undo levels work
- [ ] Redo stack clears on new dart
- [ ] All touch targets ≥ 44px × 44px
- [ ] British English used (e.g., "Favourite" not "Favorite")

## SUCCESS CRITERIA

✅ Interface looks like professional darts apps
✅ No scrolling required on any device
✅ Clean, uncluttered gameplay
✅ Intuitive multiplier system
✅ Full undo/redo functionality
✅ Comprehensive end-game statistics
✅ Responsive on all screen sizes

## NOTES

- All buttons must have `touch-action: manipulation`
- Minimum touch target: 44px × 44px
- Use flexbox, NOT fixed positioning
- Test on actual mobile device if possible
- Safe area insets for devices with notches

Begin implementation now. Work through steps 1-10 in order. Ask questions if anything is unclear.
```

---

## 🔄 If You Need to Continue Later

If Claude CLI needs to pause and continue later, use this continuation prompt:

```
Continue with the darts scorer refactoring. I've completed steps [X-Y]. 

Current status:
- [ ] Step 1: Backup branch
- [ ] Step 2: Layout CSS
- [ ] Step 3: Remove statistics
- [ ] Step 4: Fix multiplier workflow
- [ ] Step 5: Undo/redo system
- [ ] Step 6: Wire up undo/redo UI
- [ ] Step 7: Create GameCompleteModal
- [ ] Step 8: Integrate modal
- [ ] Step 9: Test implementation
- [ ] Step 10: Commit changes

Continue with step [next step number].
```

---

## 💡 Quick Reference

### Key Files to Modify
1. `src/lib/components/MobileDartEntry.svelte` - Main interface
2. `src/lib/components/NumberGrid.svelte` - Multiplier workflow
3. `src/lib/stores/scoringStores.ts` - Undo/redo system
4. `src/lib/components/GameCompleteModal.svelte` - NEW FILE (create this)

### Key Changes
- **Layout**: Flex column, no fixed positioning, no scrolling
- **Statistics**: Remove during gameplay, show in modal at end
- **Multipliers**: Toggle on/off, auto-clear, no forced selection
- **Undo/Redo**: Full state tracking, multiple levels
- **British English**: Throughout (favourite, colour, centre, etc.)

### Testing Focus
- No scrolling on any device
- Multiplier toggle behaviour
- Undo/redo functionality
- Statistics modal appearance
- Touch target sizes (44px minimum)

---

## END OF PROMPT

This prompt is complete and ready to use with Claude CLI. Copy the section marked "PROMPT FOR CLAUDE CLI" and paste it into your terminal.