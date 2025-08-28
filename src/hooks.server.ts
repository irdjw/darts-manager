import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { supabase } from '$lib/database/supabase';
import { requiresAuthentication, canAccessRoute, getPermissions } from '$lib/utils/permissions';

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize Supabase client for server-side operations
  event.locals.supabase = supabase;
  
  // Helper function to get user
  event.locals.getUser = async () => {
    const sessionToken = event.cookies.get('sb-access-token') || 
                        event.cookies.get('sb-refresh-token');
    
    if (!sessionToken) return null;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
      return error ? null : user;
    } catch {
      return null;
    }
  };

  // Get session from cookies or authorization header
  const authHeader = event.request.headers.get('authorization');
  const sessionToken = event.cookies.get('sb-access-token') || 
                      authHeader?.replace('Bearer ', '');
  
  if (sessionToken) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
      
      if (!error && user) {
        // Fetch user role with proper error handling
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) {
          console.error('Failed to fetch user role:', roleError);
          // Create default role if none exists
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'player' })
            .select('role')
            .single();
        }

        // Attach user info to event
        event.locals.user = user;
        event.locals.userRole = roleData?.role || 'player';
      }
    } catch (err) {
      console.error('Session validation error:', err);
      // Clear invalid session cookies
      event.cookies.delete('sb-access-token', { path: '/' });
      event.cookies.delete('sb-refresh-token', { path: '/' });
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