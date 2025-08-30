import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const {
    data: { session },
    error: sessionError
  } = await locals.supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Team selection layout session error:', sessionError);
  }
  
  if (!session?.user) {
    throw error(401, 'Authentication required');
  }
  
  // Use the userRole from locals (set by hooks.server.ts) for consistency
  const userRole = locals.userRole || session.user.user_metadata?.role || 'player';
  
  // Allow captains, admins, and super_admins to access team selection
  if (!['captain', 'admin', 'super_admin'].includes(userRole)) {
    console.error(`Team selection access denied for user role: ${userRole}`);
    throw error(403, 'Access denied: Captain privileges required');
  }
  
  return {
    userRole,
    session
  };
};