import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const {
    data: { session },
    error
  } = await locals.supabase.auth.getSession();
  
  if (error) {
    console.error('Dashboard session error:', error);
  }
  
  if (!session?.user) {
    return {
      session: null
    };
  }
  
  return {
    session,
    userId: session.user.id,
    userEmail: session.user.email
  };
};