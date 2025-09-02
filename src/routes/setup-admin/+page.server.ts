import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/database/supabase';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Only allow access with specific query parameter for security
  const allowAccess = url.searchParams.get('allow');
  if (allowAccess !== 'setup-roles-2025') {
    throw redirect(302, '/');
  }

  // Get session
  const {
    data: { session },
    error
  } = await locals.supabase.auth.getSession();

  if (error || !session?.user) {
    throw redirect(302, '/auth');
  }

  return {
    session,
    userId: session.user.id,
    userEmail: session.user.email
  };
};