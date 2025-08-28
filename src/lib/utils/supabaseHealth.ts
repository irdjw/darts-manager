import { supabase } from '$lib/database/supabase';

export class SupabaseHealthCheck {
  static async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('players').select('count').limit(1);
      return { connected: !error, error: error?.message };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  static async checkAuth(): Promise<{ authenticated: boolean; user?: any }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { authenticated: !error && !!user, user };
    } catch (err) {
      return { authenticated: false };
    }
  }
}