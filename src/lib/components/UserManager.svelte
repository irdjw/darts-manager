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
    }
  });

  async function loadUsers() {
    try {
      loading = true;
      
      // Get users from auth.users (admin only operation)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Get user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (roleError) throw roleError;

      // Combine data
      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);
      
      users = authUsers.users.map(user => ({
        id: user.id,
        email: user.email || 'No email',
        role: roleMap.get(user.id) || 'player',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }));

      error = '';
    } catch (err: any) {
      error = err.message || 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole['role']) {
    try {
      // Check if user role exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        
        if (error) throw error;
      }

      // Refresh users list
      await loadUsers();
      showRoleModal = false;
      selectedUser = null;

    } catch (err: any) {
      error = err.message || 'Failed to update user role';
    }
  }

  function openRoleModal(user: UserWithRole) {
    selectedUser = user;
    showRoleModal = true;
  }

  function getRoleDisplay(role: string): string {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN: return '👑 Super Admin';
      case USER_ROLES.ADMIN: return '🔧 Admin';
      case USER_ROLES.TEAM_CAPTAIN: return '🎯 Team Captain';
      case USER_ROLES.PLAYER: return '🎲 Player';
      default: return '🎲 Player';
    }
  }

  function closeModal() {
    showRoleModal = false;
    selectedUser = null;
  }
</script>

{#if !permissions.canManageUsers}
  <div class="text-center py-8">
    <p class="text-gray-600">You don't have permission to manage users.</p>
  </div>
{:else}
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">User Management</h2>
      <button
        onclick={loadUsers}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {/if}

    {#if loading}
      <div class="text-center py-8">
        <p class="text-gray-600">Loading users...</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Sign In
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each users as user (user.id)}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getRoleDisplay(user.role)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onclick={() => openRoleModal(user)}
                    class="text-blue-600 hover:text-blue-900"
                  >
                    Change Role
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  {#if showRoleModal && selectedUser}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Change Role for {selectedUser.email}
          </h3>
          
          <div class="space-y-3">
            {#each Object.values(USER_ROLES) as role}
              <button
                onclick={() => updateUserRole(selectedUser.id, role)}
                class="w-full text-left px-4 py-2 border rounded hover:bg-gray-50 
                       {selectedUser.role === role ? 'bg-blue-50 border-blue-300' : ''}"
              >
                {getRoleDisplay(role)}
              </button>
            {/each}
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              onclick={closeModal}
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}