<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import '../app.css';
  import MobileNavigation from '$lib/components/MobileNavigation.svelte';

  export let data;

  $: isAuthenticated = !!data.session;
  $: isAuthPage = $page.url.pathname === '/auth' || $page.url.pathname === '/login';

  let mobileMenuOpen = false;
  let isOnline = true;

  onMount(() => {
    if (typeof window !== 'undefined') {
      isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        isOnline = true;
      });

      window.addEventListener('offline', () => {
        isOnline = false;
      });
    }
  });

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<div class="app-container">
  {#if isAuthenticated && !isAuthPage}
    <MobileNavigation
      isOpen={mobileMenuOpen}
      on:close={closeMobileMenu}
    />

    <header class="app-header">
      <div class="flex items-center justify-between h-full px-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-bold">IW</span>
          </div>
          <div>
            <h1 class="text-base font-bold text-gray-900">Isaac Wilson</h1>
            <p class="text-xs text-gray-500">Darts Team</p>
          </div>
        </div>

        <button
          on:click={toggleMobileMenu}
          class="p-2 text-gray-500 hover:text-gray-700"
          aria-label="Menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  {/if}

  <main class="app-main">
    <slot />
  </main>

  {#if !isOnline}
    <div class="offline-indicator">
      <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span class="text-sm text-orange-800">You're offline. Changes will sync when you reconnect.</span>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app-container {
    width: 100vw;
    height: var(--viewport-height, 100vh);
    height: calc(var(--vh, 1vh) * 100);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .app-header {
    flex-shrink: 0;
    height: 60px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    z-index: 10;
  }

  .app-main {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    position: relative;
  }

  .offline-indicator {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    background: #fed7aa;
    border: 1px solid #fdba74;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 50;
  }

  @media screen and (min-width: 768px) {
    .app-header {
      height: 64px;
    }
  }
</style>
