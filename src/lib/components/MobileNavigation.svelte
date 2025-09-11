<script lang="ts">
  import { page } from '$app/stores';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  // All navigation items - no role restrictions
  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/custom-match', label: 'Custom Match', icon: '🎪' },
    { href: '/statistics', label: 'Statistics', icon: '📈' },
    { href: '/attendance', label: 'Attendance', icon: '✅' },
    { href: '/team-selection', label: 'Team Selection', icon: '👥' },
    { href: '/warmup', label: 'Practice', icon: '🎯' },
    { href: '/team', label: 'Team Management', icon: '⚙️' },
    { href: '/admin', label: 'Admin', icon: '🛠️' }
  ];

  function handleItemClick() {
    dispatch('close');
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dispatch('close');
    }
  }
</script>

<!-- Mobile Navigation Overlay -->
{#if isOpen}
  <div 
    class="fixed inset-0 z-50 lg:hidden"
    role="dialog" 
    aria-modal="true"
    tabindex="-1"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && dispatch('close')}
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"></div>
    
    <!-- Navigation Panel -->
    <div class="fixed inset-y-0 left-0 flex w-full max-w-sm">
      <div class="relative flex w-full flex-col bg-white shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-6 bg-blue-600">
          <div class="text-white">
            <h2 class="text-lg font-semibold">Isaac Wilson</h2>
            <p class="text-sm text-blue-100">Darts Team</p>
          </div>
          
          <button
            type="button"
            class="text-blue-100 hover:text-white p-2 rounded-md transition-colors"
            on:click={() => dispatch('close')}
            aria-label="Close menu"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Navigation Items -->
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {#each navigationItems as item}
            {@const isActive = $page.url.pathname === item.href || 
                              ($page.url.pathname.startsWith(item.href) && item.href !== '/')}
            
            <a
              href={item.href}
              class="flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors
                     {isActive 
                       ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' 
                       : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}"
              on:click={handleItemClick}
            >
              <span class="mr-3 text-xl">{item.icon}</span>
              {item.label}
              
              {#if isActive}
                <svg class="ml-auto h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              {/if}
            </a>
          {/each}
        </nav>
        
        <!-- Footer -->
        <div class="px-4 py-6 border-t border-gray-200">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span class="text-blue-600 font-medium text-sm">U</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">User</p>
              <div class="flex items-center space-x-2">
                <span class="text-xs text-gray-500">User</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-3">
            
            <form action="/logout" method="post" class="w-full">
              <button
                type="submit"
                class="w-full flex items-center justify-center px-3 py-2 border border-gray-300 
                       rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                       transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}