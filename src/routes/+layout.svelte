<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { page } from '$app/stores';
  import { createBrowserClient, isBrowser, parse } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import MobileNavigation from '$lib/components/MobileNavigation.svelte';
  
  export let data;
  
  let supabase: any;
  let mobileMenuOpen = false;
  
  // Get user role from session data
  $: userRole = data?.session?.user?.user_metadata?.role || 'player';
  $: isAuthenticated = !!data?.session?.user;
  $: isAuthPage = $page.route.id === '/auth' || $page.route.id === '/';
  
  // Initialize Supabase client-side
  onMount(() => {
    supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        fetch,
      },
      cookies: {
        get(name) {
          if (!isBrowser) return undefined;
          return parse(document.cookie)[name];
        },
        set(name, value, options) {
          if (!isBrowser) return;
          document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge}` : ''}`;
        },
        remove(name, options) {
          if (!isBrowser) return;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    });

    // Handle auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (session?.expires_at !== data.session?.expires_at) {
        // Invalidate data when auth state changes
        invalidate('supabase:auth');
      }
    });

    return () => subscription.unsubscribe();
  });

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
    </header>
  {/if}
  
  <!-- Main Content -->
  <main class="flex-1">
    <slot />
  </main>
</div>