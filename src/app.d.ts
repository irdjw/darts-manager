import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      getUser(): Promise<User | null>;
    }
    interface PageData {
      user: User | null;
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {};