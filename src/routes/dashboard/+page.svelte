<script lang="ts">
  import { userRole } from '$lib/stores/auth';
  import { getPermissions } from '$lib/utils/permissions';
  import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
  
  $: permissions = getPermissions($userRole);
</script>

<svelte:head>
  <title>Dashboard - Isaac Wilson Darts</title>
</svelte:head>

<ProtectedRoute>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <!-- Welcome Header -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">
        Welcome back! 🎯
      </h1>
      <p class="text-gray-600">
        Role: <span class="font-medium capitalize">{$userRole?.replace('_', ' ')}</span>
      </p>
    </div>

    <!-- Dashboard Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Quick Actions -->
      {#if permissions.canViewStatistics}
        <a
          href="/stats"
          class="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all
                 block group"
        >
          <div class="flex items-center mb-3">
            <div class="text-2xl mr-3">📊</div>
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Season Statistics
            </h3>
          </div>
          <p class="text-gray-600 text-sm">
            View player performance, checkout rates, and season standings
          </p>
        </a>
      {/if}

      {#if permissions.canSelectTeam}
        <a
          href="/team"
          class="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all
                 block group"
        >
          <div class="flex items-center mb-3">
            <div class="text-2xl mr-3">👥</div>
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Team Management
            </h3>
          </div>
          <p class="text-gray-600 text-sm">
            Mark attendance, select teams, and manage match preparation
          </p>
        </a>
      {/if}

      {#if permissions.canAccessAdmin}
        <a
          href="/admin"
          class="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all
                 block group"
        >
          <div class="flex items-center mb-3">
            <div class="text-2xl mr-3">⚙️</div>
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Administration
            </h3>
          </div>
          <p class="text-gray-600 text-sm">
            Manage players, fixtures, users, and system settings
          </p>
        </a>
      {/if}
    </div>

    <!-- Recent Activity or System Status -->
    <div class="mt-8 bg-white rounded-lg shadow-sm border p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
      <div class="flex items-center text-green-600">
        <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
        <span class="text-sm">All systems operational</span>
      </div>
    </div>
  </div>
</ProtectedRoute>