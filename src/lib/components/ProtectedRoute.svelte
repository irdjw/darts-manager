<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth, isAuthenticated, userRole, isLoading } from '../stores/auth';
  import { canAccessRoute } from '../utils/permissions';
  import LoadingSpinner from './LoadingSpinner.svelte';
  
  export let requiredPermission: string | null = null;
  export let fallbackRoute: string = '/login';
  export let showError: boolean = true;

  let hasAccess = false;
  let errorMessage = '';

  onMount(() => {
    // Initialize auth if not already done
    auth.init();
  });

  // Reactive statement to check access
  $: {
    if (!$isLoading) {
      if (!$isAuthenticated) {
        // Not logged in - redirect to login
        goto(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);
      } else if (requiredPermission) {
        // Check specific permission
        hasAccess = canAccessRoute($userRole, requiredPermission);
        if (!hasAccess) {
          errorMessage = `You don't have permission to access this area. Required: ${requiredPermission}`;
          if (fallbackRoute !== $page.url.pathname) {
            setTimeout(() => goto(fallbackRoute), 2000);
          }
        }
      } else {
        // Just needs to be authenticated
        hasAccess = true;
      }
    }
  }
</script>

{#if $isLoading}
  <LoadingSpinner />
{:else if hasAccess}
  <slot />
{:else if showError && errorMessage}
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      <div class="text-red-500 text-4xl mb-4">🚫</div>
      <h2 class="text-xl font-bold text-gray-900 mb-4">Access Denied</h2>
      <p class="text-gray-600 mb-6">{errorMessage}</p>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colours"
        on:click={() => goto(fallbackRoute)}
      >
        Go to {fallbackRoute === '/login' ? 'Login' : 'Dashboard'}
      </button>
    </div>
  </div>
{/if}