import type { UserRole } from '../database/types';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CAPTAIN: 'captain',
  PLAYER: 'player'
} as const;

export interface Permission {
  canViewStats: boolean;
  canMarkAttendance: boolean;
  canSelectTeam: boolean;
  canRecordResults: boolean;
  canManageFixtures: boolean;
  canManagePlayers: boolean;
  canViewWarmup: boolean;
  canResetData: boolean;
  canViewStatistics: boolean;
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canAssignRoles: boolean;
}

export function getPermissions(userRole: UserRole['role'] | null): Permission {
  const permissions = {
    [USER_ROLES.SUPER_ADMIN]: {
      canViewStats: true,
      canMarkAttendance: true,
      canSelectTeam: true,
      canRecordResults: true,
      canManageFixtures: true,
      canManagePlayers: true,
      canViewWarmup: true,
      canResetData: true,
      canViewStatistics: true,
      canAccessAdmin: true,
      canManageUsers: true,
      canAssignRoles: true
    },
    
    [USER_ROLES.ADMIN]: {
      canViewStats: true,
      canMarkAttendance: true,
      canSelectTeam: true,
      canRecordResults: true,
      canManageFixtures: true,
      canManagePlayers: true,
      canViewWarmup: true,
      canResetData: false,
      canViewStatistics: true,
      canAccessAdmin: true,
      canManageUsers: true,
      canAssignRoles: false
    },
    
    [USER_ROLES.CAPTAIN]: {
      canViewStats: true,
      canMarkAttendance: true,
      canSelectTeam: true,
      canRecordResults: true,
      canManageFixtures: false,
      canManagePlayers: false,
      canViewWarmup: true,
      canResetData: false,
      canViewStatistics: true,
      canAccessAdmin: false,
      canManageUsers: false,
      canAssignRoles: false
    },
    
    [USER_ROLES.PLAYER]: {
      canViewStats: true,
      canMarkAttendance: false,
      canSelectTeam: false,
      canRecordResults: true,
      canManageFixtures: false,
      canManagePlayers: false,
      canViewWarmup: true,
      canResetData: false,
      canViewStatistics: true,
      canAccessAdmin: false,
      canManageUsers: false,
      canAssignRoles: false
    }
  };
  
  return permissions[userRole as keyof typeof permissions] || permissions[USER_ROLES.PLAYER];
}

// Helper functions for permission checks
export function canAccessRoute(userRole: UserRole['role'] | null, requiredPermission: keyof Permission): boolean {
  const permissions = getPermissions(userRole);
  return permissions[requiredPermission];
}

export function requiresAuthentication(path: string): boolean {
  const publicRoutes = ['/login', '/'];
  return !publicRoutes.includes(path);
}

export function getMinimumRole(permission: keyof Permission): UserRole['role'] {
  const roles = [USER_ROLES.PLAYER, USER_ROLES.CAPTAIN, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];
  
  for (const role of roles) {
    const permissions = getPermissions(role);
    if (permissions[permission]) {
      return role;
    }
  }
  
  return USER_ROLES.SUPER_ADMIN; // Fallback to highest role
}

// =================================================================
// 5. USER MANAGEMENT COMPONENT - src/lib/components/UserManager.svelte
// =================================================================

<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../database/supabase';
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
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md 
               font-medium transition-colours min-h-[44px]"
      >
        🔄 Refresh
      </button>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <p class="text-red-800">{error}</p>
      </div>
    {/if}

    {#if loading}
      <div class="flex justify-center items-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span class="ml-2 text-gray-600">Loading users...</span>
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
                             transition-colours min-h-[32px]"
                    >
                      Change Role
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Role Change Modal -->
    {#if showRoleModal && selectedUser}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Change Role for {selectedUser.email}
          </h3>
          
          <p class="text-gray-600 mb-6">
            Current role: <span class="font-medium">{getRoleDisplay(selectedUser.role)}</span>
          </p>

          <div class="space-y-3 mb-6">
            {#each Object.values(USER_ROLES) as role}
              {#if permissions.canAssignRoles || role !== USER_ROLES.SUPER_ADMIN}
                <label class="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={role === selectedUser.role}
                    class="mr-3"
                  />
                  <div class="flex-1">
                    <div class="font-medium">{getRoleDisplay(role)}</div>
                    <div class="text-sm text-gray-600">
                      {#if role === USER_ROLES.SUPER_ADMIN}
                        Full system access including data reset
                      {:else if role === USER_ROLES.ADMIN}
                        Manage players, fixtures, view all statistics
                      {:else if role === USER_ROLES.CAPTAIN}
                        Team selection, mark attendance, record results
                      {:else}
                        View stats, record own game results
                      {/if}
                    </div>
                  </div>
                </label>
              {/if}
            {/each}
          </div>

          <div class="flex space-x-3">
            <button
              on:click={() => {
                const form = document.querySelector('input[name="role"]:checked') as HTMLInputElement;
                if (form && selectedUser) {
                  updateUserRole(selectedUser.id, form.value as UserRole['role']);
                }
              }}
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                     rounded-md font-medium transition-colours min-h-[44px]"
            >
              Update Role
            </button>
            <button
              on:click={() => {
                showRoleModal = false;
                selectedUser = null;
              }}
              class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2
                     rounded-md font-medium transition-colours min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
