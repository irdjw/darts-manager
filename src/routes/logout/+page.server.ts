import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
  default: async ({ cookies, locals }) => {
    // Clear the session
    if (locals.supabase) {
      await locals.supabase.auth.signOut();
    }
    
    // Clear session cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    
    // Redirect to login/home page
    throw redirect(303, '/auth');
  }
} satisfies Actions;