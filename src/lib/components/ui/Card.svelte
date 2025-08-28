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
```

### `/src/lib/components/ui/Button.svelte`
```svelte
<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading = false;
  export let fullWidth = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  
  // Mobile-first button sizing (minimum 44px touch targets)
  $: sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[44px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[48px]'
  }[size];
  
  $: variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300'
  }[variant];
  
  $: widthClasses = fullWidth ? 'w-full' : 'w-auto';
  
  $: disabledClasses = disabled || loading ? 
    'opacity-50 cursor-not-allowed pointer-events-none' : 
    'hover:-translate-y-0.5 active:translate-y-0';
</script>

<button
  {type}
  {disabled}
  class="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 
         touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
         {sizeClasses} {variantClasses} {widthClasses} {disabledClasses}"
  on:click
  on:focus
  on:blur
>
  {#if loading}
    <svg class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  
  <span class="flex items-center">
    <slot />
  </span>
</button>

<style>
  button {
    /* Use CSS variables for consistent theming */
    --btn-primary-bg: var(--color-primary);
    --btn-primary-hover: var(--color-primary-hover);
  }
  
  .bg-blue-600 {
    background-color: var(--btn-primary-bg);
  }
  
  .hover\:bg-blue-700:hover {
    background-color: var(--btn-primary-hover);
  }
</style>