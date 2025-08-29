import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();
  
  if (!session?.user) {
    // For now, return a default user role instead of redirecting
    // In production, you might want to redirect to auth
    return {
      userRole: 'player',
      session: null
    };
  }
  
  const userRole = session.user.user_metadata?.role || 'player';
  
  return {
    userRole,
    session
  };
};