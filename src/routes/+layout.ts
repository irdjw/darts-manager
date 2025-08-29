import type { LayoutLoad } from './$types';
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
};