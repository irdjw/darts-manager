<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let color: 'primary' | 'secondary' | 'white' = 'primary';
  export let text = '';
  
  $: sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }[size];
  
  $: colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-slate-600',
    white: 'text-white'
  }[color];
</script>

<div class="flex flex-col items-center justify-center gap-3">
  <svg 
    class="animate-spin {sizeClasses} {colorClasses}" 
    fill="none" 
    viewBox="0 0 24 24"
    aria-label="Loading"
  >
    <circle 
      class="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      stroke-width="4"
    ></circle>
    <path 
      class="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
  
  {#if text}
    <p class="text-sm text-slate-600 font-medium">
      {text}
    </p>
  {/if}
</div>