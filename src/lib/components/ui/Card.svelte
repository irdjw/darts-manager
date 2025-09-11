<script lang="ts">
  export let title = '';
  export let subtitle = '';
  export let padding = 'default'; // 'compact' | 'default' | 'large'
  export let elevation = 'default'; // 'none' | 'default' | 'large'
  export let clickable = false;
  
  // Mobile-first responsive classes
  $: paddingClasses = {
    compact: 'p-3 md:p-4',
    default: 'p-4 md:p-6',
    large: 'p-6 md:p-8'
  }[padding];
  
  $: elevationClasses = {
    none: '',
    default: 'shadow-md',
    large: 'shadow-lg shadow-slate-200/50'
  }[elevation];
  
  $: interactiveClasses = clickable ? 
    'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 touch-manipulation' : '';
</script>

<div 
  class="card bg-white rounded-xl border border-slate-200 {paddingClasses} {elevationClasses} {interactiveClasses}"
  on:click
  on:keydown
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
>
  {#if title || subtitle}
    <header class="mb-4 pb-4 border-b border-slate-100">
      {#if title}
        <h3 class="text-lg md:text-xl font-semibold text-slate-900 leading-tight">
          {title}
        </h3>
      {/if}
      {#if subtitle}
        <p class="text-sm text-slate-600 mt-1">
          {subtitle}
        </p>
      {/if}
    </header>
  {/if}
  
  <div class="card-content">
    <slot />
  </div>
</div>

<style>
  /* CSS variables integration */
  .card {
    background-color: var(--color-surface);
    border-color: var(--color-border);
  }
</style>