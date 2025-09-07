<!-- NumberGrid.svelte - Professional mobile-first number grid with large touch targets -->
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

  // Current selection state
  let selectedNumber: number | null = null;
  let selectedModifier: 'single' | 'double' | 'treble' = 'single';

  // Handle number selection
  function selectNumber(number: number) {
    selectedNumber = number;
    // Auto-submit common scores immediately
    if (selectedModifier === 'single' && [0, 25].includes(number)) {
      submitScore();
    }
  }

  // Handle modifier selection
  function selectModifier(modifier: 'single' | 'double' | 'treble') {
    selectedModifier = modifier;
    // If we have a number selected, submit immediately
    if (selectedNumber !== null) {
      submitScore();
    }
  }

  // Submit the selected score
  function submitScore() {
    if (selectedNumber !== null) {
      dispatch('numberSelect', {
        number: selectedNumber,
        modifier: selectedModifier
      });
      clearSelection();
    }
  }

  // Clear current selection
  function clearSelection() {
    selectedNumber = null;
    selectedModifier = 'single';
  }

  // Handle special scores
  function handleSpecialScore(score: number) {
    if (score === 0) {
      dispatch('numberSelect', { number: 0, modifier: 'single' });
    } else if (score === 25) {
      dispatch('numberSelect', { number: 25, modifier: 'single' });
    } else if (score === 50) {
      dispatch('numberSelect', { number: 25, modifier: 'double' });
    }
  }

  // Calculate display score
  function getDisplayScore(number: number, modifier: 'single' | 'double' | 'treble'): number {
    if (number === 25) {
      return modifier === 'double' ? 50 : 25;
    }
    return number * (modifier === 'single' ? 1 : modifier === 'double' ? 2 : 3);
  }

  // Validate if score combination is possible
  function isValidScore(number: number, modifier: 'single' | 'double' | 'treble'): boolean {
    // All numbers 1-20 can be single, double, treble
    if (number >= 1 && number <= 20) return true;
    // Bull can only be single (25) or double (50)
    if (number === 25) return modifier !== 'treble';
    // Miss is always 0
    if (number === 0) return modifier === 'single';
    return false;
  }
</script>

<!-- Main Number Grid -->
<div class="bg-gray-900 p-4 rounded-xl">
  <!-- Score Preview -->
  {#if selectedNumber !== null}
    <div class="text-center mb-4 p-3 bg-orange-500 rounded-lg animate-pulse">
      <p class="text-white text-2xl font-bold">
        {getDisplayScore(selectedNumber, selectedModifier)}
      </p>
      <p class="text-orange-100 text-sm">
        {selectedModifier.toUpperCase()} {selectedNumber}
      </p>
    </div>
  {/if}

  <!-- Number Grid -->
  <div class="grid grid-cols-5 gap-2 mb-4">
    {#each gridNumbers as row}
      {#each row as number}
        <button
          on:click={() => selectNumber(number)}
          class="aspect-square rounded-xl text-white font-bold text-xl 
                 min-h-[60px] min-w-[60px] transition-all duration-150
                 {selectedNumber === number 
                   ? 'bg-orange-500 scale-105 shadow-lg' 
                   : 'bg-gray-700 hover:bg-gray-600 active:scale-95'}
                 active:bg-orange-400"
          style="touch-action: manipulation;"
        >
          {number}
        </button>
      {/each}
    {/each}
  </div>

  <!-- Special Scores Row -->
  <div class="grid grid-cols-3 gap-2 mb-4">
    <button
      on:click={() => handleSpecialScore(0)}
      class="py-4 px-3 rounded-xl bg-red-600 hover:bg-red-500 
             active:scale-95 active:bg-red-400 text-white font-bold
             min-h-[60px] transition-all duration-150"
      style="touch-action: manipulation;"
    >
      MISS
      <div class="text-sm opacity-90">0</div>
    </button>
    
    <button
      on:click={() => handleSpecialScore(25)}
      class="py-4 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 
             active:scale-95 active:bg-blue-400 text-white font-bold
             min-h-[60px] transition-all duration-150"
      style="touch-action: manipulation;"
    >
      BULL
      <div class="text-sm opacity-90">25</div>
    </button>
    
    <button
      on:click={() => handleSpecialScore(50)}
      class="py-4 px-3 rounded-xl bg-green-600 hover:bg-green-500 
             active:scale-95 active:bg-green-400 text-white font-bold
             min-h-[60px] transition-all duration-150"
      style="touch-action: manipulation;"
    >
      D-BULL
      <div class="text-sm opacity-90">50</div>
    </button>
  </div>

  <!-- Modifier Buttons -->
  <div class="grid grid-cols-3 gap-2 mb-4">
    {#each ['single', 'double', 'treble'] as modifier}
      <button
        on:click={() => selectModifier(modifier)}
        class="py-3 px-4 rounded-xl font-bold text-lg min-h-[60px] 
               transition-all duration-150
               {selectedModifier === modifier 
                 ? 'bg-orange-500 text-white scale-105 shadow-lg' 
                 : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95'}
               active:bg-orange-400"
        style="touch-action: manipulation;"
      >
        {modifier.charAt(0).toUpperCase() + modifier.slice(1)}
      </button>
    {/each}
  </div>

  <!-- Action Buttons -->
  <div class="grid grid-cols-2 gap-3">
    <button
      on:click={submitScore}
      disabled={selectedNumber === null}
      class="py-4 px-6 rounded-xl font-bold text-lg min-h-[60px]
             transition-all duration-150
             {selectedNumber !== null 
               ? 'bg-green-600 hover:bg-green-500 active:bg-green-400 text-white active:scale-95' 
               : 'bg-gray-400 text-gray-600 cursor-not-allowed'}
             disabled:bg-gray-400 disabled:text-gray-600"
      style="touch-action: manipulation;"
    >
      ✓ ENTER
    </button>
    
    <button
      on:click={clearSelection}
      class="py-4 px-6 rounded-xl bg-red-600 hover:bg-red-500 
             active:bg-red-400 active:scale-95 text-white font-bold text-lg
             min-h-[60px] transition-all duration-150"
      style="touch-action: manipulation;"
    >
      ✗ CLEAR
    </button>
  </div>
</div>

<style>
  /* Ensure smooth touch interactions */
  button {
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }

  /* Custom focus states for accessibility */
  button:focus-visible {
    outline: 3px solid #f97316;
    outline-offset: 2px;
  }

  /* Prevent text selection on touch */
  * {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>