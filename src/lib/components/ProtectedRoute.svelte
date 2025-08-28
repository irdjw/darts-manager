<!-- src/lib/components/ProtectedRoute.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth, isAuthenticated, userRole, isLoading } from '../stores/auth';
  import { canAccessRoute } from '../utils/permissions';
  
  export let requiredPermission: string | null = null;
  export let fallbackRoute: string = '/login';

  let hasAccess = false;
  let errorMessage = '';

  onMount(() => {
    auth.init();
  });

  $: {
    if (!$isLoading) {
      if (!$isAuthenticated) {
        goto(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);
      } else if (requiredPermission) {
        hasAccess = canAccessRoute($userRole, requiredPermission);
        if (!hasAccess) {
          errorMessage = `You don't have permission to access this area.`;
          setTimeout(() => goto(fallbackRoute), 2000);
        }
      } else {
        hasAccess = true;
      }
    }
  }
</script>

{#if $isLoading}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-6xl mb-4">🎯</div>
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
      <p class="text-gray-600">Loading...</p>
    </div>
  </div>
{:else if hasAccess}
  <slot />
{:else if errorMessage}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-red-500 text-4xl mb-4">🚫</div>
      <h2 class="text-xl font-bold text-gray-900 mb-4">Access Denied</h2>
      <p class="text-gray-600">{errorMessage}</p>
    </div>
  </div>
{/if}