<!-- DartVisualIndicators.svelte - Visual turn progress display -->
<script lang="ts">
  import type { DartThrow } from '../types/scoring';

  // Props
  export let currentTurnDarts: DartThrow[] = [];
  export let dartsRemaining: number = 3;
  export let currentTurnTotal: number = 0;
  export let showTurnTotal: boolean = true;

  // Calculate dart indicators
  $: dartIndicators = Array.from({ length: 3 }, (_, index) => {
    const dart = currentTurnDarts[index];
    const isThrown = dart !== undefined;
    const isActive = index === currentTurnDarts.length && currentTurnDarts.length < 3;
    
    return {
      index,
      isThrown,
      isActive,
      dart,
      isEmpty: !isThrown && !isActive
    };
  });

  // Animation states
  let animatingDart: number | null = null;

  // Watch for new darts to trigger animations
  $: if (currentTurnDarts.length > 0) {
    const lastDartIndex = currentTurnDarts.length - 1;
    animatingDart = lastDartIndex;
    setTimeout(() => {
      animatingDart = null;
    }, 300);
  }

  // Format dart score display
  function formatDartScore(dart: DartThrow): string {
    if (dart.dartScore === 0) return 'MISS';
    if (dart.dartScore === 25) return 'BULL';
    if (dart.dartScore === 50) return 'D-BULL';
    
    if (dart.isDoubleAttempt) {
      return `D${dart.dartScore / 2}`;
    }
    
    // Check if it's a treble (multiple of 3 between 3-60, excluding doubles)
    if (dart.dartScore % 3 === 0 && dart.dartScore >= 3 && dart.dartScore <= 60 && dart.dartScore % 2 !== 0) {
      return `T${dart.dartScore / 3}`;
    }
    
    return dart.dartScore.toString();
  }

  // Get dart color based on score
  function getDartColor(dart: DartThrow): string {
    if (dart.dartScore === 0) return 'bg-red-500';
    if (dart.dartScore >= 50) return 'bg-green-500';
    if (dart.dartScore >= 30) return 'bg-orange-500';
    if (dart.dartScore >= 15) return 'bg-blue-500';
    return 'bg-gray-500';
  }
</script>

<!-- Dart Turn Indicators -->
<div class="bg-gray-900 rounded-xl p-4 mb-4">
  <!-- Turn Total Display -->
  {#if showTurnTotal}
    <div class="text-center mb-4">
      <div class="text-4xl font-bold text-white mb-1">
        {currentTurnTotal}
      </div>
      <div class="text-gray-400 text-sm">
        Turn Total
      </div>
    </div>
  {/if}

  <!-- Dart Indicators Row -->
  <div class="flex justify-center gap-3 mb-4">
    {#each dartIndicators as { index, isThrown, isActive, dart, isEmpty }}
      <div class="relative">
        <!-- Dart Circle -->
        <div class="w-20 h-20 rounded-full border-4 flex items-center justify-center
                    relative transition-all duration-300 ease-out
                    {isThrown 
                      ? `${getDartColor(dart)} border-white shadow-lg` 
                      : isActive 
                        ? 'border-orange-500 bg-orange-500/20 animate-pulse' 
                        : 'border-gray-600 bg-gray-800'}
                    {animatingDart === index ? 'scale-110 shadow-xl' : 'scale-100'}"
        >
          <!-- Dart Content -->
          {#if isThrown}
            <div class="text-center">
              <div class="text-white font-bold text-sm leading-tight">
                {formatDartScore(dart)}
              </div>
              <div class="text-white/80 text-xs">
                {dart.dartScore}
              </div>
            </div>
          {:else if isActive}
            <div class="text-orange-400 text-2xl font-bold">
              ?
            </div>
          {:else}
            <div class="text-gray-600 text-xl">
              ○
            </div>
          {/if}
        </div>

        <!-- Dart Number Label -->
        <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 
                    text-gray-400 text-xs font-medium">
          Dart {index + 1}
        </div>

        <!-- Special Indicators -->
        {#if isThrown && dart}
          <!-- Double/Treble Indicator -->
          {#if dart.isDoubleAttempt}
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full
                        flex items-center justify-center text-white text-xs font-bold">
              D
            </div>
          {:else if dart.dartScore % 3 === 0 && dart.dartScore >= 3 && dart.dartScore <= 60 && dart.dartScore % 2 !== 0}
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full
                        flex items-center justify-center text-white text-xs font-bold">
              T
            </div>
          {/if}

          <!-- Checkout Attempt Indicator -->
          {#if dart.isCheckoutAttempt}
            <div class="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full
                        flex items-center justify-center text-black text-xs font-bold">
              ★
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  <!-- Dart Remaining Counter -->
  <div class="text-center">
    <div class="inline-flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
      <div class="w-3 h-3 rounded-full {dartsRemaining > 0 ? 'bg-orange-500' : 'bg-gray-600'}"></div>
      <span class="text-white text-sm font-medium">
        {dartsRemaining} dart{dartsRemaining !== 1 ? 's' : ''} remaining
      </span>
    </div>
  </div>

  <!-- Turn Actions -->
  {#if currentTurnDarts.length > 0}
    <div class="flex gap-2 mt-4">
      <div class="flex-1 bg-gray-800 rounded-lg p-3">
        <div class="text-center">
          <div class="text-gray-400 text-xs mb-1">Average This Turn</div>
          <div class="text-white font-bold">
            {currentTurnDarts.length > 0 ? Math.round((currentTurnTotal / currentTurnDarts.length) * 100) / 100 : 0}
          </div>
        </div>
      </div>
      
      <div class="flex-1 bg-gray-800 rounded-lg p-3">
        <div class="text-center">
          <div class="text-gray-400 text-xs mb-1">Darts Used</div>
          <div class="text-white font-bold">
            {currentTurnDarts.length} / 3
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Smooth animations for dart indicators */
  @keyframes dartThrow {
    0% {
      transform: scale(0.8) rotate(-10deg);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.15) rotate(5deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  /* Custom pulse animation for active dart */
  @keyframes activePulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }

  .animate-pulse {
    animation: activePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Prevent text selection */
  * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>