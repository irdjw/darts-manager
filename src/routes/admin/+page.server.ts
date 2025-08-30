import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const {
    data: { session },
    error: sessionError
  } = await locals.supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Admin session error:', sessionError);
  }
  
  if (!session?.user) {
    throw error(401, 'Authentication required');
  }
  
  // Use the userRole from locals (set by hooks.server.ts) for consistency
  const userRole = locals.userRole || session.user.user_metadata?.role || 'player';
  
  // Allow only admins and super_admins to access admin panel
  if (!['admin', 'super_admin'].includes(userRole)) {
    console.error(`Admin access denied for user role: ${userRole}`);
    throw error(403, 'Access denied: Admin privileges required');
  }
  
  return {
    userRole,
    session
  };
};