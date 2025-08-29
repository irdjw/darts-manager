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

  let userRole = 'player';
  
  if (session?.user && !error) {
    // Attach user to event
    event.locals.user = session.user;
    
    // Fetch user role
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      userRole = roleData?.role || 'player';
      event.locals.userRole = userRole;
    } catch (err) {
      console.warn('Failed to fetch user role:', err);
      event.locals.userRole = 'player';
    }
  }

  // Define route protections
  const path = event.url.pathname;
  const publicRoutes = ['/', '/login'];
  const requiresAuth = !publicRoutes.includes(path);

  // Handle authentication redirects
  if (requiresAuth && !session?.user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(path)}`);
  }

  // Handle role-based access (only for authenticated users)
  if (session?.user) {
    const rolePermissions: Record<string, string[]> = {
      '/admin': ['admin', 'super_admin'],
      '/admin/users': ['super_admin'],
      '/admin/players': ['admin', 'super_admin'],
      '/admin/fixtures': ['admin', 'super_admin'],
      '/team': ['captain', 'admin', 'super_admin'],
      '/team/selection': ['captain', 'admin', 'super_admin'],
    };

    const requiredRoles = rolePermissions[path];
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      // Redirect to appropriate dashboard
      const redirectPath = getUserDashboard(userRole);
      throw redirect(302, redirectPath);
    }
  }

  // Set user in PageData for all routes
  event.locals.supabase = supabase;

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });
};

function getUserDashboard(userRole: string): string {
  switch (userRole) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'captain':
      return '/team';
    default:
      return '/dashboard';
  }
}