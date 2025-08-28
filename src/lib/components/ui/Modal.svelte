<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  
  export let open = false;
  export let title = '';
  export let closable = true;
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  
  const dispatch = createEventDispatcher();
  
  // Modal sizing (mobile-first responsive)
  $: sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }[size];
  
  // Close modal function
  function closeModal() {
    if (closable) {
      open = false;
      dispatch('close');
    }
  }
  
  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closable) {
      closeModal();
    }
  }
  
  // Focus management
  let modalElement: HTMLElement;
  
  onMount(() => {
    if (open && modalElement) {
      modalElement.focus();
    }
  });
  
  $: if (open && modalElement) {
    modalElement.focus();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-40 touch-none"
    transition:fade={{ duration: 200 }}
    on:click={closeModal}
    on:keydown={(e) => e.key === 'Enter' && closeModal()}
    role="button"
    tabindex="-1"
  ></div>
  
  <!-- Modal -->
  <div 
    class="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
  >
    <div 
      bind:this={modalElement}
      class="bg-white rounded-xl shadow-2xl w-full {sizeClasses} max-h-[90vh] overflow-hidden"
      transition:fly={{ y: 50, duration: 300 }}
      tabindex="-1"
      on:click|stopPropagation
    >
      {#if title || closable}
        <header class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          {#if title}
            <h2 id="modal-title" class="text-xl font-semibold text-slate-900">
              {title}
            </h2>
          {:else}
            <div></div>
          {/if}
          
          {#if closable}
            <button
              class="text-slate-400 hover:text-slate-600 transition-colors p-2 -mr-2 rounded-lg
                     hover:bg-slate-100 min-h-[44px] min-w-[44px] touch-manipulation"
              on:click={closeModal}
              aria-label="Close modal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </header>
      {/if}
      
      <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
        <slot />
      </div>
      
      {#if $slots.footer}
        <footer class="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <slot name="footer" />
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Prevent body scroll when modal is open */
  :global(body.modal-open) {
    overflow: hidden;
  }
</style>