/**
 * ============================================================================
 * HOOKS.SERVER.TS — SvelteKit Server-Side Request Interceptor
 * ============================================================================
 *
 * PURPOSE:
 * This file runs on EVERY HTTP request to the app, before the route handler
 * executes. It's SvelteKit's middleware layer. This one does three things:
 *   1. Creates a Supabase client that can read auth cookies
 *   2. Checks if the user is authenticated
 *   3. Redirects unauthenticated users to /auth for protected routes
 *
 * HOW SVELTKIT HOOKS WORK:
 * - `handle` is called for every request
 * - `event` contains the request details (URL, cookies, headers)
 * - `resolve` actually runs the route handler and returns the response
 * - We can modify the event BEFORE resolve (add user info)
 *   and modify the response AFTER resolve (add headers)
 *
 * SUPABASE SERVER CLIENT:
 * The browser Supabase client stores auth tokens in localStorage.
 * On the server, there's no localStorage — tokens are in cookies instead.
 * createServerClient wraps the cookie jar so Supabase can read/write
 * auth state from the request cookies.
 *
 * AUTHENTICATION FLOW:
 *   1. User logs in via /auth → Supabase sets auth cookies
 *   2. Next request comes in → this hook reads those cookies
 *   3. supabase.auth.getSession() validates the token
 *   4. If valid → attach user to event.locals (available in all route handlers)
 *   5. If invalid + protected route → redirect to /auth
 *
 * PUBLIC vs PROTECTED ROUTES:
 * Only 4 routes don't need login: /, /auth, /login, /offline
 * Everything else requires authentication.
 *
 * event.locals:
 * A request-scoped object that persists through the handler chain.
 * We attach `user` and `supabase` here so that +page.server.ts and
 * +layout.server.ts files can access them without re-authenticating.
 */

import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * HANDLE — The main hook function
 *
 * PARAMETERS:
 * - event:   The request context. Contains cookies, URL, locals, etc.
 * - resolve: Call this to actually run the matched route handler.
 *            Without calling resolve, the request goes nowhere.
 *
 * RETURNS: The HTTP response (possibly modified with extra headers).
 */
export const handle: Handle = async ({ event, resolve }) => {

  // ==========================================================================
  // STEP 1: Create a server-side Supabase client
  // ==========================================================================
  // The cookie adapter lets Supabase read/write auth tokens from HTTP cookies.
  // get/set/remove map directly to SvelteKit's event.cookies API.
  // path: '/' ensures auth cookies are sent on ALL routes (not just the
  // route that set them).
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

  // ==========================================================================
  // STEP 2: Validate the session
  // ==========================================================================
  // getSession() checks if there's a valid auth token in the cookies.
  // If the token is expired, Supabase refreshes it automatically.
  // Returns: { session: { user: {...} } } on success, or { session: null } if not logged in.
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // If we have a valid session, attach the user to event.locals.
  // This makes event.locals.user available in ALL route handlers for this request.
  if (session?.user && !error) {
    event.locals.user = session.user;
  }

  // ==========================================================================
  // STEP 3: Route protection — redirect if not authenticated
  // ==========================================================================
  // PUBLIC ROUTES: These pages are accessible without login.
  //   /        → Homepage / landing page
  //   /auth    → Login page (where unauthenticated users are sent)
  //   /login   → Alternative login entry point
  //   /offline → Shown when the app can't reach the server
  const path = event.url.pathname;
  const publicRoutes = ['/', '/auth', '/login', '/offline'];
  const requiresAuth = !publicRoutes.includes(path);

  // If the route needs auth but there's no session → redirect to login
  // The redirect URL is encoded as a query param so we can send them back
  // after they log in. e.g., /auth?redirect=%2Fteam-selection%2F4
  if (requiresAuth && !session?.user) {
    throw redirect(302, `/auth?redirect=${encodeURIComponent(path)}`);
  }

  // ==========================================================================
  // STEP 4: Attach supabase client to locals
  // ==========================================================================
  // Route handlers (e.g., +page.server.ts) can use event.locals.supabase
  // to make authenticated database queries without creating their own client.
  event.locals.supabase = supabase;

  // ==========================================================================
  // STEP 5: Run the actual route handler and get the response
  // ==========================================================================
  // filterSerializedResponseHeaders: Only pass through 'content-range'
  // from Supabase responses. Other Supabase headers (like x-cost) would
  // cause issues if forwarded to the browser.
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });

  // ==========================================================================
  // STEP 6: Add no-cache headers to the response
  // ==========================================================================
  // WHY NO CACHE?
  // The app's data changes frequently (scores, attendance, team selection).
  // Browser caching would show stale data. These headers force the browser
  // to always fetch fresh content from the server.
  //
  // Cache-Control: no-cache, no-store, must-revalidate — don't cache at all
  // Pragma: no-cache — legacy HTTP/1.0 equivalent
  // Expires: 0 — immediately expired (belt-and-suspenders)
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
};
