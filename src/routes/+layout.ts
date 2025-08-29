/*browser-only code (using document.cookie) is being executed during server-side rendering on Netlify. In your repo, 
src/routes/+layout.ts creates a Supabase browser client and defines cookie handlers that reference document. 
During SSR, document is not available, which triggers the “document is not defined” error you’re seeing in Netlify logs.*/

import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends }) => {
  // Revalidate when auth changes
  depends('supabase:auth');

  // Do not create a Supabase client here; that happens in +layout.svelte (client-only).
  // Just pass through the data provided by +layout.server.ts.
  return {
    session: data.session,
    user: data.user,
    userRole: data.userRole
  };
};

//Original Layout.ts
/*import type { LayoutLoad } from './$types';
import { createBrowserClient, isBrowser, parse } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
  depends('supabase:auth');

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: { fetch },
    cookies: {
      get(name) {
        if (!isBrowser) return undefined;
        return parse(document.cookie)[name];
      },
      set(name, value, options) {
        if (!isBrowser) return;
        document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge}` : ''}`;
      },
      remove(name, options) {
        if (!isBrowser) return;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      },
    },
  });

  return {
    supabase,
    session: data.session,
    user: data.user,
    userRole: data.userRole,
  };
};*/