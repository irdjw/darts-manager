<!-- CheckoutSuggestions.svelte - Advanced checkout suggestions for finishing -->
<script lang="ts">
  import type { CheckoutRoute } from '../types/scoring';

  // Props
  export let currentScore: number;
  export let dartsRemaining: number;
  export let checkoutRoutes: CheckoutRoute[] = [];
  export let isVisible: boolean = true;
  export let onDismiss: (() => void) | undefined = undefined;

  // Enhanced checkout data for common finishes
  const checkoutDatabase: Record<number, CheckoutRoute[]> = {
    170: [{ description: "T20 → T20 → BULL", difficulty: "Pro", percentage: 95, isHardFinish: true }],
    167: [{ description: "T20 → T19 → BULL", difficulty: "Pro", percentage: 92, isHardFinish: true }],
    164: [{ description: "T20 → T18 → BULL", difficulty: "Pro", percentage: 90, isHardFinish: true }],
    161: [{ description: "T20 → T17 → BULL", difficulty: "Pro", percentage: 88, isHardFinish: true }],
    160: [{ description: "T20 → T20 → D20", difficulty: "Advanced", percentage: 85, isHardFinish: false }],
    158: [{ description: "T20 → T20 → D19", difficulty: "Advanced", percentage: 82, isHardFinish: false }],
    156: [{ description: "T20 → T20 → D18", difficulty: "Advanced", percentage: 80, isHardFinish: false }],
    154: [{ description: "T20 → T20 → D17", difficulty: "Advanced", percentage: 78, isHardFinish: false }],
    152: [{ description: "T20 → T20 → D16", difficulty: "Advanced", percentage: 75, isHardFinish: false }],
    150: [{ description: "T20 → T20 → D15", difficulty: "Advanced", percentage: 72, isHardFinish: false }],
    148: [{ description: "T20 → T20 → D14", difficulty: "Advanced", percentage: 70, isHardFinish: false }],
    146: [{ description: "T20 → T20 → D13", difficulty: "Advanced", percentage: 68, isHardFinish: false }],
    144: [{ description: "T20 → T20 → D12", difficulty: "Advanced", percentage: 65, isHardFinish: false }],
    142: [{ description: "T20 → T20 → D11", difficulty: "Advanced", percentage: 62, isHardFinish: false }],
    140: [{ description: "T20 → T20 → D10", difficulty: "Intermediate", percentage: 60, isHardFinish: false }],
    138: [{ description: "T20 → T20 → D9", difficulty: "Intermediate", percentage: 58, isHardFinish: false }],
    136: [{ description: "T20 → T20 → D8", difficulty: "Intermediate", percentage: 55, isHardFinish: false }],
    134: [{ description: "T20 → T20 → D7", difficulty: "Intermediate", percentage: 52, isHardFinish: false }],
    132: [{ description: "T20 → T20 → D6", difficulty: "Intermediate", percentage: 50, isHardFinish: false }],
    130: [{ description: "T20 → T20 → D5", difficulty: "Intermediate", percentage: 48, isHardFinish: false }],
    128: [{ description: "T20 → T20 → D4", difficulty: "Intermediate", percentage: 45, isHardFinish: false }],
    126: [{ description: "T20 → T19 → D10", difficulty: "Intermediate", percentage: 50, isHardFinish: false }],
    124: [{ description: "T20 → T20 → D2", difficulty: "Beginner", percentage: 40, isHardFinish: false }],
    121: [{ description: "T20 → T17 → D5", difficulty: "Intermediate", percentage: 45, isHardFinish: false }],
    120: [{ description: "T20 → 20 → D20", difficulty: "Beginner", percentage: 65, isHardFinish: false }],
    110: [{ description: "T20 → BULL", difficulty: "Intermediate", percentage: 70, isHardFinish: false }],
    107: [{ description: "T19 → BULL", difficulty: "Intermediate", percentage: 68, isHardFinish: false }],
    104: [{ description: "T18 → BULL", difficulty: "Intermediate", percentage: 65, isHardFinish: false }],
    101: [{ description: "T17 → BULL", difficulty: "Intermediate", percentage: 62, isHardFinish: false }],
    100: [{ description: "T20 → D20", difficulty: "Beginner", percentage: 75, isHardFinish: false }],
    98: [{ description: "T20 → D19", difficulty: "Beginner", percentage: 72, isHardFinish: false }],
    96: [{ description: "T20 → D18", difficulty: "Beginner", percentage: 70, isHardFinish: false }],
    94: [{ description: "T20 → D17", difficulty: "Beginner", percentage: 68, isHardFinish: false }],
    92: [{ description: "T20 → D16", difficulty: "Beginner", percentage: 65, isHardFinish: false }],
    90: [{ description: "T20 → D15", difficulty: "Beginner", percentage: 62, isHardFinish: false }],
    88: [{ description: "T20 → D14", difficulty: "Beginner", percentage: 60, isHardFinish: false }],
    86: [{ description: "T20 → D13", difficulty: "Beginner", percentage: 58, isHardFinish: false }],
    84: [{ description: "T20 → D12", difficulty: "Beginner", percentage: 55, isHardFinish: false }],
    82: [{ description: "T20 → D11", difficulty: "Beginner", percentage: 52, isHardFinish: false }],
    80: [{ description: "T20 → D10", difficulty: "Beginner", percentage: 50, isHardFinish: false }],
    78: [{ description: "T20 → D9", difficulty: "Beginner", percentage: 48, isHardFinish: false }],
    76: [{ description: "T20 → D8", difficulty: "Beginner", percentage: 45, isHardFinish: false }],
    74: [{ description: "T20 → D7", difficulty: "Beginner", percentage: 42, isHardFinish: false }],
    72: [{ description: "T20 → D6", difficulty: "Beginner", percentage: 40, isHardFinish: false }],
    70: [{ description: "T20 → D5", difficulty: "Beginner", percentage: 38, isHardFinish: false }],
    68: [{ description: "T20 → D4", difficulty: "Beginner", percentage: 35, isHardFinish: false }],
    66: [{ description: "T20 → D3", difficulty: "Beginner", percentage: 32, isHardFinish: false }],
    64: [{ description: "T20 → D2", difficulty: "Beginner", percentage: 30, isHardFinish: false }],
    62: [{ description: "T20 → D1", difficulty: "Beginner", percentage: 28, isHardFinish: false }],
    60: [{ description: "20 → D20", difficulty: "Beginner", percentage: 60, isHardFinish: false }],
    58: [{ description: "18 → D20", difficulty: "Beginner", percentage: 55, isHardFinish: false }],
    56: [{ description: "16 → D20", difficulty: "Beginner", percentage: 52, isHardFinish: false }],
    54: [{ description: "14 → D20", difficulty: "Beginner", percentage: 50, isHardFinish: false }],
    52: [{ description: "12 → D20", difficulty: "Beginner", percentage: 48, isHardFinish: false }],
    50: [{ description: "BULL", difficulty: "Beginner", percentage: 70, isHardFinish: false }],
    48: [{ description: "8 → D20", difficulty: "Beginner", percentage: 45, isHardFinish: false }],
    46: [{ description: "6 → D20", difficulty: "Beginner", percentage: 42, isHardFinish: false }],
    44: [{ description: "4 → D20", difficulty: "Beginner", percentage: 40, isHardFinish: false }],
    42: [{ description: "2 → D20", difficulty: "Beginner", percentage: 38, isHardFinish: false }],
    40: [{ description: "D20", difficulty: "Beginner", percentage: 65, isHardFinish: false }],
    38: [{ description: "D19", difficulty: "Beginner", percentage: 62, isHardFinish: false }],
    36: [{ description: "D18", difficulty: "Beginner", percentage: 60, isHardFinish: false }],
    34: [{ description: "D17", difficulty: "Beginner", percentage: 58, isHardFinish: false }],
    32: [{ description: "D16", difficulty: "Beginner", percentage: 55, isHardFinish: false }],
    30: [{ description: "D15", difficulty: "Beginner", percentage: 52, isHardFinish: false }],
    28: [{ description: "D14", difficulty: "Beginner", percentage: 50, isHardFinish: false }],
    26: [{ description: "D13", difficulty: "Beginner", percentage: 48, isHardFinish: false }],
    24: [{ description: "D12", difficulty: "Beginner", percentage: 45, isHardFinish: false }],
    22: [{ description: "D11", difficulty: "Beginner", percentage: 42, isHardFinish: false }],
    20: [{ description: "D10", difficulty: "Beginner", percentage: 40, isHardFinish: false }],
    18: [{ description: "D9", difficulty: "Beginner", percentage: 38, isHardFinish: false }],
    16: [{ description: "D8", difficulty: "Beginner", percentage: 35, isHardFinish: false }],
    14: [{ description: "D7", difficulty: "Beginner", percentage: 32, isHardFinish: false }],
    12: [{ description: "D6", difficulty: "Beginner", percentage: 30, isHardFinish: false }],
    10: [{ description: "D5", difficulty: "Beginner", percentage: 28, isHardFinish: false }],
    8: [{ description: "D4", difficulty: "Beginner", percentage: 25, isHardFinish: false }],
    6: [{ description: "D3", difficulty: "Beginner", percentage: 22, isHardFinish: false }],
    4: [{ description: "D2", difficulty: "Beginner", percentage: 20, isHardFinish: false }],
    2: [{ description: "D1", difficulty: "Beginner", percentage: 18, isHardFinish: false }]
  };

  // Get checkout suggestions for current score
  $: suggestions = checkoutRoutes.length > 0 ? checkoutRoutes : (checkoutDatabase[currentScore] || []);
  
  // Check if checkout is possible
  $: isCheckoutPossible = currentScore <= 170 && currentScore > 1 && currentScore % 2 === 0 || currentScore === 50;
  
  // Get difficulty color
  function getDifficultyColor(difficulty: string): string {
    switch (difficulty.toLowerCase()) {
      case 'pro': return 'text-red-400 bg-red-500/20';
      case 'advanced': return 'text-orange-400 bg-orange-500/20';  
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/20';
      case 'beginner': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  }

  // Get percentage color
  function getPercentageColor(percentage: number): string {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  // Handle suggestion tap/click
  function handleSuggestionSelect(suggestion: CheckoutRoute) {
    // Could dispatch event to parent for handling
    console.log('Selected checkout:', suggestion);
  }
</script>

{#if isVisible && isCheckoutPossible && suggestions.length > 0}
  <!-- Checkout Suggestions Container -->
  <div class="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-4 mb-4 border border-green-500/30 shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
        <div>
          <h3 class="text-white font-bold text-lg">Checkout {currentScore}</h3>
          <p class="text-green-300 text-sm">
            {dartsRemaining} dart{dartsRemaining !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>
      
      {#if onDismiss}
        <button
          on:click={onDismiss}
          class="text-green-300 hover:text-white p-2 rounded-lg hover:bg-green-700/50 transition-all"
          style="touch-action: manipulation;"
        >
          ✕
        </button>
      {/if}
    </div>

    <!-- Suggestions List -->
    <div class="space-y-3">
      {#each suggestions as suggestion, index}
        <button
          on:click={() => handleSuggestionSelect(suggestion)}
          class="w-full bg-green-800/50 hover:bg-green-700/70 active:bg-green-600/70 
                 rounded-lg p-4 text-left border border-green-600/30
                 transition-all duration-150 active:scale-98 min-h-[60px]"
          style="touch-action: manipulation;"
        >
          <!-- Suggestion Content -->
          <div class="flex items-center justify-between mb-2">
            <!-- Route Description -->
            <div class="flex-1">
              <div class="text-white font-bold text-lg mb-1">
                {suggestion.description}
              </div>
              
              <!-- Metadata Row -->
              <div class="flex items-center gap-3 flex-wrap">
                <!-- Difficulty Badge -->
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium {getDifficultyColor(suggestion.difficulty)}">
                  <div class="w-2 h-2 rounded-full bg-current"></div>
                  {suggestion.difficulty}
                </span>
                
                <!-- Success Percentage -->
                {#if suggestion.percentage}
                  <span class="text-xs {getPercentageColor(suggestion.percentage)} font-medium">
                    {suggestion.percentage}% success
                  </span>
                {/if}
                
                <!-- Hard Finish Indicator -->
                {#if suggestion.isHardFinish}
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                    ⚠️ Hard Finish
                  </span>
                {/if}
              </div>
            </div>

            <!-- Priority Indicator -->
            <div class="flex flex-col items-center ml-3">
              <div class="text-green-300 text-xs mb-1">
                #{index + 1}
              </div>
              <div class="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                <span class="text-green-400 text-sm font-bold">
                  {dartsRemaining}
                </span>
              </div>
            </div>
          </div>

          <!-- Visual Route Breakdown -->
          <div class="flex items-center gap-2 mt-2">
            {#each suggestion.description.split(' → ') as segment, segmentIndex}
              {#if segmentIndex > 0}
                <div class="text-green-400 text-sm">→</div>
              {/if}
              <div class="bg-green-600/30 text-green-200 px-2 py-1 rounded text-xs font-medium">
                {segment.trim()}
              </div>
            {/each}
          </div>
        </button>
      {/each}
    </div>

    <!-- Tips Section -->
    <div class="mt-4 p-3 bg-green-800/30 rounded-lg border border-green-600/20">
      <div class="flex items-start gap-2">
        <div class="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="text-green-400 text-xs">💡</span>
        </div>
        <div class="text-green-300 text-sm">
          <p class="font-medium mb-1">Pro Tip:</p>
          {#if currentScore >= 100}
            <p>Aim for the largest segment first to leave a comfortable double.</p>
          {:else if currentScore <= 40}
            <p>Focus on hitting the double - you're in the finishing zone!</p>
          {:else}
            <p>Set up your favorite double with the setup dart.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else if isVisible && currentScore <= 170 && !isCheckoutPossible}
  <!-- Impossible Checkout -->
  <div class="bg-red-900/80 border border-red-500/30 rounded-xl p-4 mb-4">
    <div class="flex items-center gap-3">
      <div class="w-4 h-4 rounded-full bg-red-500"></div>
      <div>
        <h3 class="text-white font-bold">No Checkout Available</h3>
        <p class="text-red-300 text-sm">
          Score {currentScore} cannot be finished - must finish on a double
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Smooth button interactions */
  .active\:scale-98:active {
    transform: scale(0.98);
  }

  /* Prevent text selection */
  * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  /* Focus states */
  button:focus-visible {
    outline: 3px solid #10b981;
    outline-offset: 2px;
  }
</style>