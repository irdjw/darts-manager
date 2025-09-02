import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { UserRole } from '$lib/database/types';

// Helper function to validate and cast user roles
function validateUserRole(role: string | undefined): UserRole['role'] {
  const validRoles: UserRole['role'][] = ['super_admin', 'admin', 'captain', 'player'];
  if (role && validRoles.includes(role as UserRole['role'])) {
    return role as UserRole['role'];
  }
  return 'player';
}

// Get user role from database ONLY - no metadata fallback
async function getUserRoleFromDatabase(supabase: any, userId: string): Promise<UserRole['role']> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // Create default player role if none exists
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: 'player' }]);
      
      if (insertError) {
        console.error('Error creating default user role:', insertError);
      }
      
      return 'player';
    }
    
    return validateUserRole(data?.role);
  } catch (err) {
    console.error('Error fetching user role from database:', err);
    return 'player';
  }
}

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

  let userRole: UserRole['role'] = 'player';
  
  if (session?.user && !error) {
    // Attach user to event
    event.locals.user = session.user;
    
    // Get role from database ONLY - ignore user_metadata completely
    userRole = await getUserRoleFromDatabase(supabase, session.user.id);
    
    event.locals.userRole = userRole;
  }

  // Define route protections
  const path = event.url.pathname;
  const publicRoutes = ['/', '/auth', '/login', '/offline'];
  const requiresAuth = !publicRoutes.includes(path);

  // Handle authentication redirects
  if (requiresAuth && !session?.user) {
    throw redirect(302, `/auth?redirect=${encodeURIComponent(path)}`);
  }

  // Handle role-based access (only for authenticated users)
  if (session?.user) {
    const rolePermissions: Record<string, string[]> = {
      '/admin': ['admin', 'super_admin'],
      '/admin/users': ['super_admin'],
      '/admin/players': ['admin', 'super_admin'],
      '/admin/fixtures': ['admin', 'super_admin'],
      '/admin/results': ['admin', 'super_admin'],
      '/team': ['captain', 'admin', 'super_admin'],
      '/team-selection': ['captain', 'admin', 'super_admin'],
    };

    // Check for dynamic routes using startsWith
    let requiredRoles: string[] | undefined;
    
    // Check exact matches first
    if (rolePermissions[path]) {
      requiredRoles = rolePermissions[path];
    }
    // Check dynamic route patterns
    else if (path.startsWith('/match/')) {
      requiredRoles = ['captain', 'admin', 'super_admin'];
    }
    else if (path.startsWith('/scoring/')) {
      requiredRoles = ['captain', 'admin', 'super_admin'];
    }
    else if (path.startsWith('/team-selection/')) {
      requiredRoles = ['captain', 'admin', 'super_admin'];
    }

    if (requiredRoles && !requiredRoles.includes(userRole)) {
      console.warn(`Access denied: User role '${userRole}' cannot access '${path}'. Required roles: ${requiredRoles.join(', ')}`);
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