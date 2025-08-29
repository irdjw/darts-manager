import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Handle GET request to logout (for direct navigation)
  if (locals.supabase) {
    await locals.supabase.auth.signOut();
  }
  
  throw redirect(303, '/auth');
};

export const actions = {
  default: async ({ cookies, locals }) => {
    // Clear the session
    if (locals.supabase) {
      await locals.supabase.auth.signOut();
    }
    
    // Clear all possible session cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token', 
      'supabase-auth-token',
      'sb-auth-token',
      'session'
    ];
    
    cookiesToClear.forEach(cookieName => {
      cookies.delete(cookieName, { path: '/' });
      cookies.delete(cookieName, { path: '/', domain: undefined });
    });
    
    // Clear impersonation if it exists
    cookies.delete('impersonating-role', { path: '/' });
    
    // Redirect to auth page
    throw redirect(303, '/auth');
  }
} satisfies Actions;