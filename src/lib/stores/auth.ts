import { writable, derived, type Readable } from 'svelte/store';
import { supabase, handleDatabaseError } from '../database/supabase.js';
import type { User, AuthChangeEvent } from '@supabase/supabase-js';
import type { UserRole } from '../database/types.js';

// Auth state interface
interface AuthState {
  user: User | null;
  userRole: UserRole['role'] | null;
  loading: boolean;
  error: string | null;
}

// Create auth store
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    error: null
  });

  return {
    subscribe,
    
    // Initialize authentication
    init: async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          set({
            user: session.user,
            userRole: role,
            loading: false,
            error: null
          });
        } else {
          set({
            user: null,
            userRole: null,
            loading: false,
            error: null
          });
        }
      } catch (err: any) {
        set({
          user: null,
          userRole: null,
          loading: false,
          error: err.message || 'Failed to initialize authentication'
        });
      }
    },

    // Sign in with email and password
    signIn: async (email: string, password: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        const role = await fetchUserRole(data.user.id);
        
        set({
          user: data.user,
          userRole: role,
          loading: false,
          error: null
        });

        return { success: true, error: null };
      } catch (err: any) {
        const error = err.message || 'Sign in failed';
        update(state => ({ ...state, loading: false, error }));
        return { success: false, error };
      }
    },

    // Sign out
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

        return { success: true, error: null };
      } catch (err: any) {
        const error = err.message || 'Sign out failed';
        update(state => ({ ...state, error }));
        return { success: false, error };
      }
    },

    // Clear error
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

// Helper function to fetch user role
async function fetchUserRole(userId: string): Promise<UserRole['role']> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.role || 'player';
  } catch (err) {
    console.error('Error fetching user role:', err);
    return 'player';
  }
}

// Create store instance
export const auth = createAuthStore();

// Listen for auth changes
supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const role = await fetchUserRole(session.user.id);
    auth.subscribe(state => {
      if (!state.user || state.user.id !== session.user.id) {
        auth.init(); // Re-initialize if user changed
      }
    });
  } else if (event === 'SIGNED_OUT') {
    auth.subscribe(() => {});
    // Auth store will be updated by signOut method
  }
});

// Derived stores for convenience
export const user = derived(auth, $auth => $auth.user);
export const userRole = derived(auth, $auth => $auth.userRole);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.loading);
export const authError = derived(auth, $auth => $auth.error);