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
  
  const userRole = session.user.user_metadata?.role || 'player';
  
  // Allow captains, admins, and super_admins to access team management
  if (!['captain', 'admin', 'super_admin'].includes(userRole)) {
    throw error(403, 'Access denied: Captain privileges required');
  }
  
  return {
    userRole,
    session
  };
};