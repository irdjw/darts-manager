import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { browser } from '$app/environment';

let browserClient: any = null;

export function getSupabaseBrowserClient() {
  if (!browser) {
    throw new Error('Browser client can only be used in browser environment');
  }

  if (!browserClient) {
    browserClient = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get(name) {
          if (typeof document === 'undefined') return undefined;
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(name + '='))
            ?.split('=')[1];
        },
        set(name, value, options) {
          if (typeof document === 'undefined') return;
          let cookieString = `${name}=${value}; path=/`;
          if (options?.maxAge) {
            cookieString += `; max-age=${options.maxAge}`;
          }
          if (options?.secure) {
            cookieString += '; secure';
          }
          if (options?.sameSite) {
            cookieString += `; samesite=${options.sameSite}`;
          }
          document.cookie = cookieString;
        },
        remove(name, options) {
          if (typeof document === 'undefined') return;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    });
  }

  return browserClient;
}

export function createSupabaseAuthHandler() {
  if (!browser) return null;

  const client = getSupabaseBrowserClient();

  return {
    async signIn(email: string, password: string) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return { data, error: null };
      } catch (err) {
        return { 
          data: null, 
          error: err instanceof Error ? err : new Error('Authentication failed') 
        };
      }
    },

    async signOut() {
      try {
        const { error } = await client.auth.signOut();
        if (error) {
          throw new Error(error.message);
        }
        return { error: null };
      } catch (err) {
        return { 
          error: err instanceof Error ? err : new Error('Sign out failed') 
        };
      }
    },

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

    onAuthStateChange(callback: (event: string, session: any) => void) {
      return client.auth.onAuthStateChange(callback);
    }
  };
}