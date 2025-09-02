// Utility to help setup admin users in the database
import { supabase } from '$lib/database/supabase';
import type { UserRole } from '$lib/database/types';

/**
 * Creates or updates a user role in the database
 * This should be called when admin users are created or need role updates
 */
export async function setUserRole(userId: string, role: UserRole['role']): Promise<void> {
  try {
    // First try to update existing record
    const { data: existingRole, error: fetchError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user role:', updateError);
        throw updateError;
      }
    } else {
      // Create new role record
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);

      if (insertError) {
        console.error('Error creating user role:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully set user ${userId} role to ${role}`);
  } catch (error) {
    console.error('Error in setUserRole:', error);
    throw error;
  }
}

/**
 * Setup admin users - call this to ensure admin users have correct roles
 */
export async function setupAdminUsers(): Promise<void> {
  try {
    console.log('Setting up admin users...');
    
    // Get all users from auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log('Found users:', users?.length || 0);

    // You can manually specify which users should be admins
    // This is just an example - adjust the logic based on your needs
    for (const user of users || []) {
      console.log('Processing user:', user.email, 'metadata:', user.user_metadata);
      
      // Check if user should be admin based on email or metadata
      if (user.email?.includes('admin') || user.user_metadata?.role) {
        const targetRole = user.user_metadata?.role || 
                          (user.email?.includes('superadmin') ? 'super_admin' : 'admin');
        
        console.log(`Setting ${user.email} to role: ${targetRole}`);
        await setUserRole(user.id, targetRole as UserRole['role']);
      }
    }
    
    console.log('Admin setup complete');
  } catch (error) {
    console.error('Error in setupAdminUsers:', error);
  }
}

/**
 * Quick function to promote a specific user to admin
 */
export async function promoteUserToAdmin(email: string, role: UserRole['role'] = 'admin'): Promise<void> {
  try {
    // Find user by email
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    const user = users?.find(u => u.email === email);
    if (!user) {
      console.error(`User with email ${email} not found`);
      return;
    }

    await setUserRole(user.id, role);
    console.log(`Promoted ${email} to ${role}`);
  } catch (error) {
    console.error('Error promoting user:', error);
  }
}