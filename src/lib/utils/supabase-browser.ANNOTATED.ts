/**
 * ============================================================================
 * SUPABASE-BROWSER.TS — Browser-Side Supabase Client (SSR Package)
 * ============================================================================
 *
 * PURPOSE:
 * Creates a Supabase client using @supabase/ssr's createBrowserClient.
 * This is a SECOND browser client — the main one lives in supabase.ts
 * (created with @supabase/supabase-js's createClient).
 *
 * WHY TWO CLIENTS?
 * @supabase/ssr's createBrowserClient is designed to work with cookie-based
 * auth in SSR frameworks (SvelteKit, Next.js). It reads and writes session
 * tokens via cookies rather than localStorage. This makes it compatible
 * with the server client (created in hooks.server.ts with createServerClient)
 * — both share the same session via cookies.
 *
 * The main client in supabase.ts uses localStorage for session storage
 * (configured explicitly). It works fine for purely client-side operations
 * but the session won't automatically be available on the server.
 *
 * SINGLETON PATTERN:
 * getSupabaseBrowserClient() creates the client lazily on first call and
 * caches it in a module-level variable. Subsequent calls return the same
 * instance. This avoids creating multiple client instances (each would
 * maintain its own connection pool).
 *
 * COOKIE HANDLERS:
 * The client needs custom cookie get/set/remove functions because the
 * browser doesn't expose cookies as a structured API — only as the
 * document.cookie string. These three functions parse and manipulate
 * that string manually.
 *
 * AUTH HANDLER:
 * createSupabaseAuthHandler() wraps the client's auth methods (signIn,
 * signOut, getSession, onAuthStateChange) in a consistent error-handling
 * interface. Each method returns { data/session, error } rather than
 * throwing, matching the pattern used throughout the app.
 *
 * ⚠️ NOTES:
 *   - This client is browser-only. getSupabaseBrowserClient() throws if
 *     called on the server (typeof window check via `browser` import).
 *   - The cookie remove() function ignores the options parameter — it
 *     always sets path=/ and expires in the past. If the cookie was set
 *     with a different path, this won't remove it.
 */

import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { browser } from '$app/environment';

// ==========================================================================
// SINGLETON CLIENT
// ==========================================================================

let browserClient: any = null;   // Cached instance — created once, reused

/**
 * Get (or create) the SSR-compatible browser Supabase client.
 * Throws if called on the server — this client MUST run in the browser.
 */
export function getSupabaseBrowserClient() {
  if (!browser) {
    throw new Error('Browser client can only be used in browser environment');
  }

  // Lazy initialisation — create on first call, return cached on subsequent calls
  if (!browserClient) {
    browserClient = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        // ── get ─────────────────────────────────────────────────────────
        // Parse document.cookie string to find a specific cookie by name.
        // document.cookie returns: "name1=value1; name2=value2; ..."
        get(name) {
          if (typeof document === 'undefined') return undefined;
          return document.cookie
            .split('; ')                               // Split into individual cookies
            .find(row => row.startsWith(name + '='))   // Find our cookie
            ?.split('=')[1];                           // Extract the value part
        },

        // ── set ─────────────────────────────────────────────────────────
        // Build a cookie string manually and assign to document.cookie.
        // Each assignment ADDS or UPDATES one cookie (doesn't replace all).
        set(name, value, options) {
          if (typeof document === 'undefined') return;
          let cookieString = `${name}=${value}; path=/`;
          if (options?.maxAge)    cookieString += `; max-age=${options.maxAge}`;
          if (options?.secure)    cookieString += '; secure';
          if (options?.sameSite)  cookieString += `; samesite=${options.sameSite}`;
          document.cookie = cookieString;
        },

        // ── remove ──────────────────────────────────────────────────────
        // "Removing" a cookie = setting it with an expiry in the past.
        // ⚠️ options parameter is ignored — always uses path=/.
        remove(name, options) {
          if (typeof document === 'undefined') return;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    });
  }

  return browserClient;
}

// ==========================================================================
// AUTH HANDLER
// ==========================================================================

/**
 * Create an auth handler object with sign-in, sign-out, session retrieval,
 * and state-change subscription. Each method wraps the raw Supabase auth
 * call in try/catch and returns a consistent { data/session, error } shape.
 *
 * Returns null on the server (auth operations are browser-only).
 */
export function createSupabaseAuthHandler() {
  if (!browser) return null;

  const client = getSupabaseBrowserClient();

  return {
    /**
     * Sign in with email + password.
     * Returns { data: AuthResponse, error: null } on success.
     * Returns { data: null, error: Error } on failure.
     */
    async signIn(email: string, password: string) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });

        if (error) throw new Error(error.message);

        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Authentication failed')
        };
      }
    },

    /**
     * Sign out the current user. Invalidates the session cookie.
     */
    async signOut() {
      try {
        const { error } = await client.auth.signOut();
        if (error) throw new Error(error.message);
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Sign out failed')
        };
      }
    },

    /**
     * Get the current session (if any).
     * session = null means not logged in.
     */
    async getSession() {
      try {
        const { data: { session }, error } = await client.auth.getSession();
        return { session, error };
      } catch (err) {
        return {
          session: null,
          error: err instanceof Error ? err : new Error('Session retrieval failed')
        };
      }
    },

    /**
     * Subscribe to auth state changes (login, logout, token refresh).
     * callback(event, session) fires on every change.
     * Returns an unsubscribe function.
     */
    onAuthStateChange(callback: (event: string, session: any) => void) {
      return client.auth.onAuthStateChange(callback);
    }
  };
}
