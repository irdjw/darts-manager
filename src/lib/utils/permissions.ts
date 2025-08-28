// src/lib/utils/permissions.ts
// Permission system for Isaac Wilson Darts Team App
// This file should contain ONLY TypeScript - no Svelte component code

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

export function getRedirectPath(userRole: UserRole['role'] | null): string {
  const permissions = getPermissions(userRole);
  
  if (permissions.canAccessAdmin) {
    return '/admin';
  } else if (permissions.canSelectTeam) {
    return '/team';
  } else {
    return '/stats';
  }
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