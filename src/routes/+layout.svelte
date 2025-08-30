<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { getSupabaseBrowserClient } from '$lib/utils/supabase-browser';
  import MobileNavigation from '$lib/components/MobileNavigation.svelte';
  import KeyboardHelp from '$lib/components/KeyboardHelp.svelte';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import { registerServiceWorker, setupInstallPrompt, setupOfflineSync, onNetworkChange } from '$lib/utils/pwa';
  import { initPerformanceMonitoring } from '$lib/utils/performance';
  
  export let data;
  
  let supabase: any;
  let mobileMenuOpen = false;
  let isOnline = true;
  let showInstallPrompt = false;
  let showUpdateNotification = false;
  let showImpersonationPanel = false;
  
  // Get user role from session data
  $: userRole = data?.userRole || data?.session?.user?.user_metadata?.role || 'player';
  $: isAuthenticated = !!data?.session?.user;
  $: isAuthPage = $page.route.id === '/auth' || $page.route.id === '/';
  $: originalRole = data?.originalRole || userRole;
  $: isImpersonating = data?.isImpersonating || false;
  
  // Initialize Supabase client-side
  onMount(() => {
    if (!browser) return;
    
    try {
      supabase = getSupabaseBrowserClient();
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      return;
    }

    // Handle auth state changes
    let subscription: any = null;
    if (supabase && supabase.auth) {
      const authListener = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (session?.expires_at !== data.session?.expires_at) {
          // Invalidate data when auth state changes
          invalidate('supabase:auth');
        }
      });
      subscription = authListener.data?.subscription || authListener;
    }

    // Setup PWA features
    setupPWA();
    
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  });

  async function setupPWA() {
    // Register service worker
    await registerServiceWorker();
    
    // Setup install prompt
    setupInstallPrompt();
    
    // Setup offline sync
    setupOfflineSync();
    
    // Monitor network status
    const cleanup = onNetworkChange((online) => {
      isOnline = online;
      if (!online) {
        console.log('App went offline');
      } else {
        console.log('App came back online');
      }
    });
    
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
      {userRole} 
      {originalRole}
      {isImpersonating}
      isOpen={mobileMenuOpen} 
      on:close={closeMobileMenu}
      on:show-impersonation={() => showImpersonationPanel = true}
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
            class="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                   transition-colors lg:hidden"
            aria-label="Sign out"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </a>
          
          <!-- Mobile menu button -->
          <button
            type="button"
            class="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                   transition-colors lg:hidden"
            on:click={toggleMobileMenu}
            aria-label="Open menu"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  {/if}
  
  <!-- Main Content -->
  <ErrorBoundary>
    <main class="flex-1" id="main-content">
      <slot />
    </main>
  </ErrorBoundary>
  
  <!-- Global Components -->
  <KeyboardHelp />
  
  <!-- Network Status Indicator -->
  {#if !isOnline}
    <div class="fixed bottom-4 left-4 right-4 bg-orange-100 border border-orange-200 rounded-lg p-3 z-40">
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
        <span class="text-orange-800 text-sm font-medium">You're offline</span>
        <span class="text-orange-600 text-xs">Some features may be limited</span>
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