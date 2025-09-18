<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { page } from '$app/stores';
  import { dev } from '$app/environment';
  import { supabase } from '$lib/database/supabase';
  import type { LayoutData } from './$types';
  import MobileNavigation from '$lib/components/MobileNavigation.svelte';

  export let data: LayoutData;

  // Navigation state
  let mobileMenuOpen = false;
  let isOnline = true;
  let showInstallPrompt = false;
  let showUpdateNotification = false;

  // Auth derived state
  $: session = data.session;
  $: user = session?.user;
  $: isAuthenticated = !!user;

  // Route checks
  $: isAuthPage = $page.url.pathname.startsWith('/auth') || $page.url.pathname === '/login';

  // Initialise analytics

  onMount(() => {
    const cleanup = setupEventListeners();
    
    // Setup Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      invalidate('supabase:auth');
    });

    return () => {
      cleanup();
      subscription?.unsubscribe();
    };
  });

  function setupEventListeners() {
    // Network status
    function updateOnlineStatus() {
      isOnline = navigator.onLine;
      if (isOnline) {
        console.log('Back online');
      } else {
        console.log('Gone offline');
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    const cleanup = () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
    
    // PWA event listeners
    window.addEventListener('pwa-installable', () => {
      showInstallPrompt = true;
    });
    
    window.addEventListener('pwa-installed', () => {
      showInstallPrompt = false;
    });
    
    window.addEventListener('pwa-update-available', () => {
      showUpdateNotification = true;
    });
    
    return cleanup;
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<div class="min-h-screen">
  <!-- Mobile Navigation -->
  {#if isAuthenticated && !isAuthPage}
    <MobileNavigation 
      isOpen={mobileMenuOpen} 
      on:close={closeMobileMenu}
    />
  {/if}
  
  <!-- Main App Header (only for authenticated users, not on auth pages) -->
  {#if isAuthenticated && !isAuthPage}
    <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-4 lg:hidden">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-bold">IW</span>
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Isaac Wilson</h1>
            <p class="text-sm text-gray-500">Darts Team</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Quick logout link for mobile -->
          <a
            href="/logout"
            class="text-gray-500 hover:text-gray-700 p-2"
            aria-label="Sign out"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </a>
          
          <!-- Mobile menu toggle -->
          <button
            on:click={toggleMobileMenu}
            class="text-gray-500 hover:text-gray-700 p-2"
            aria-label="Open mobile menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  {/if}

  <!-- Main Content -->
  <main class="main-content">
    <slot />
  </main>

  <!-- Offline Indicator -->
  {#if !isOnline}
    <div class="fixed bottom-4 left-4 right-4 bg-orange-100 border border-orange-200 rounded-lg p-3 z-50">
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span class="text-orange-800 text-sm">You're offline. Some features may be limited.</span>
      </div>
    </div>
  {/if}
  
  <!-- PWA Install Prompt -->
  {#if showInstallPrompt}
    <div class="fixed bottom-4 left-4 right-4 bg-blue-100 border border-blue-200 rounded-lg p-3 z-40">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="text-blue-800 text-sm font-medium">Install app for better experience</span>
        </div>
        <button
          on:click={() => showInstallPrompt = false}
          class="text-blue-600 hover:text-blue-700 p-1"
          aria-label="Dismiss install prompt"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Force viewport fit */
  :global(.min-h-screen) {
    height: 100vh !important;
    min-height: 100vh !important;
    max-height: 100vh !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
  }
  
  /* Main content fills available space */
  :global(.main-content) {
    flex: 1 !important;
    overflow: hidden !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }
  
  /* Remove any body/html scroll */
  :global(html),
  :global(body) {
    overflow: hidden !important;
    height: 100vh !important;
    position: fixed !important;
    width: 100% !important;
  }
  
  /* Mobile header adjustments */
  header {
    flex-shrink: 0;
    min-height: 44px;
  }
</style>
