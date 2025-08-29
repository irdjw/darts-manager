<script lang="ts">
  import type { ButtonProps } from '$lib/types/components';
  
  interface $$Props extends ButtonProps {}
  
  export let variant: ButtonProps['variant'] = 'primary';
  export let size: ButtonProps['size'] = 'md';
  export let disabled = false;
  export let loading = false;
  export let fullWidth = false;
  export let type: ButtonProps['type'] = 'button';
  
  const variants = {
    primary: 'bg-team-primary hover:opacity-90 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    success: 'bg-team-success hover:opacity-90 text-white',
    warning: 'bg-team-warning hover:opacity-90 text-white',
    error: 'bg-team-error hover:opacity-90 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[52px]'
  };
</script>

<button
  {type}
  {disabled}
  class="
    rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-team-primary
    {variants[variant]} {sizes[size]} 
    {fullWidth ? 'w-full' : ''} 
    {disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    {$$props.class || ''}
  "
  id={$$props.id}
  on:click
>
  {#if loading}
    <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
  {/if}
  <slot />
</button>