<!--
  ============================================================================
  NUMBER GRID - Touch-Optimized Number Pad for Dart Score Entry
  ============================================================================

  PURPOSE:
  Provides a mobile-friendly number grid for entering dart scores.
  Users tap numbers 0-20 with optional Double/Treble multipliers.

  WHAT IT DOES:
  1. Displays numbers 1-20 in 4×5 grid
  2. Provides DOUBLE/TREBLE toggle buttons
  3. Handles special scores (MISS=0, BULL=25, D-BULL=50)
  4. Emits numberSelect events to parent component
  5. Auto-clears multiplier after each use

  USER FLOW:
  ┌──────────────────────────────────────────────────┐
  │ 1. User wants to enter T20 (triple 20 = 60)      │
  │    ↓                                              │
  │ 2. Taps TREBLE button (highlights orange)        │
  │    ↓                                              │
  │ 3. Taps 20 button                                 │
  │    ↓                                              │
  │ 4. Component emits { number: 20, modifier: 'treble' } │
  │    ↓                                              │
  │ 5. TREBLE automatically deactivates              │
  │    ↓                                              │
  │ 6. Parent calculates score: 20 × 3 = 60          │
  └──────────────────────────────────────────────────┘

  USED BY:
  - MobileDartEntry.svelte (main scoring UI)

  EMITS:
  - numberSelect: { number: 0-25, modifier: 'single' | 'double' | 'treble' }

  EXAMPLES:
  - Tap 20 → { number: 20, modifier: 'single' } = 20 points
  - Tap DOUBLE, then 16 → { number: 16, modifier: 'double' } = 32 points
  - Tap TREBLE, then 20 → { number: 20, modifier: 'treble' } = 60 points
  - Tap MISS → { number: 0, modifier: 'single' } = 0 points
  - Tap BULL 25 → { number: 25, modifier: 'single' } = 25 points
  - Tap D-BULL 50 → { number: 25, modifier: 'double' } = 50 points
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /**
   * EVENT DISPATCHER - Communicate with Parent
   *
   * EMITS: numberSelect event with { number, modifier }
   *
   * Parent component (MobileDartEntry) listens for this event
   * and calculates the actual dart score.
   */
  const dispatch = createEventDispatcher<{
    numberSelect: { number: number; modifier: 'single' | 'double' | 'treble' };
  }>();

  /**
   * GRID NUMBERS - Layout of Number Buttons
   *
   * Arranged in 4 rows of 5 numbers each (1-20 total).
   *
   * LAYOUT:
   * Row 1: 1  2  3  4  5
   * Row 2: 6  7  8  9  10
   * Row 3: 11 12 13 14 15
   * Row 4: 16 17 18 19 20
   *
   * WHY THIS LAYOUT?
   * Not dartboard order (which would be 20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5).
   * Sequential layout is easier to find numbers quickly on mobile.
   */
  const gridNumbers = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20]
  ];

  /**
   * ACTIVE MULTIPLIER - Toggle State for Double/Treble
   *
   * VALUES:
   * - null: No multiplier active (single)
   * - 'double': Double multiplier active (×2)
   * - 'treble': Treble multiplier active (×3)
   *
   * BEHAVIOR:
   * - Tap DOUBLE/TREBLE → Activates multiplier (highlights orange)
   * - Tap again → Deactivates (toggle off)
   * - Tap any number → Uses multiplier then auto-clears
   *
   * WHY TOGGLE SYSTEM?
   * Users can easily see if multiplier is active (orange highlight).
   * Can change mind by tapping multiplier again before selecting number.
   */
  let activeMultiplier: 'double' | 'treble' | null = null;

  /**
   * HANDLE MULTIPLIER CLICK - Toggle Double/Treble
   *
   * CALLED BY: DOUBLE or TREBLE button click
   *
   * BEHAVIOR:
   * - If multiplier already active → Deactivate (toggle off)
   * - If multiplier not active → Activate (toggle on)
   * - Switching between DOUBLE/TREBLE replaces active multiplier
   *
   * EXAMPLES:
   * - Tap DOUBLE → activeMultiplier = 'double'
   * - Tap DOUBLE again → activeMultiplier = null (off)
   * - Tap DOUBLE, then TREBLE → activeMultiplier = 'treble' (switches)
   */
  function handleMultiplierClick(type: 'double' | 'treble') {
    if (activeMultiplier === type) {
      activeMultiplier = null; // Toggle off
    } else {
      activeMultiplier = type; // Toggle on or switch
    }
  }

  /**
   * HANDLE NUMBER CLICK - Process Number Button Tap
   *
   * CALLED BY: Any number button (1-20) click
   *
   * FLOW:
   * 1. Check if multiplier is active
   * 2. If active, use it; if not, use 'single'
   * 3. Dispatch numberSelect event to parent
   * 4. Auto-clear multiplier (ready for next dart)
   *
   * EXAMPLES:
   * - User taps 20 (no multiplier) →
   *   dispatch({ number: 20, modifier: 'single' })
   *
   * - User taps DOUBLE, then 16 →
   *   activeMultiplier = 'double'
   *   dispatch({ number: 16, modifier: 'double' })
   *   activeMultiplier = null (cleared)
   *
   * - User taps TREBLE, then 20 →
   *   activeMultiplier = 'treble'
   *   dispatch({ number: 20, modifier: 'treble' })
   *   activeMultiplier = null (cleared)
   */
  function handleNumberClick(num: number) {
    const multiplier = activeMultiplier || 'single';

    dispatch('numberSelect', {
      number: num,
      modifier: multiplier as 'single' | 'double' | 'treble'
    });

    // Auto-clear multiplier after use
    if (activeMultiplier) {
      activeMultiplier = null;
    }
  }

  /**
   * HANDLE SPECIAL SCORE - Process MISS, BULL, or D-BULL
   *
   * CALLED BY: MISS, BULL 25, or D-BULL 50 button click
   *
   * SPECIAL SCORES:
   * - MISS: number=0, modifier='single' (0 points)
   * - BULL 25: number=25, modifier='single' (25 points)
   * - D-BULL 50: number=25, modifier='double' (50 points)
   *
   * WHY number=25 FOR BOTH BULLS?
   * Bullseye is technically the "25" segment doubled.
   * Single bull = 25, Double bull = 25×2 = 50.
   *
   * NOTE: These buttons bypass the multiplier system.
   * You can't apply DOUBLE/TREBLE to these special scores.
   */
  function handleSpecialScore(number: number, modifier: 'single' | 'double' | 'treble') {
    dispatch('numberSelect', { number, modifier });
    activeMultiplier = null; // Clear any active multiplier
  }
</script>

<!--
  ============================================================================
  TEMPLATE - UI Layout
  ============================================================================

  STRUCTURE:
  1. Multiplier row (MISS, DOUBLE, TREBLE)
  2. 4×5 number grid (1-20)
  3. Bull row (BULL 25, D-BULL 50)

  TOUCH OPTIMIZATIONS:
  - All buttons min 44px height (Apple's recommended touch target)
  - touch-action: manipulation (prevents double-tap zoom)
  - -webkit-tap-highlight-color: transparent (removes blue flash)
  - user-select: none (prevents text selection on hold)

  VISUAL FEEDBACK:
  - Active multiplier: Orange background + scale up
  - Button press: Scale down to 95%
  - MISS button: Red background
  - BULL button: Blue background
  - D-BULL button: Green background
-->

<!-- Main Container -->
<div class="number-grid-container">

  <!-- ============= MULTIPLIER ROW ============= -->
  <!--
    Top row with 3 buttons:
    - MISS: Shortcut for 0 (dart missed board entirely)
    - DOUBLE: Activates double multiplier (×2)
    - TREBLE: Activates treble multiplier (×3)
  -->
  <div class="multiplier-row">
    <!-- MISS Button (0 points) -->
    <button
      on:click={() => handleSpecialScore(0, 'single')}
      class="multiplier-btn special miss-btn"
      style="touch-action: manipulation;"
    >
      MISS
    </button>

    <!-- DOUBLE Button (multiplier toggle) -->
    <button
      class="multiplier-btn {activeMultiplier === 'double' ? 'active' : ''}"
      on:click={() => handleMultiplierClick('double')}
      style="touch-action: manipulation;"
    >
      DOUBLE
    </button>

    <!-- TREBLE Button (multiplier toggle) -->
    <button
      class="multiplier-btn {activeMultiplier === 'treble' ? 'active' : ''}"
      on:click={() => handleMultiplierClick('treble')}
      style="touch-action: manipulation;"
    >
      TREBLE
    </button>
  </div>

  <!-- ============= NUMBER GRID (1-20) ============= -->
  <!--
    4 rows × 5 columns = 20 buttons
    Each button shows its number and emits on click
  -->
  <div class="number-grid">
    {#each gridNumbers as row}
      {#each row as number}
        <button
          on:click={() => handleNumberClick(number)}
          class="number-btn"
          style="touch-action: manipulation;"
        >
          {number}
        </button>
      {/each}
    {/each}
  </div>

  <!-- ============= BULL ROW ============= -->
  <!--
    Bottom row with bullseye options:
    - BULL 25: Single bull (25 points)
    - D-BULL 50: Double bull / Bullseye (50 points)
  -->
  <div class="bull-row">
    <!-- Single Bull (25) -->
    <button
      on:click={() => handleSpecialScore(25, 'single')}
      class="bull-btn single-bull"
      style="touch-action: manipulation;"
    >
      BULL 25
    </button>

    <!-- Double Bull (50) -->
    <button
      on:click={() => handleSpecialScore(25, 'double')}
      class="bull-btn double-bull"
      style="touch-action: manipulation;"
    >
      D-BULL 50
    </button>
  </div>
</div>

<!--
  ============================================================================
  STYLES - Component Styling
  ============================================================================

  LAYOUT SYSTEM:
  - Flexbox column layout with gaps
  - Grid layout for buttons (3-col, 5-col, 2-col)
  - Responsive sizing with flex properties

  COLOR SCHEME:
  - Number buttons: Dark gray (#1f2937)
  - Multiplier buttons: Medium gray (#374151)
  - Active multiplier: Orange (#f59e0b)
  - MISS button: Red (#ef4444)
  - Single bull: Blue (#3b82f6)
  - Double bull: Green (#10b981)

  INTERACTIONS:
  - Hover: None (touch devices don't have hover)
  - Active (press): Scale down to 95% + color change
  - Multiplier active: Scale up to 105% + orange background
  - Focus visible: Orange outline (keyboard navigation)

  ACCESSIBILITY:
  - Keyboard focus visible with outline
  - Touch targets min 44px height
  - High contrast colors
  - Clear visual states
-->

<style>
  /* Main container - vertical stack with gaps */
  .number-grid-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }

  /* ============= MULTIPLIER ROW ============= */
  /* Top row: MISS, DOUBLE, TREBLE */
  .multiplier-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 3 equal columns */
    gap: 8px;
    flex-shrink: 0; /* Don't shrink */
    height: 56px;
  }

  /* Multiplier button base styles */
  .multiplier-btn {
    background: #374151; /* Gray-700 */
    color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    font-weight: bold;
    font-size: 14px;
    min-height: 44px; /* Apple touch target minimum */
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent; /* Remove blue flash on tap */
    user-select: none; /* Prevent text selection on hold */
  }

  /* Button press effect */
  .multiplier-btn:active {
    transform: scale(0.95); /* Shrink slightly */
  }

  /* Active multiplier state (DOUBLE or TREBLE selected) */
  .multiplier-btn.active {
    background: #f59e0b; /* Orange-500 */
    border-color: #fbbf24; /* Orange-400 */
    transform: scale(1.05); /* Grow slightly */
  }

  /* MISS button (special red styling) */
  .multiplier-btn.special {
    background: #ef4444; /* Red-500 */
  }

  .multiplier-btn.special:active {
    background: #dc2626; /* Red-600 */
  }

  /* ============= NUMBER GRID ============= */
  /* 4×5 grid of numbers 1-20 */
  .number-grid {
    flex: 1; /* Take remaining space */
    display: grid;
    grid-template-columns: repeat(5, 1fr); /* 5 equal columns */
    gap: 6px;
    min-height: 0; /* Allow flexbox shrinking */
  }

  /* Number button styles */
  .number-btn {
    background: #1f2937; /* Gray-800 */
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 20px;
    min-height: 44px; /* Apple touch target minimum */
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* Number button press effect */
  .number-btn:active {
    background: #f59e0b; /* Orange flash on tap */
    transform: scale(0.95); /* Shrink */
  }

  /* ============= BULL ROW ============= */
  /* Bottom row: BULL 25, D-BULL 50 */
  .bull-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2 equal columns */
    gap: 8px;
    flex-shrink: 0; /* Don't shrink */
    height: 56px;
  }

  /* Bull button base styles */
  .bull-btn {
    background: #3b82f6; /* Blue-500 (single bull default) */
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 14px;
    min-height: 44px;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* Bull button press effect */
  .bull-btn:active {
    transform: scale(0.95);
  }

  /* Double bull specific (green) */
  .double-bull {
    background: #10b981; /* Green-500 */
  }

  .double-bull:active {
    background: #059669; /* Green-600 */
  }

  /* Single bull press */
  .single-bull:active {
    background: #2563eb; /* Blue-600 */
  }

  /* ============= ACCESSIBILITY ============= */
  /* Keyboard focus indicator */
  button:focus-visible {
    outline: 3px solid #f97316; /* Orange-500 */
    outline-offset: 2px;
  }
</style>

<!--
  ============================================================================
  END OF NUMBERGRID COMPONENT
  ============================================================================

  SUMMARY - What This Component Does:

  1. **Number Entry Interface**
     - Provides touch-friendly buttons for dart scores
     - 4×5 grid for numbers 1-20
     - Special buttons for MISS, BULL, D-BULL

  2. **Multiplier System**
     - Toggle buttons for DOUBLE and TREBLE
     - Visual feedback (orange highlight) when active
     - Auto-clears after each number selection

  3. **Event Communication**
     - Emits numberSelect event to parent
     - Sends { number, modifier } payload
     - Parent component calculates final score

  4. **Mobile Optimization**
     - Touch-friendly sizing (min 44px targets)
     - No double-tap zoom (touch-action: manipulation)
     - No text selection (user-select: none)
     - Scale animations for visual feedback

  5. **User Experience**
     - Clear visual states (active, pressed)
     - Color-coded buttons (MISS=red, BULL=blue, D-BULL=green)
     - Sequential number layout (easier to find than dartboard order)
     - Keyboard accessible with focus indicators

  KEY CONCEPTS:
  - Event dispatcher for parent communication
  - Toggle state for multipliers
  - Auto-clear multiplier after use
  - Responsive grid layout
  - Touch-optimized CSS

  INTEGRATION:
  - Used by MobileDartEntry.svelte
  - Emits to handleNumberSelect() function
  - Parent calculates: number × modifier

  EXAMPLES:
  - TREBLE + 20 → { number: 20, modifier: 'treble' } → Parent: 20×3 = 60
  - DOUBLE + 16 → { number: 16, modifier: 'double' } → Parent: 16×2 = 32
  - 20 alone → { number: 20, modifier: 'single' } → Parent: 20×1 = 20
  - MISS → { number: 0, modifier: 'single' } → Parent: 0
  - D-BULL → { number: 25, modifier: 'double' } → Parent: 25×2 = 50
-->
