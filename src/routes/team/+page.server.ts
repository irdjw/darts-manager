import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const {
    data: { session },
    error: sessionError
  } = await locals.supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Team session error:', sessionError);
  }
  
  if (!session?.user) {
    throw error(401, 'Authentication required');
  }
  
  // Use the userRole from locals (set by hooks.server.ts) for consistency
  const userRole = locals.userRole || session.user.user_metadata?.role || 'player';
  
  // Allow captains, admins, and super_admins to access team management
  if (!['captain', 'admin', 'super_admin'].includes(userRole)) {
    console.error(`Team management access denied for user role: ${userRole}`);
    throw error(403, 'Access denied: Captain privileges required');
  }
  
  return {
    userRole,
    session
  };
};