/**
 * ============================================================================
 * SUPABASEHEALTH.TS — Database & Auth Health Checks
 * ============================================================================
 *
 * PURPOSE:
 * Two quick diagnostic checks that can be called from anywhere to verify
 * that the Supabase backend is reachable and the current user is
 * authenticated.
 *
 * ⚠️ RELATIONSHIP TO supabase.ts checkDatabaseHealth():
 * supabase.ts already exports checkDatabaseHealth() which does the same
 * SELECT count query. This class exists as a second entry point — likely
 * written before checkDatabaseHealth() was added to supabase.ts, or for
 * callers who prefer an OOP interface. Both are functionally identical
 * for the connection check.
 *
 * METHODS:
 *   checkConnection() → { connected: boolean, error?: string }
 *     Runs SELECT count FROM players LIMIT 1. If it succeeds, the DB
 *     is reachable and the 'players' table exists.
 *
 *   checkAuth()       → { authenticated: boolean, user?: User }
 *     Calls supabase.auth.getUser(). Returns the current user if a valid
 *     session exists, or { authenticated: false } if not.
 *     Note: getUser() makes a network request to Supabase Auth — it does
 *     NOT just read a local token. This means it's slightly slower than
 *     getSession() but confirms the token is still valid server-side.
 */

import { supabase } from '$lib/database/supabase';

export class SupabaseHealthCheck {
  /**
   * Test database connectivity.
   * A successful query proves: network is up, Supabase URL is correct,
   * anon key is valid, and the 'players' table exists.
   */
  static async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('players').select('count').limit(1);
      return { connected: !error, error: error?.message };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  /**
   * Test authentication status.
   * getUser() validates the session token against Supabase Auth servers.
   * Returns the full User object if valid; { authenticated: false } otherwise.
   */
  static async checkAuth(): Promise<{ authenticated: boolean; user?: any }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { authenticated: !error && !!user, user };
    } catch (err) {
      return { authenticated: false };
    }
  }
}
