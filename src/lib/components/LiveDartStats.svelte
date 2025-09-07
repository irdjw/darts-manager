<!-- LiveDartStats.svelte - Real-time statistics display optimized for mobile -->
<script lang="ts">
  import type { DartThrow, PlayerGameStats } from '../types/scoring';

  // Props
  export let currentLegStats: Partial<PlayerGameStats> | null = null;
  export let currentTurnDarts: DartThrow[] = [];
  export let currentScore: number = 501;
  export let startingScore: number = 501;
  export let playerName: string = 'Player';
  export let isCurrentThrower: boolean = false;
  export let showDetailed: boolean = false;

  // Calculate derived statistics
  $: progress = Math.max(0, startingScore - currentScore);
  $: progressPercentage = Math.round((progress / startingScore) * 100);
  $: dartsPerScore = currentLegStats?.totalDarts || 0 > 0 ? Math.round(progress / (currentLegStats?.totalDarts || 1)) : 0;
  $: currentTurnTotal = currentTurnDarts.reduce((sum, dart) => sum + dart.dartScore, 0);
  $: currentTurnAverage = currentTurnDarts.length > 0 ? Math.round((currentTurnTotal / currentTurnDarts.length) * 100) / 100 : 0;
  
  // Performance indicators
  $: performanceLevel = getPerformanceLevel(currentLegStats?.average || 0);
  $: isInCheckoutRange = currentScore <= 170;
  
  // Get performance level color and label
  function getPerformanceLevel(average: number): { level: string; color: string; bgColor: string } {
    if (average >= 60) return { level: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (average >= 45) return { level: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (average >= 30) return { level: 'Average', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    if (average >= 15) return { level: 'Below Average', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
    return { level: 'Beginner', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  }

  // Format large numbers
  function formatNumber(num: number): string {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  }

  // Calculate projected finish
  $: projectedDarts = currentLegStats?.average ? Math.ceil(currentScore / (currentLegStats.average * 3)) * 3 : null;
</script>

<!-- Main Stats Container -->
<div class="bg-gray-900 rounded-xl p-4 text-white">
  <!-- Player Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <!-- Player Status Indicator -->
      <div class="w-4 h-4 rounded-full {isCurrentThrower ? 'bg-orange-500 animate-pulse' : 'bg-gray-600'}"></div>
      
      <div>
        <h3 class="font-bold text-lg">{playerName}</h3>
        <div class="text-gray-400 text-sm">
          {isCurrentThrower ? 'Throwing' : 'Waiting'}
        </div>
      </div>
    </div>

    <!-- Current Score -->
    <div class="text-right">
      <div class="text-3xl font-bold {isInCheckoutRange ? 'text-orange-400' : 'text-white'}">
        {currentScore}
      </div>
      <div class="text-gray-400 text-sm">
        {progressPercentage}% complete
      </div>
    </div>
  </div>

  <!-- Performance Level Indicator -->
  <div class="flex items-center gap-2 mb-4 p-2 rounded-lg {performanceLevel.bgColor}">
    <div class="w-2 h-2 rounded-full {performanceLevel.color.replace('text-', 'bg-')}"></div>
    <span class="{performanceLevel.color} text-sm font-medium">
      {performanceLevel.level} Performance
    </span>
    {#if currentLegStats?.average}
      <span class="text-gray-300 text-sm ml-auto">
        {Math.round((currentLegStats.average || 0) * 100) / 100} avg
      </span>
    {/if}
  </div>

  <!-- Primary Stats Grid -->
  <div class="grid grid-cols-3 gap-3 mb-4">
    <!-- 3-Dart Average -->
    <div class="bg-gray-800 rounded-lg p-3 text-center">
      <div class="text-gray-400 text-xs mb-1">3-Dart Avg</div>
      <div class="text-xl font-bold">
        {currentLegStats?.average ? Math.round((currentLegStats.average * 3) * 100) / 100 : '0.00'}
      </div>
    </div>

    <!-- Darts Thrown -->
    <div class="bg-gray-800 rounded-lg p-3 text-center">
      <div class="text-gray-400 text-xs mb-1">Darts</div>
      <div class="text-xl font-bold">
        {currentLegStats?.totalDarts || 0}
      </div>
    </div>

    <!-- Progress -->
    <div class="bg-gray-800 rounded-lg p-3 text-center">
      <div class="text-gray-400 text-xs mb-1">Scored</div>
      <div class="text-xl font-bold">
        {formatNumber(progress)}
      </div>
    </div>
  </div>

  <!-- Current Turn Stats (if throwing) -->
  {#if isCurrentThrower && currentTurnDarts.length > 0}
    <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-2 h-2 rounded-full bg-orange-500"></div>
        <span class="text-orange-400 text-sm font-medium">Current Turn</span>
      </div>
      
      <div class="grid grid-cols-3 gap-2 text-center">
        <div>
          <div class="text-orange-300 text-xs">Total</div>
          <div class="text-white font-bold">{currentTurnTotal}</div>
        </div>
        <div>
          <div class="text-orange-300 text-xs">Average</div>
          <div class="text-white font-bold">{currentTurnAverage}</div>
        </div>
        <div>
          <div class="text-orange-300 text-xs">Darts</div>
          <div class="text-white font-bold">{currentTurnDarts.length}/3</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- High Scores Row -->
  <div class="grid grid-cols-4 gap-2 mb-4">
    <div class="bg-gray-800 rounded-lg p-2 text-center">
      <div class="text-yellow-400 text-xs mb-1">180s</div>
      <div class="text-white font-bold text-lg">
        {currentLegStats?.scores180 || 0}
      </div>
    </div>

    <div class="bg-gray-800 rounded-lg p-2 text-center">
      <div class="text-green-400 text-xs mb-1">140+</div>
      <div class="text-white font-bold text-lg">
        {currentLegStats?.scores140Plus || 0}
      </div>
    </div>

    <div class="bg-gray-800 rounded-lg p-2 text-center">
      <div class="text-blue-400 text-xs mb-1">100+</div>
      <div class="text-white font-bold text-lg">
        {currentLegStats?.scores100Plus || 0}
      </div>
    </div>

    <div class="bg-gray-800 rounded-lg p-2 text-center">
      <div class="text-purple-400 text-xs mb-1">80+</div>
      <div class="text-white font-bold text-lg">
        {currentLegStats?.scores80Plus || 0}
      </div>
    </div>
  </div>

  <!-- Detailed Stats (Expandable) -->
  {#if showDetailed}
    <div class="border-t border-gray-700 pt-3">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400 mb-1">Darts per Score</div>
          <div class="text-white font-medium">{dartsPerScore}</div>
        </div>
        
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400 mb-1">Projected Finish</div>
          <div class="text-white font-medium">
            {projectedDarts ? `${projectedDarts} darts` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Checkout Range Indicator -->
  {#if isInCheckoutRange}
    <div class="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-3 mt-4">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
        <span class="text-orange-300 font-medium text-sm">
          In Checkout Range - Finish on Double!
        </span>
      </div>
    </div>
  {/if}

  <!-- Progress Bar -->
  <div class="mt-4">
    <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
      <span>Progress</span>
      <span>{progressPercentage}%</span>
    </div>
    <div class="w-full bg-gray-700 rounded-full h-2">
      <div 
        class="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-1000 ease-out"
        style="width: {progressPercentage}%"
      ></div>
    </div>
  </div>
</div>

<style>
  /* Smooth transitions for stat updates */
  .transition-stat {
    transition: all 0.3s ease-out;
  }

  /* Custom pulse for checkout range */
  @keyframes checkoutPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .animate-pulse {
    animation: checkoutPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Prevent text selection */
  * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>