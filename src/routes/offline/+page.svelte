<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let isOnline = false;

  onMount(() => {
    // Check initial online status
    isOnline = navigator.onLine;

    // Listen for online/offline events
    const handleOnline = () => {
      isOnline = true;
      // Auto-redirect to dashboard when back online
      setTimeout(() => {
        goto('/dashboard');
      }, 2000);
    };

    const handleOffline = () => {
      isOnline = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  function retryConnection() {
    if (navigator.onLine) {
      goto('/dashboard');
    } else {
      // Try to reload the page
      window.location.reload();
    }
  }
</script>

<svelte:head>
  <title>Offline - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
  <div class="max-w-md w-full text-center">
    <!-- Connection Status Icon -->
    <div class="mb-8">
      {#if isOnline}
        <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-green-600 mb-2">Back Online!</h1>
        <p class="text-gray-600 mb-4">Connection restored. Redirecting...</p>
        <div class="animate-spin mx-auto w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full"></div>
      {:else}
        <div class="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
        <p class="text-gray-600 mb-6">No internet connection detected. Some features may not be available.</p>
      {/if}
    </div>

    <!-- Offline Features -->
    {#if !isOnline}
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Offline</h2>
        <div class="space-y-3 text-left">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="text-gray-700">View cached statistics</span>
          </div>
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="text-gray-700">Practice tournament mode</span>
          </div>
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span class="text-gray-700">Data will sync when reconnected</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3">
        <button
          on:click={retryConnection}
          class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium 
                 min-h-[44px] transition-all touch-manipulation"
        >
          Try Again
        </button>
        
        <a
          href="/warmup"
          class="block w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium 
                 min-h-[44px] transition-all touch-manipulation text-center"
        >
          Practice Mode (Offline)
        </a>
      </div>

      <!-- Tips -->
      <div class="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 class="font-medium text-blue-900 mb-2">💡 Tip</h3>
        <p class="text-sm text-blue-800">
          You can still use practice mode and view cached data while offline. 
          Any changes will be saved when you reconnect.
        </p>
      </div>
    {/if}
  </div>
</div>