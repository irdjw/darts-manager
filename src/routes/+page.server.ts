import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Check if user is authenticated
  const {
    data: { session },
  } = await locals.supabase.auth.getSession();

  // If not authenticated, redirect to auth page
  if (!session?.user) {
    throw redirect(302, '/auth');
  }

  // If authenticated, redirect to dashboard
  throw redirect(302, '/dashboard');
};