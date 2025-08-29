<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Auto-redirect if user lands on this page directly
  onMount(() => {
    // If user navigates here directly, redirect to auth
    setTimeout(() => {
      goto('/auth');
    }, 2000);
  });
</script>

<svelte:head>
  <title>Logging Out - Isaac Wilson Darts Team</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full text-center p-6">
    <div class="mb-6">
      <div class="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Logging Out</h1>
      <p class="text-gray-600">You have been successfully logged out.</p>
    </div>
    
    <div class="space-y-3">
      <a 
        href="/auth"
        class="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium
               min-h-[44px] transition-all touch-manipulation"
      >
        Sign In Again
      </a>
    </div>
    
    <p class="text-sm text-gray-500 mt-4">
      Redirecting to login page...
    </p>
  </div>
</div>