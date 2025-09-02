// src/lib/components/StatsCard.svelte
<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let color: 'blue' | 'green' | 'orange' | 'red' = 'blue';
  export let icon: string = '';
  export let trend: 'up' | 'down' | 'neutral' | undefined = undefined;
  
  $: colorClasses = {
    'blue': 'bg-blue-100 text-blue-600',
    'green': 'bg-green-100 text-green-600',
    'orange': 'bg-orange-100 text-orange-600',
    'red': 'bg-red-100 text-red-600'
  }[color];
  
  $: iconSvg = {
    'trophy': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    'target': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
  }[icon];

  $: trendIcon = {
    'up': 'M5 10l7-7m0 0l7 7m-7-7v18',
    'down': 'M19 14l-7 7m0 0l-7-7m7 7V3',
    'neutral': 'M20 12H4'
  }[trend || 'neutral'];

  $: trendColor = {
    'up': 'text-green-500',
    'down': 'text-red-500',
    'neutral': 'text-gray-500'
  }[trend || 'neutral'];
</script>

<div class="card bg-white p-4 md:p-6 rounded-lg shadow-lg">
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-gray-500 mb-1">{title}</p>
        {#if trend}
          <svg class="w-4 h-4 {trendColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={trendIcon} />
          </svg>
        {/if}
      </div>
      <p class="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
      {#if subtitle}
        <p class="text-sm text-gray-500 mt-1">{subtitle}</p>
      {/if}
    </div>
    
    {#if icon && iconSvg}
      <div class="w-12 h-12 rounded-lg {colorClasses} flex items-center justify-center flex-shrink-0">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconSvg} />
        </svg>
      </div>
    {/if}
  </div>
</div>