
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase: SupabaseClient = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);

// Type-safe error handling
export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

export const handleDatabaseError = (error: any): DatabaseError => ({
  message: error?.message || 'An unexpected error occurred',
  code: error?.code || 'UNKNOWN',
  details: error?.details
});
