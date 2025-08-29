import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.getSession();
  
  if (!session?.user) {
    throw error(401, 'Authentication required');
  }
  
  const userRole = session.user.user_metadata?.role || 'player';
  
  // Allow captains, admins, and super_admins to access team selection
  if (!['captain', 'admin', 'super_admin'].includes(userRole)) {
    throw error(403, 'Access denied: Captain privileges required');
  }
  
  return {
    userRole,
    session
  };
};