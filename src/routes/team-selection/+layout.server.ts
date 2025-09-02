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
  
  return {
    session
  };
};