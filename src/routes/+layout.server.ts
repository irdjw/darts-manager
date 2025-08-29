import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const {
    data: { session },
  } = await locals.supabase.auth.getSession();

  return {
    session,
    user: locals.user || null,
    userRole: locals.userRole || null,
  };
};