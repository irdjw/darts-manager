import { writable, derived, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { supabase } from '$lib/database/supabase';
import type { User, AuthChangeEvent } from '@supabase/supabase-js';
import type { UserRole } from '../database/types';

interface AuthState {
  user: User | null;
  userRole: UserRole['role'] | null;
  loading: boolean;
  error: string | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    error: null
  });

  return {
    subscribe,
    
    init: async () => {
      if (!browser) return;
      
      try {
        console.log('Auth: Starting initialization...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          console.log('Auth: User session found, fetching role...');
          const role = await fetchUserRole(session.user.id);
          set({
            user: session.user,
            userRole: role,
            loading: false,
            error: null
          });
          console.log('Auth: Initialization complete - authenticated');
        } else {
          console.log('Auth: No user session found');
          set({
            user: null,
            userRole: null,
            loading: false,
            error: null
          });
        }
      } catch (err: any) {
        console.error('Auth: Initialization error:', err);
        set({
          user: null,
          userRole: null,
          loading: false,
          error: err.message || 'Failed to initialise authentication'
        });
      }
    },

    signIn: async (email: string, password: string) => {
      console.log('Auth: Sign in attempt...');
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (error) throw error;
        
        console.log('Auth: Sign in successful, fetching role...');
        const role = await fetchUserRole(data.user.id);
        
        set({
          user: data.user,
          userRole: role,
          loading: false,
          error: null
        });

        const redirectPath = getRedirectPath(role);
        console.log('Auth: Redirecting to:', redirectPath);
        await goto(redirectPath, { replaceState: true });

        return { success: true, error: null };
      } catch (err: any) {
        const error = handleAuthError(err);
        console.error('Auth: Sign in error:', error);
        update(state => ({ ...state, loading: false, error }));
        return { success: false, error };
      }
    },

    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;

        set({
          user: null,
          userRole: null,
          loading: false,
          error: null
        });

        await goto('/login', { replaceState: true });
        return { success: true, error: null };
      } catch (err: any) {
        const error = err.message || 'Sign out failed';
        update(state => ({ ...state, error }));
        return { success: false, error };
      }
    },

    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

async function fetchUserRole(userId: string): Promise<UserRole['role']> {
  try {
    console.log('Auth: Fetching role for user:', userId);
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    const role = data?.role || 'player';
    console.log('Auth: User role:', role);
    return role;
  } catch (err) {
    console.error('Error fetching user role:', err);
    return 'player';
  }
}

function handleAuthError(error: any): string {
  if (error.message?.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (error.message?.includes('Email not confirmed')) {
    return 'Please check your email and confirm your account';
  }
  if (error.message?.includes('Too many requests')) {
    return 'Too many login attempts. Please try again later';
  }
  return error.message || 'Authentication failed';
}

function getRedirectPath(userRole: UserRole['role'] | null): string {
  switch (userRole) {
    case 'super_admin':
    case 'admin':
    case 'captain':
    case 'player':
    default:
      return '/dashboard';
  }
}

export const auth = createAuthStore();

if (browser) {
  // Auto-initialize when the store is created
  auth.init();
  
  supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
    console.log('Auth: State change event:', event);
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('Auth: User signed in via state change');
      // Let the signIn method handle this
    } else if (event === 'SIGNED_OUT') {
      console.log('Auth: User signed out via state change');
      goto('/login', { replaceState: true });
    }
  });
}
export const user = derived(auth, $auth => $auth.user);
export const userRole = derived(auth, $auth => $auth.userRole);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.loading);
export const authError = derived(auth, $auth => $auth.error);
