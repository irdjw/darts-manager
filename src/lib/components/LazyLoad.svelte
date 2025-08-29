<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  
  export let height = '200px';
  export let offset = '100px';
  export let placeholder = '';
  export let once = true;
  export let disabled = false;
  
  const dispatch = createEventDispatcher();
  
  let intersecting = false;
  let container: HTMLElement;
  let hasLoaded = false;
  
  onMount(() => {
    if (disabled) {
      intersecting = true;
      return;
    }
    
    if (typeof IntersectionObserver !== 'undefined') {
      const rootMargin = `${offset}`;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              intersecting = true;
              hasLoaded = true;
              dispatch('intersect');
              
              if (once && observer) {
                observer.unobserve(entry.target);
              }
            } else if (!once) {
              intersecting = false;
            }
          });
        },
        { rootMargin }
      );
      
      observer.observe(container);
      
      return () => {
        if (observer) {
          observer.unobserve(container);
        }
      };
    } else {
      // Fallback for browsers without IntersectionObserver
      intersecting = true;
    }
  });
  
  $: shouldRender = intersecting || hasLoaded || disabled;
</script>

<div 
  bind:this={container} 
  style="min-height: {height}"
  class="lazy-load-container {shouldRender ? 'loaded' : 'loading'}"
>
  {#if shouldRender}
    <slot />
  {:else if placeholder}
    <div class="lazy-placeholder">
      {placeholder}
    </div>
  {:else}
    <div class="lazy-skeleton">
      <div class="animate-pulse bg-gray-200 rounded w-full h-full"></div>
    </div>
  {/if}
</div>

<style>
  .lazy-load-container {
    transition: opacity 0.3s ease-in-out;
  }
  
  .lazy-load-container.loading {
    opacity: 0.7;
  }
  
  .lazy-load-container.loaded {
    opacity: 1;
  }
  
  .lazy-placeholder, .lazy-skeleton {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #6b7280;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    border: 1px dashed #d1d5db;
  }
</style>