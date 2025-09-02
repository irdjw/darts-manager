<script lang="ts">
  import { supabase } from '$lib/database/supabase';
  import type { PageData } from './$types';
  import type { UserRole } from '$lib/database/types';

  export let data: PageData;

  let loading = false;
  let message = '';
  let users: any[] = [];

  async function setupCurrentUserAsAdmin(role: UserRole['role'] = 'super_admin') {
    try {
      loading = true;
      message = '';

      // Set role in database
      const { error } = await supabase
        .from('user_roles')
        .upsert([{ 
          user_id: data.userId, 
          role: role
        }], {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      message = `✅ Successfully set your role to ${role}. Please refresh the page or log out/in to see changes.`;
    } catch (error: any) {
      message = `❌ Error: ${error.message}`;
      console.error(error);
    } finally {
      loading = false;
    }
  }

  async function loadAllUsers() {
    try {
      loading = true;
      
      // Get users from auth
      const { data: authData, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;
      
      users = authData.users || [];
      message = `Found ${users.length} users`;
    } catch (error: any) {
      message = `❌ Error loading users: ${error.message}`;
    } finally {
      loading = false;
    }
  }

  async function setUserRole(userId: string, email: string, role: UserRole['role']) {
    try {
      loading = true;
      
      const { error } = await supabase
        .from('user_roles')
        .upsert([{ 
          user_id: userId, 
          role: role
        }], {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      message = `✅ Set ${email} to ${role}`;
    } catch (error: any) {
      message = `❌ Error setting role: ${error.message}`;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Admin Setup - Darts Manager</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Admin Role Setup</h1>
      
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p class="text-sm text-yellow-800">
          <strong>Security Note:</strong> This page is only accessible with the correct query parameter. 
          Use it to set up admin roles for the application.
        </p>
      </div>

      <!-- Current User Info -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3">Current User</h2>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p><strong>Email:</strong> {data.userEmail}</p>
          <p><strong>User ID:</strong> {data.userId}</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3">Quick Setup</h2>
        <div class="flex flex-wrap gap-3">
          <button 
            on:click={() => setupCurrentUserAsAdmin('super_admin')}
            disabled={loading}
            class="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            Make Me Super Admin
          </button>
          
          <button 
            on:click={() => setupCurrentUserAsAdmin('admin')}
            disabled={loading}
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            Make Me Admin
          </button>

          <button 
            on:click={loadAllUsers}
            disabled={loading}
            class="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            Load All Users
          </button>
        </div>
      </div>

      <!-- Message Display -->
      {#if message}
        <div class="mb-6 p-4 rounded-lg {message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
          {message}
        </div>
      {/if}

      <!-- All Users -->
      {#if users.length > 0}
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3">All Users</h2>
          <div class="space-y-3">
            {#each users as user}
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                  <div>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p class="text-sm text-gray-600">ID: {user.id}</p>
                    <p class="text-sm text-gray-600">Metadata: {JSON.stringify(user.user_metadata)}</p>
                  </div>
                  <div class="flex gap-2">
                    <button 
                      on:click={() => setUserRole(user.id, user.email, 'super_admin')}
                      disabled={loading}
                      class="text-xs bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-2 py-1 rounded"
                    >
                      Super Admin
                    </button>
                    <button 
                      on:click={() => setUserRole(user.id, user.email, 'admin')}
                      disabled={loading}
                      class="text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 py-1 rounded"
                    >
                      Admin
                    </button>
                    <button 
                      on:click={() => setUserRole(user.id, user.email, 'captain')}
                      disabled={loading}
                      class="text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-2 py-1 rounded"
                    >
                      Captain
                    </button>
                    <button 
                      on:click={() => setUserRole(user.id, user.email, 'player')}
                      disabled={loading}
                      class="text-xs bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-2 py-1 rounded"
                    >
                      Player
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Instructions -->
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ol class="text-sm text-blue-800 space-y-1">
          <li>1. Click "Make Me Super Admin" to give yourself super admin privileges</li>
          <li>2. Alternatively, click "Load All Users" to see all registered users and assign roles</li>
          <li>3. After setting roles, refresh the main dashboard to see the changes</li>
          <li>4. The admin workaround section should now be visible on the dashboard</li>
          <li>5. You can bookmark this page for future role management</li>
        </ol>
      </div>
    </div>
  </div>
</div>