import type { PageServerLoad } from './$types';
import { getEffectiveUserRole } from '$lib/utils/impersonation';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const session = await locals.getSession();
  
  if (!session?.user) {
    // For now, return a default user role instead of redirecting
    // In production, you might want to redirect to auth
    return {
      userRole: 'player',
      originalRole: 'player',
      isImpersonating: false,
      session: null
    };
  }
  
  const originalRole = session.user.user_metadata?.role || 'player';
  const impersonatingRole = cookies.get('impersonating-role');
  const effectiveRole = getEffectiveUserRole(originalRole, impersonatingRole);
  
  return {
    userRole: effectiveRole,
    originalRole,
    isImpersonating: originalRole !== effectiveRole,
    session
  };
};