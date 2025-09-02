import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  // Prevent browser caching of role data
  setHeaders({
    'cache-control': 'no-cache, no-store, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0'
  });

  // Get session and role from locals (set by hooks.server.ts)
  const {
    data: { session },
    error
  } = await locals.supabase.auth.getSession();
  
  if (error) {
    console.error('Dashboard session error:', error);
  }
  
  if (!session?.user) {
    return {
      userRole: 'player',
      session: null
    };
  }
  
  // Role is already determined by hooks.server.ts from database
  const userRole = locals.userRole || 'player';
  
  return {
    userRole,
    session,
    userId: session.user.id,
    userEmail: session.user.email
  };
};