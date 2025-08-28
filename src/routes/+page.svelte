<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading } from '$lib/stores/auth';
  
  onMount(() => {
    // Redirect authenticated users to dashboard
    if ($isAuthenticated) {
      goto('/dashboard', { replaceState: true });
    }
  });
  
  // Reactive redirect when auth state changes
  $: if (!$isLoading && $isAuthenticated) {
    goto('/dashboard', { replaceState: true });
  }
</script>

<svelte:head>
  <title>Isaac Wilson Darts Team</title>
</svelte:head>

{#if $isLoading}
  <!-- Loading state -->
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-6xl mb-4">🎯</div>
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
      <p class="text-gray-600">Loading Isaac Wilson Darts...</p>
    </div>
  </div>
{:else if !$isAuthenticated}
  <!-- Landing page for unauthenticated users -->
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div class="max-w-md w-full mx-4">
      <div class="text-center mb-8">
        <div class="text-8xl mb-4">🎯</div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Isaac Wilson Darts Team</h1>
        <p class="text-gray-600">Team management system</p>
      </div>
      
      <div class="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 class="text-xl font-semibold text-gray-900 text-center">Welcome Back</h2>
        <p class="text-gray-600 text-center text-sm">Please sign in to access the team dashboard</p>
        
        <a 
          href="/login"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg 
                 font-medium transition-all min-h-[44px] flex items-center justify-center"
        >
          Sign In
        </a>
        
        <div class="pt-4 border-t border-gray-200">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">7</div>
              <div class="text-xs text-gray-500">Team Size</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">38</div>
              <div class="text-xs text-gray-500">Fixtures</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}