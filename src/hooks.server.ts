import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { supabase } from '$lib/database/supabase';
import { requiresAuthentication, canAccessRoute, getPermissions } from '$lib/utils/permissions';

export const handle: Handle = async ({ event, resolve }) => {
  // Get session from request
  const sessionToken = event.cookies.get('sb-access-token');
  
  if (sessionToken) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
      
      if (!error && user) {
        // Fetch user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        // Attach user info to event
        event.locals.user = user;
        event.locals.userRole = roleData?.role || 'player';
      }
    } catch (err) {
      // Invalid session, clear it
      event.cookies.delete('sb-access-token', { path: '/' });
    }
  }

  // Check if route requires authentication
  const path = event.url.pathname;
  
  if (requiresAuthentication(path)) {
    if (!event.locals.user) {
      throw redirect(302, `/login?redirect=${encodeURIComponent(path)}`);
    }

    // Check specific route permissions
    const routePermissions: Record<string, string> = {
      '/admin': 'canAccessAdmin',
      '/admin/users': 'canManageUsers',
      '/admin/players': 'canManagePlayers',
      '/admin/fixtures': 'canManageFixtures',
      '/team': 'canSelectTeam',
      '/team/selection': 'canSelectTeam',
      '/attendance': 'canMarkAttendance'
    };

    const requiredPermission = routePermissions[path];
    
    if (requiredPermission && !canAccessRoute(event.locals.userRole, requiredPermission)) {
      // Redirect to appropriate dashboard based on role
      const permissions = getPermissions(event.locals.userRole);
      const redirectPath = permissions.canAccessAdmin ? '/admin' : 
                          permissions.canSelectTeam ? '/team' : '/stats';
      
      throw redirect(302, redirectPath);
    }
  }

  return resolve(event);
};