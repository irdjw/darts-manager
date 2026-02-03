/**
 * ============================================================================
 * SUPABASE.TS — Database Connection, Error Handling, and Retry Logic
 * ============================================================================
 *
 * PURPOSE:
 * The single entry point for all database operations. Creates the Supabase
 * client, exports it for use across the app, and provides two critical
 * utilities: error translation and retry logic.
 *
 * THREE EXPORTS:
 *   1. supabase              — The configured Supabase client instance
 *   2. handleDatabaseError() — Translates cryptic error codes into readable messages
 *   3. retryDatabaseOperation() — Wraps operations with automatic retry + backoff
 *   4. checkDatabaseHealth() — Quick connectivity test (bonus utility)
 *
 * BROWSER vs SERVER:
 * This file creates a BROWSER client (using createClient from @supabase/supabase-js).
 * The server has its own client created in hooks.server.ts using createServerClient.
 * The browser variable from '$app/environment' tells us which context we're in.
 *
 * ENVIRONMENT VARIABLES:
 * PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY come from .env files.
 * They're PUBLIC because the anon key is safe for client-side use
 * (Row Level Security policies control access, not the key itself).
 *
 * CONNECTION TEST:
 * On first load in the browser, testConnection() runs a quick SELECT
 * to verify the database is reachable. Logs ✅ or ❌ to console.
 * This is a development aid — not critical for production.
 */

import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// ==========================================================================
// ENVIRONMENT VALIDATION — Fail fast if config is missing
// ==========================================================================
// These checks run at module load time (before any queries).
// If the .env file is missing or misconfigured, the app crashes immediately
// with a clear error — rather than failing mysteriously on the first query.
if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

if (!PUBLIC_SUPABASE_URL.startsWith('https://')) {
  throw new Error('Invalid Supabase URL format. Must start with https://');
}

// ==========================================================================
// SUPABASE CLIENT — The main database connection
// ==========================================================================
//
// AUTH CONFIG:
// - persistSession: true     → Saves the auth token so users stay logged in
//                                across page refreshes
// - autoRefreshToken: true   → Automatically refreshes the JWT before it expires
//                                (tokens last 1 hour by default)
// - detectSessionInUrl: true → Handles OAuth redirect URLs that contain
//                                the session token as a URL fragment
// - flowType: 'pkce'         → Uses PKCE (Proof Key for Code Exchange) for OAuth.
//                                More secure than the default implicit flow.
// - storage: localStorage    → Where to persist the session (browser only).
//                                undefined on server (SSR doesn't have localStorage).
// - storageKey               → Namespaced key to avoid conflicts if multiple
//                                Supabase apps run on the same domain.
//
// DB CONFIG:
// - schema: 'public'         → Which PostgreSQL schema to use (default)
//
// GLOBAL HEADERS:
// - X-Client-Info            → Identifies this client in Supabase logs
// - Content-Type             → Standard JSON header
//
// REALTIME:
// - eventsPerSecond: 10      → Rate limit for real-time subscriptions.
//                                10/s is generous — prevents flooding.
export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: browser ? window.localStorage : undefined,
    storageKey: 'isaac-wilson-darts-auth'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'darts-manager@2.0.0',
      'Content-Type': 'application/json'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// ==========================================================================
// CONNECTION TEST — Only runs in the browser, not on server
// ==========================================================================
// browser is true in the browser, false during SSR.
// We only test in the browser because the server client is created separately.
if (browser) {
  testConnection();
}

/**
 * Test the database connection by running a minimal query.
 * Logs success or failure to the console. Non-blocking (no await at call site).
 */
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .limit(1);                    // Just need to know it responds

    if (error) {
      console.error('Supabase connection error:', error);
      return;
    }

    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

// ==========================================================================
// ERROR HANDLER — Translate error codes into human-readable messages
// ==========================================================================

/**
 * HANDLE DATABASE ERROR — Maps cryptic codes to friendly messages
 *
 * CALLED BY: Every database service method's catch block.
 *
 * ERROR CODE REFERENCE:
 *
 * PGRST (PostgREST — Supabase's REST layer):
 *   PGRST116 → .single() found no rows. Usually means "record not found"
 *   PGRST204 → Invalid request format (e.g., bad onConflict constraint)
 *   PGRST100 → Schema error (table doesn't exist, wrong column name)
 *   PGRST301 → Connection to PostgreSQL failed
 *
 * PostgreSQL (23xxx = integrity constraint violations):
 *   23505    → Unique constraint violation (tried to insert a duplicate)
 *   23503    → Foreign key violation (referenced record doesn't exist)
 *   23502    → NOT NULL violation (required field is missing)
 *   23514    → CHECK constraint violation (value fails a validation rule)
 *
 * HTTP STATUS CODES:
 *   401      → Unauthenticated (token missing or expired)
 *   403      → Unauthorized (RLS policy denied access)
 *   500+     → Server-side error (Supabase infrastructure issue)
 *
 * NETWORK:
 *   NetworkError / fetch errors → Internet connection issue
 *   TimeoutError / timeout      → Server took too long to respond
 */
export function handleDatabaseError(error: any): string {
  // PostgREST errors
  if (error.code === 'PGRST116') {
    return 'Record not found';
  }
  if (error.code === '23505') {
    return 'This record already exists';
  }
  if (error.code === '23503') {
    return 'Cannot delete - record is referenced by other data';
  }
  if (error.code === '23502') {
    return 'Required field is missing';
  }
  if (error.code === '23514') {
    return 'Data violates constraints';
  }
  if (error.code === 'PGRST301') {
    return 'Database connection failed';
  }
  if (error.code === 'PGRST204') {
    return 'Invalid request format';
  }
  if (error.code === 'PGRST100') {
    return 'Database schema error';
  }

  // Network / connectivity errors
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // HTTP status-based errors
  if (error.status === 401) {
    return 'Authentication required. Please log in again.';
  }
  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }

  // Fallback: use whatever message the error provides, or a generic message
  return error.message || error.details || 'Database operation failed';
}

// ==========================================================================
// HEALTH CHECK — Quick connectivity test utility
// ==========================================================================

/**
 * CHECK DATABASE HEALTH — Returns { healthy: true/false, error?: string }
 *
 * CALLED BY: Health check endpoints, monitoring dashboards
 *
 * Simply runs SELECT count FROM players. If it succeeds, the database is
 * reachable and the schema is intact. If not, returns the error message.
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('players').select('count').limit(1);
    return { healthy: !error, error: error?.message };
  } catch (err: any) {
    return { healthy: false, error: handleDatabaseError(err) };
  }
}

// ==========================================================================
// RETRY UTILITY — Automatic retry with exponential backoff
// ==========================================================================

/**
 * RETRY DATABASE OPERATION — Wraps a DB operation with automatic retries
 *
 * CALLED BY: DashboardService write methods (saveLeagueGame, completeFixture, etc.)
 *
 * PARAMETERS:
 * - operation:   An async function that performs the DB operation
 * - maxRetries:  How many times to try (default 3)
 * - delayMs:     Base delay between retries (default 1000ms)
 *
 * EXPONENTIAL BACKOFF:
 * Each retry waits longer than the last:
 *   Attempt 1: fails → wait 1000ms (1 × delayMs)
 *   Attempt 2: fails → wait 2000ms (2 × delayMs)
 *   Attempt 3: fails → throw error
 * This prevents hammering a struggling server.
 *
 * ERRORS THAT ARE NOT RETRIED:
 * Some errors are permanent — retrying won't help:
 *   PGRST116 (not found)    → The record doesn't exist, retrying won't create it
 *   23505 (unique violation) → The duplicate exists, retrying won't remove it
 *   401 (unauthorized)       → Token is invalid, retrying won't fix auth
 *   403 (forbidden)          → RLS policy denied access, retrying won't change policy
 *
 * ERRORS THAT ARE RETRIED:
 * Transient/network errors — the operation might succeed next time:
 *   Network timeouts, connection resets, 500 server errors
 *
 * GENERIC TYPE <T>:
 * The return type matches whatever the operation returns.
 * retryDatabaseOperation<Player[]>(() => fetchPlayers()) → returns Player[]
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();  // Try the operation
    } catch (error: any) {
      lastError = error;
      console.error(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error);

      // DON'T RETRY these — they're permanent failures
      if (error.code === 'PGRST116' ||  // Not found
          error.code === '23505' ||      // Unique constraint violation
          error.status === 401 ||        // Unauthorized
          error.status === 403) {        // Forbidden
        throw error;                     // Rethrow immediately
      }

      // Wait before next attempt (exponential backoff)
      // Don't wait after the last attempt — just fall through to the throw below
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  // All retries exhausted — throw with a summary message
  throw new Error(`Operation failed after ${maxRetries} attempts: ${handleDatabaseError(lastError)}`);
}
