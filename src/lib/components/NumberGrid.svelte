<!-- NumberGrid.svelte - Professional mobile-first number grid with toggle multipliers -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    numberSelect: { number: number; modifier: 'single' | 'double' | 'treble' };
  }>();

  // Grid numbers arranged in dartboard-friendly layout
  const gridNumbers = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20]
  ];

  // Active multiplier state (toggle system)
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

    dispatch('numberSelect', {
      number: num,
      modifier: multiplier as 'single' | 'double' | 'treble'
    });

    // Auto-clear multiplier after use
    if (activeMultiplier) {
      activeMultiplier = null;
    }
  }

  // Handle special scores
  function handleSpecialScore(number: number, modifier: 'single' | 'double' | 'treble') {
    dispatch('numberSelect', { number, modifier });
    activeMultiplier = null;
  }
</script>

<!-- Main Number Grid -->
<div class="number-grid-container">
  <!-- Multiplier Buttons Row -->
  <div class="multiplier-row">
    <button
      on:click={() => handleSpecialScore(0, 'single')}
      class="multiplier-btn special miss-btn"
      style="touch-action: manipulation;"
    >
      MISS
    </button>

    <button
      class="multiplier-btn {activeMultiplier === 'double' ? 'active' : ''}"
      on:click={() => handleMultiplierClick('double')}
      style="touch-action: manipulation;"
    >
      DOUBLE
    </button>

    <button
      class="multiplier-btn {activeMultiplier === 'treble' ? 'active' : ''}"
      on:click={() => handleMultiplierClick('treble')}
      style="touch-action: manipulation;"
    >
      TREBLE
    </button>
  </div>

  <!-- Number Grid -->
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

  <!-- Bull Buttons Row -->
  <div class="bull-row">
    <button
      on:click={() => handleSpecialScore(25, 'single')}
      class="bull-btn single-bull"
      style="touch-action: manipulation;"
    >
      BULL 25
    </button>

    <button
      on:click={() => handleSpecialScore(25, 'double')}
      class="bull-btn double-bull"
      style="touch-action: manipulation;"
    >
      D-BULL 50
    </button>
  </div>
</div>

<style>
  .number-grid-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }

  .multiplier-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    flex-shrink: 0;
    height: 56px;
  }

  .multiplier-btn {
    background: #374151;
    color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    font-weight: bold;
    font-size: 14px;
    min-height: 44px;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .multiplier-btn:active {
    transform: scale(0.95);
  }

  .multiplier-btn.active {
    background: #f59e0b;
    border-color: #fbbf24;
    transform: scale(1.05);
  }

  .multiplier-btn.special {
    background: #ef4444;
  }

  .multiplier-btn.special:active {
    background: #dc2626;
  }

  .number-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    min-height: 0;
  }

  .number-btn {
    background: #1f2937;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 20px;
    min-height: 44px;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .number-btn:active {
    background: #f59e0b;
    transform: scale(0.95);
  }

  .bull-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    flex-shrink: 0;
    height: 56px;
  }

  .bull-btn {
    background: #3b82f6;
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

  .bull-btn:active {
    transform: scale(0.95);
  }

  .double-bull {
    background: #10b981;
  }

  .double-bull:active {
    background: #059669;
  }

  .single-bull:active {
    background: #2563eb;
  }

  button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }
</style>
