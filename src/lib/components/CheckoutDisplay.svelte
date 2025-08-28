<!-- CheckoutDisplay.svelte - Mobile-first checkout suggestions component -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { checkoutService } from '../services/checkoutService';
  import type { CheckoutRoute } from '../types/scoring';

  // Props
  export let currentScore: number;
  export let dartsRemaining: number;
  export let compact: boolean = false;
  export let showDifficulty: boolean = true;
  export let maxRoutes: number = 5;

  // Reactive state
  let canCheckout = false;
  let checkoutRoutes: CheckoutRoute[] = [];
  let impossibleCheckout = false;

  // Reactive updates when score or darts change
  $: updateCheckoutData(currentScore, dartsRemaining);

  function updateCheckoutData(score: number, darts: number) {
    if (!score || !darts || score < 2 || score > 170 || darts < 1 || darts > 3) {
      canCheckout = false;
      checkoutRoutes = [];
      impossibleCheckout = false;
      return;
    }

    canCheckout = checkoutService.canCheckout(score, darts);
    
    if (canCheckout) {
      checkoutRoutes = checkoutService
        .getRecommendedFinishes(score, darts)
        .slice(0, maxRoutes);
      impossibleCheckout = false;
    } else {
      checkoutRoutes = [];
      // Check if it's an impossible checkout score (like 169, 168, etc.)
      impossibleCheckout = checkoutService.getImpossibleCheckouts().includes(score);
    }
  }

  // Get difficulty color class
  function getDifficultyColor(difficulty: number): string {
    if (difficulty <= 3) return 'bg-green-50 border-green-200 text-green-800';
    if (difficulty <= 6) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    if (difficulty <= 10) return 'bg-orange-50 border-orange-200 text-orange-800';
    return 'bg-red-50 border-red-200 text-red-800';
  }

  // Get difficulty label
  function getDifficultyLabel(difficulty: number): string {
    if (difficulty <= 3) return 'Easy';
    if (difficulty <= 6) return 'Medium';
    if (difficulty <= 10) return 'Hard';
    return 'Very Hard';
  }

  // Format route for mobile display
  function formatRouteForMobile(route: CheckoutRoute): string {
    // For mobile, show a more compact format
    return route.description.replace('→', '•');
  }
</script>

{#if impossibleCheckout}
  <!-- Impossible checkout warning -->
  <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
    <div class="flex items-center gap-2">
      <span class="text-red-600 text-lg">⚠️</span>
      <div>
        <p class="font-semibold text-red-800 text-sm">
          Impossible Checkout
        </p>
        <p class="text-red-600 text-xs">
          Score {currentScore} cannot be finished in any number of darts
        </p>
      </div>
    </div>
  </div>

{:else if !canCheckout && currentScore >= 2 && currentScore <= 170}
  <!-- No checkout possible with remaining darts -->
  <div class="p-3 bg-orange-50 border border-orange-200 rounded-lg">
    <div class="flex items-center gap-2">
      <span class="text-orange-600 text-lg">🎯</span>
      <div>
        <p class="font-semibold text-orange-800 text-sm">
          No Finish Available
        </p>
        <p class="text-orange-600 text-xs">
          Cannot checkout {currentScore} with {dartsRemaining} dart{dartsRemaining !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  </div>

{:else if canCheckout && checkoutRoutes.length > 0}
  <!-- Checkout routes available -->
  <div class="space-y-2">
    {#if !compact}
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold text-gray-800 text-sm">
          Finish {currentScore} ({dartsRemaining} dart{dartsRemaining !== 1 ? 's' : ''})
        </h4>
        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {checkoutRoutes.length} route{checkoutRoutes.length !== 1 ? 's' : ''}
        </span>
      </div>
    {/if}

    {#each checkoutRoutes as route, index}
      <div 
        class="p-2 md:p-3 border rounded-lg transition-all hover:shadow-sm {getDifficultyColor(route.difficulty)}"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            {#if compact}
              <p class="font-medium text-sm truncate">
                {formatRouteForMobile(route)}
              </p>
            {:else}
              <p class="font-medium text-sm mb-1">
                {route.description}
              </p>
              {#if showDifficulty}
                <p class="text-xs opacity-75">
                  {getDifficultyLabel(route.difficulty)} • Difficulty: {route.difficulty}
                </p>
              {/if}
            {/if}
          </div>
          
          {#if compact && showDifficulty}
            <span class="ml-2 text-xs px-1.5 py-0.5 rounded bg-white/50">
              {getDifficultyLabel(route.difficulty)}
            </span>
          {/if}
        </div>
      </div>
    {/each}

    {#if !compact}
      <!-- Additional info for non-compact mode -->
      <div class="mt-3 pt-3 border-t border-gray-200">
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>Tap any route for detailed breakdown</span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 bg-green-200 rounded"></span>
            Easy
            <span class="w-2 h-2 bg-yellow-200 rounded ml-2"></span>
            Medium
            <span class="w-2 h-2 bg-red-200 rounded ml-2"></span>
            Hard
          </span>
        </div>
      </div>
    {/if}
  </div>

{:else if currentScore < 2}
  <!-- Score too low -->
  <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
    <p class="text-gray-600 text-sm text-center">
      Score too low for checkout
    </p>
  </div>

{:else if currentScore > 170}
  <!-- Score too high for single turn checkout -->
  <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <div class="text-center">
      <p class="font-semibold text-blue-800 text-sm mb-1">
        Keep Scoring
      </p>
      <p class="text-blue-600 text-xs">
        Score {currentScore} - need to reduce to checkout range (≤170)
      </p>
    </div>
  </div>
{/if}

<!-- Mobile-specific styles -->
<style>
  /* Ensure touch targets are large enough on mobile */
  @media (max-width: 768px) {
    div[class*="p-2"] {
      min-height: 44px;
      display: flex;
      align-items: center;
    }
  }

  /* Custom animations for route updates */
  .checkout-route {
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>