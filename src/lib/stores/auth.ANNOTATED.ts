/**
 * ============================================================================
 * AUTH.TS — Authentication State Store
 * ============================================================================
 *
 * PURPOSE:
 * Manages the user's login/logout state for the entire app. Every page that
 * needs to know "who is logged in?" reads from this store. Sign-in and sign-out
 * actions live here too, centralising all auth logic in one place.
 *
 * ARCHITECTURE:
 *   Server (hooks.server.ts)          Browser (this store)
 *   ─────────────────────────         ──────────────────────
 *   validates cookie session    →     updateFromPageData(user)  ← sets initial state
 *   attaches user to event.locals     signIn() / signOut()      ← user actions
 *                                     invalidate('supabase:auth') ← triggers server re-check
 *
 * KEY PATTERNS:
 *
 *   1. FACTORY FUNCTION (createAuthStore):
 *      Svelte stores are plain objects with a subscribe method. The factory
 *      wraps writable<AuthState> and adds custom methods (signIn, signOut).
 *      This is the standard pattern for stores with behaviour.
 *
 *   2. SERVER-FIRST AUTH:
 *      The server (hooks.server.ts) is the source of truth. When the page
 *      loads, the server validates the session cookie and passes the user
 *      down via PageData. The store then calls updateFromPageData(user) to
 *      hydrate itself. Client-side sign-in/out actions call invalidate()
 *      to trigger the server to re-run its auth check.
 *
 *   3. DERIVED STORES:
 *      user, isAuthenticated, isLoading, authError are "views" into the
 *      single AuthState object. Components subscribe to whichever slice
 *      they need — e.g. {#if $isAuthenticated} — without pulling in the
 *      entire state object.
 *
 *   4. SUPABASE PASSED AS ARGUMENT:
 *      signIn/signOut receive the supabase client as a parameter rather
 *      than importing it at the top. This avoids circular dependency issues
 *      (supabase.ts → auth.ts → supabase.ts) and makes the store testable.
 *
 * ERROR HANDLING:
 *   handleAuthError() translates Supabase's error messages into user-facing
 *   strings. Only three cases are mapped explicitly; everything else falls
 *   through to the raw message.
 */

import { writable, derived } from 'svelte/store';
import { goto, invalidate } from '$app/navigation';
import type { User } from '@supabase/supabase-js';

// The shape of this store's state — one object, three fields.
interface AuthState {
  user: User | null;   // null = not logged in
  loading: boolean;    // true while a sign-in/out request is in flight
  error: string | null;
}

// ==========================================================================
// STORE FACTORY
// ==========================================================================

function createAuthStore() {
  // writable<AuthState> gives us subscribe, set, update.
  // Initial state: nobody logged in, not loading, no error.
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: false,
    error: null
  });

  return {
    subscribe,   // Required for Svelte's $store syntax to work

    // ── updateFromPageData ──────────────────────────────────────────────
    // CALLED BY: +layout.svelte (or any page) on mount, passing in the
    // user that the server already validated.
    // This is NOT an async operation — the server already did the work.
    updateFromPageData: (user: User | null) => {
      set({
        user,
        loading: false,
        error: null
      });
    },

    // ── signIn ──────────────────────────────────────────────────────────
    // CALLED BY: LoginForm component when the user submits credentials.
    //
    // WHY invalidate('supabase:auth')?
    // SvelteKit caches load() results. After a successful sign-in the
    // server needs to re-run its session check. invalidate() tells
    // SvelteKit "the data keyed 'supabase:auth' is stale, re-fetch it."
    // The server's Handle middleware then picks up the new session cookie.
    signIn: async (email: string, password: string, supabase: any) => {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),  // normalise before sending
          password
        });

        if (error) throw error;

        // Tell SvelteKit the server data is stale → triggers layout re-run
        await invalidate('supabase:auth');

        return { success: true, error: null };
      } catch (err: any) {
        const error = handleAuthError(err);
        update(state => ({ ...state, loading: false, error }));
        return { success: false, error };
      }
    },

    // ── signOut ─────────────────────────────────────────────────────────
    // CALLED BY: Logout button / page.
    //
    // signOut() tells Supabase to invalidate the session on their end.
    // invalidate() + goto() then flush the local state and navigate away.
    // replaceState: true so the user can't press Back to return to a
    // page that requires auth.
    signOut: async (supabase: any) => {
      update(state => ({ ...state, loading: true }));

      try {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        await invalidate('supabase:auth');
        await goto('/login', { replaceState: true });

        return { success: true, error: null };
      } catch (err: any) {
        const error = err.message || 'Sign out failed';
        update(state => ({ ...state, loading: false, error }));
        return { success: false, error };
      }
    },

    // ── clearError ──────────────────────────────────────────────────────
    // CALLED BY: LoginForm when the user starts typing again (clears
    // the previous "Invalid credentials" message).
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

// ==========================================================================
// ERROR TRANSLATION
// ==========================================================================

/**
 * Maps Supabase auth error messages to user-friendly strings.
 * Supabase returns generic messages like "Invalid login credentials"
 * that are already pretty readable — but we normalise them here so
 * the app has a single place to tweak copy if needed.
 */
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

// ==========================================================================
// EXPORTS — The store instance + derived "view" stores
// ==========================================================================

// The single auth store. Import and use as: $auth.user, $auth.loading, etc.
export const auth = createAuthStore();

// Derived stores — each is a read-only "slice" of AuthState.
// Components subscribe to whichever one they need:
//   import { isAuthenticated } from '$lib/stores/auth';
//   {#if $isAuthenticated} ... {/if}
export const user            = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading       = derived(auth, $auth => $auth.loading);
export const authError       = derived(auth, $auth => $auth.error);
