import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const {
    data: { session },
    error: sessionError
  } = await locals.supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Match page session error:', sessionError);
  }
  
  if (!session?.user) {
    throw error(401, 'Authentication required');
  }
  
  // Use the userRole from locals (set by hooks.server.ts) for consistency
  const userRole = locals.userRole || session.user.user_metadata?.role || 'player';
  
  // Allow captains, admins, and super_admins to access match management
  if (!['captain', 'admin', 'super_admin'].includes(userRole)) {
    console.error(`Match access denied for user role: ${userRole}`);
    throw error(403, 'Access denied: Captain privileges required');
  }
  
  const fixtureId = params.id;
  
  if (!fixtureId) {
    throw error(400, 'Match ID is required');
  }
  
  return {
    userRole,
    session,
    fixtureId
  };
};