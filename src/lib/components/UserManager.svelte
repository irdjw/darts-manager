<!-- src/lib/components/UserManager.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/database/supabase';
  import { userRole } from '../stores/auth';
  import { getPermissions, USER_ROLES } from '../utils/permissions';
  import type { UserRole } from '../database/types';
  
  interface UserWithRole {
    id: string;
    email: string;
    role: UserRole['role'];
    created_at: string;
    last_sign_in_at: string | null;
  }

  let users: UserWithRole[] = [];
  let loading = true;
  let error = '';
  let selectedUser: UserWithRole | null = null;
  let showRoleModal = false;

  const permissions = getPermissions($userRole);

  onMount(() => {
    if (permissions.canManageUsers) {
      loadUsers();
    } else {
      error = 'Insufficient permissions to manage users';
      loading = false;
    }
  });

  async function loadUsers() {
    try {
      loading = true;
      error = '';
      
      // Test Supabase connection first
      const { data: connectionTest } = await supabase
        .from('user_roles')
        .select('count')
        .limit(1);
      
      if (!connectionTest) {
        throw new Error('Unable to connect to Supabase database');
      }

      // Get users from auth.users (requires service_role key for admin operations)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth admin error:', authError);
        throw new Error('Unable to fetch user list. Check Supabase service role permissions.');
      }

      // Get user roles with error handling
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (roleError) {
        console.error('Role fetch error:', roleError);
        throw new Error('Unable to fetch user roles from database');
      }

      // Combine data
      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);
      
      users = authUsers.users.map(user => ({
        id: user.id,
        email: user.email || 'No email',
        role: roleMap.get(user.id) || 'player',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null
      }));

    } catch (err: any) {
      console.error('Load users error:', err);
      error = err.message || 'Failed to load users';
      users = [];
    } finally {
      loading = false;
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole['role']) {
    try {
      error = '';
      
      // Test database connection
      const { error: testError } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);
      
      if (testError) {
        throw new Error('Database connection failed');
      }

      // Check if user role exists
      const { data: existing, error: existingError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: userId, 
            role: newRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

      // Refresh users list
      await loadUsers();
      showRoleModal = false;
      selectedUser = null;

    } catch (err: any) {
      console.error('Update role error:', err);
      error = err.message || 'Failed to update user role';
    }
  }

  function openRoleModal(user: UserWithRole) {
    selectedUser = user;
    showRoleModal = true;
    error = '';
  }

  function getRoleDisplay(role: string): string {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN: return '👑 Super Admin';
      case USER_ROLES.ADMIN: return '🔧 Admin';
      case USER_ROLES.CAPTAIN: return '⚡ Captain';
      case USER_ROLES.PLAYER: return '🎯 Player';
      default: return role;
    }
  }

  function getRoleColour(role: string): string {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN: return 'bg-purple-100 text-purple-800 border-purple-200';
      case USER_ROLES.ADMIN: return 'bg-red-100 text-red-800 border-red-200';
      case USER_ROLES.CAPTAIN: return 'bg-blue-100 text-blue-800 border-blue-200';
      case USER_ROLES.PLAYER: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

{#if !permissions.canManageUsers}
  <div class="text-center p-8">
    <div class="text-red-500 text-4xl mb-4">🚫</div>
    <h2 class="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
    <p class="text-gray-600">You don't have permission to manage users.</p>
  </div>
{:else}
  <div class="p-4 sm:p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
        <p class="text-gray-600 mt-1">Manage user roles and permissions</p>
      </div>
      <button
        on:click={loadUsers}
        disabled={loading}
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md 
               font-medium transition-colors min-h-[44px]"
      >
        {#if loading}
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
        {/if}
        🔄 Refresh
      </button>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex items-center">
          <div class="text-red-500 mr-2">⚠️</div>
          <div>
            <p class="text-red-800 font-medium">Database Connection Error</p>
            <p class="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="flex justify-center items-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-2 text-gray-600">Loading users...</span>
      </div>
    {:else if users.length === 0 && !error}
      <div class="text-center p-8">
        <div class="text-gray-400 text-4xl mb-4">👥</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
        <p class="text-gray-600">No users are currently registered in the system.</p>
      </div>
    {:else}
      <!-- Users Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each users as user (user.id)}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-4">
                    <div class="flex flex-col">
                      <div class="text-sm font-medium text-gray-900">{user.email}</div>
                      <div class="text-xs text-gray-500">
                        Joined: {formatDate(user.created_at)}
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    <span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full border {getRoleColour(user.role)}">
                      {getRoleDisplay(user.role)}
                    </span>
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-900">
                    {formatDate(user.last_sign_in_at)}
                  </td>
                  <td class="px-4 py-4">
                    <button
                      on:click={() => openRoleModal(user)}
                      disabled={!permissions.canAssignRoles && user.role === USER_ROLES.SUPER_ADMIN}
                      class="bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400
                             text-gray-700 px-3 py-1 rounded text-sm font-medium 
                             transition-colors min-h-[32px]"
                    >
                      Edit Role
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Role Assignment Modal -->
    {#if showRoleModal && selectedUser}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Update Role for {selectedUser.email}
          </h3>
          
          <form on:submit|preventDefault={(e) => {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            const newRole = formData.get('role') as UserRole['role'];
            if (newRole && selectedUser) {
              updateUserRole(selectedUser.id, newRole);
            }
          }}>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select 
                name="role" 
                value={selectedUser.role}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={USER_ROLES.PLAYER}>🎯 Player</option>
                <option value={USER_ROLES.CAPTAIN}>⚡ Captain</option>
                {#if permissions.canAssignRoles}
                  <option value={USER_ROLES.ADMIN}>🔧 Admin</option>
                  <option value={USER_ROLES.SUPER_ADMIN}>👑 Super Admin</option>
                {/if}
              </select>
            </div>
            
            <div class="flex space-x-3">
              <button
                type="submit"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                       rounded-md font-medium transition-colors min-h-[44px]"
              >
                Update Role
              </button>
              <button
                type="button"
                on:click={() => {
                  showRoleModal = false;
                  selectedUser = null;
                  error = '';
                }}
                class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2
                       rounded-md font-medium transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </div>
{/if}