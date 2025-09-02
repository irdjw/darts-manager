// Simple role management utility
import { supabase } from '$lib/database/supabase';
import type { UserRole } from '$lib/database/types';

/**
 * Set a user's role in the database
 */
export async function setUserRole(userId: string, role: UserRole['role']): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .upsert([{ 
      user_id: userId, 
      role: role 
    }], {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
  
  console.log(`Set user ${userId} role to ${role}`);
}

/**
 * Get a user's role from the database
 */
export async function getUserRole(userId: string): Promise<UserRole['role']> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.log('No role found for user, defaulting to player:', userId);
    return 'player';
  }
  
  return data.role;
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(role: UserRole['role']): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if user has captain privileges or higher
 */
export function isCaptainOrHigher(role: UserRole['role']): boolean {
  return role === 'captain' || role === 'admin' || role === 'super_admin';
}