import { USER_ROLES } from './constants.js';
import type { UserRole } from '../database/types.js';

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
      canAccessAdmin: true
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
      canAccessAdmin: true
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
      canAccessAdmin: false
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
      canAccessAdmin: false
    }
  };
  
  return permissions[userRole as keyof typeof permissions] || permissions[USER_ROLES.PLAYER];
}

// Helper functions for common permission checks
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