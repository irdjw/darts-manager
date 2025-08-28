// src/lib/components/ErrorAlert.svelte
<script lang="ts">
  export let message: string;
  export let onClose: (() => void) | undefined = undefined;
</script>

<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <p class="text-red-800">{message}</p>
    </div>
    
    {#if onClose}
      <button
        on:click={onClose}
        class="text-red-500 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] 
               flex items-center justify-center touch-manipulation"
        aria-label="Close error"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    {/if}
  </div>
</div>