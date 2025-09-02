import { writable, derived } from 'svelte/store';
import { goto, invalidate } from '$app/navigation';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    // Update auth state from page data (server-side source of truth)
    updateFromPageData: (user: User | null) => {
      set({
        user,
        loading: false,
        error: null
      });
    },
    
    // Sign in method
    signIn: async (email: string, password: string, supabase: any) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (error) throw error;
        
        // Invalidate layout data to trigger re-fetch
        await invalidate('supabase:auth');
        
        return { success: true, error: null };
      } catch (err: any) {
        const error = handleAuthError(err);
        update(state => ({ ...state, loading: false, error }));
        return { success: false, error };
      }
    },

    // Sign out method
    signOut: async (supabase: any) => {
      update(state => ({ ...state, loading: true }));
      
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;

        // Invalidate and redirect
        await invalidate('supabase:auth');
        await goto('/login', { replaceState: true });
        
        return { success: true, error: null };
      } catch (err: any) {
        const error = err.message || 'Sign out failed';
        update(state => ({ ...state, loading: false, error }));
        return { success: false, error };
      }
    },

    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
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

export const auth = createAuthStore();

// Derived stores
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.loading);
export const authError = derived(auth, $auth => $auth.error);