<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth, isAuthenticated, userRole, isLoading } from '$lib/stores/auth';
  import { getPermissions } from '$lib/utils/permissions';
  import '../app.css'; // TailwindCSS
  
  let permissions: any = {};
  
  // Reactive permissions based on user role
  $: permissions = getPermissions($userRole);

  onMount(() => {
    // Initialize authentication
    auth.init();
  });

  async function handleSignOut() {
    await auth.signOut();
  }
</script>

<svelte:head>
  <title>Isaac Wilson Darts Team</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Darts team management system">
</svelte:head>

{#if $isLoading}
  <!-- Loading Screen -->
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-6xl mb-4">🎯</div>
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
      <p class="text-gray-600">Loading Isaac Wilson Darts...</p>
    </div>
  </div>
{:else if !$isAuthenticated && $page.url.pathname !== '/login'}
  <!-- Not authenticated - redirect handled by hooks -->
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-red-500 text-4xl mb-4">🔒</div>
      <p class="text-gray-600">Please log in to access the system</p>
    </div>
  </div>
{:else}
  <!-- Main App Layout -->
  {#if $isAuthenticated && $page.url.pathname !== '/login'}
    <!-- Mobile Navigation -->
    <nav class="bg-white shadow-lg border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo and Title -->
          <div class="flex items-center">
            <div class="text-2xl mr-3">🎯</div>
            <div class="hidden sm:block">
              <h1 class="text-lg font-semibold text-gray-900">Isaac Wilson Darts</h1>
              <p class="text-xs text-gray-600">Team Management</p>
            </div>
          </div>

          <!-- Navigation Links -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            {#if permissions.canViewStatistics}
              <a
                href="/stats"
                class="text-gray-700 hover:text-blue-600 px-2 py-2 rounded-md text-sm font-medium
                       min-h-[44px] flex items-center transition-colours"
                class:text-blue-600={$page.url.pathname === '/stats'}
              >
                📊 Stats
              </a>
            {/if}

            {#if permissions.canSelectTeam}
              <a
                href="/team"
                class="text-gray-700 hover:text-blue-600 px-2 py-2 rounded-md text-sm font-medium
                       min-h-[44px] flex items-center transition-colours"
                class:text-blue-600={$page.url.pathname.startsWith('/team')}
              >
                👥 Team
              </a>
            {/if}

            {#if permissions.canAccessAdmin}
              <a
                href="/admin"
                class="text-gray-700 hover:text-blue-600 px-2 py-2 rounded-md text-sm font-medium
                       min-h-[44px] flex items-center transition-colours"
                class:text-blue-600={$page.url.pathname.startsWith('/admin')}
              >
                ⚙️ Admin
              </a>
            {/if}

            <!-- User Menu -->
            <div class="relative group">
              <button
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md
                       text-sm font-medium min-h-[44px] flex items-center transition-colours"
              >
                👤 {$userRole?.replace('_', ' ').toUpperCase()}
              </button>
              
              <!-- Dropdown Menu -->
              <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          transition-all duration-200 z-50">
                <div class="py-1">
                  <button
                    on:click={handleSignOut}
                    class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50
                           min-h-[44px] flex items-center transition-colours"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  {/if}

  <!-- Main Content -->
  <main class="min-h-screen bg-gray-50">
    <slot />
  </main>
{/if}
