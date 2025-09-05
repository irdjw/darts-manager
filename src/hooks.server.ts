import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
  // Create Supabase client for server-side auth
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => event.cookies.get(name),
      set: (name, value, options) => {
        event.cookies.set(name, value, { ...options, path: '/' });
      },
      remove: (name, options) => {
        event.cookies.delete(name, { ...options, path: '/' });
      },
    },
  });

  // Get session from Supabase (handles cookie names properly)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (session?.user && !error) {
    // Attach user to event
    event.locals.user = session.user;
  }

  // Define route protections - only authentication required, no roles
  const path = event.url.pathname;
  const publicRoutes = ['/', '/auth', '/login', '/offline'];
  const requiresAuth = !publicRoutes.includes(path);

  // Handle authentication redirects
  if (requiresAuth && !session?.user) {
    throw redirect(302, `/auth?redirect=${encodeURIComponent(path)}`);
  }

  // Set user in PageData for all routes
  event.locals.supabase = supabase;

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });

  // Add no-cache headers to prevent browser caching issues
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
};