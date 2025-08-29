<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { accessibilityManager } from '$lib/utils/keyboard';
  
  const dispatch = createEventDispatcher();
  
  interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    action: (event: KeyboardEvent) => void;
    description: string;
    category?: string;
    keyDisplay: string;
  }
  
  export let visible = false;
  
  let shortcuts: KeyboardShortcut[] = [];
  let categorizedShortcuts: { [category: string]: KeyboardShortcut[] } = {};
  let modal: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;
  let previouslyFocusedElement: HTMLElement | null = null;
  
  onMount(() => {
    const handleKeyboardHelp = (event: CustomEvent) => {
      visible = event.detail.visible;
      shortcuts = event.detail.shortcuts || [];
      organizeCategorizedShortcuts();
      
      if (visible) {
        previouslyFocusedElement = document.activeElement as HTMLElement;
        setTimeout(() => {
          if (modal) {
            cleanupFocusTrap = accessibilityManager.trapFocus(modal);
          }
        }, 100);
      } else {
        if (cleanupFocusTrap) {
          cleanupFocusTrap();
          cleanupFocusTrap = null;
        }
        if (previouslyFocusedElement) {
          accessibilityManager.restoreFocus(previouslyFocusedElement);
        }
      }
    };
    
    const handleEscape = () => {
      if (visible) {
        close();
      }
    };
    
    window.addEventListener('keyboard-help-toggle', handleKeyboardHelp);
    window.addEventListener('keyboard-escape', handleEscape);
    
    return () => {
      window.removeEventListener('keyboard-help-toggle', handleKeyboardHelp);
      window.removeEventListener('keyboard-escape', handleEscape);
      
      if (cleanupFocusTrap) {
        cleanupFocusTrap();
      }
    };
  });
  
  function organizeCategorizedShortcuts() {
    categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    }, {} as { [category: string]: KeyboardShortcut[] });
  }
  
  function close() {
    visible = false;
    dispatch('close');
    
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
    
    if (previouslyFocusedElement) {
      accessibilityManager.restoreFocus(previouslyFocusedElement);
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }
  
  function getCategoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'navigation': return '🧭';
      case 'utility': return '🔧';
      case 'application': return '💻';
      case 'scoring': return '🎯';
      default: return '⚡';
    }
  }
</script>

{#if visible}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="keyboard-help-title"
  >
    <!-- Modal Content -->
    <div 
      bind:this={modal}
      class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 id="keyboard-help-title" class="text-xl font-bold text-gray-900">
            Keyboard Shortcuts
          </h2>
        </div>
        
        <button
          on:click={close}
          class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 
                 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close keyboard shortcuts help"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[70vh]">
        {#if Object.keys(categorizedShortcuts).length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500">No keyboard shortcuts available</p>
          </div>
        {:else}
          <div class="space-y-6">
            {#each Object.entries(categorizedShortcuts) as [category, categoryShortcuts]}
              <div class="space-y-3">
                <!-- Category Header -->
                <div class="flex items-center space-x-2 mb-3">
                  <span class="text-lg">{getCategoryIcon(category)}</span>
                  <h3 class="text-lg font-semibold text-gray-900">{category}</h3>
                </div>
                
                <!-- Shortcuts List -->
                <div class="grid gap-2">
                  {#each categoryShortcuts as shortcut}
                    <div class="flex items-center justify-between py-2 px-3 rounded-lg 
                               bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span class="text-gray-700 text-sm">{shortcut.description}</span>
                      <div class="flex items-center space-x-1">
                        {#each shortcut.keyDisplay.split(' + ') as key}
                          <kbd class="px-2 py-1 text-xs font-mono bg-white border border-gray-300 
                                    rounded shadow-sm text-gray-900 min-w-[2rem] text-center">
                            {key}
                          </kbd>
                          {#if key !== shortcut.keyDisplay.split(' + ').slice(-1)[0]}
                            <span class="text-gray-400 text-xs">+</span>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
        
        <!-- Tips Section -->
        <div class="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 class="font-medium text-blue-900 mb-2">💡 Tips</h4>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Press <kbd class="px-1 py-0.5 bg-white rounded text-xs">Alt + H</kbd> to toggle this help</li>
            <li>• Press <kbd class="px-1 py-0.5 bg-white rounded text-xs">Escape</kbd> to close modals</li>
            <li>• Use <kbd class="px-1 py-0.5 bg-white rounded text-xs">Tab</kbd> to navigate between elements</li>
            <li>• Shortcuts work when not typing in input fields</li>
          </ul>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Total shortcuts: {shortcuts.length}
          </p>
          <button
            on:click={close}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium 
                   transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  kbd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  }
</style>