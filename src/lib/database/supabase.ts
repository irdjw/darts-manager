import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Validate environment variables
if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

if (!PUBLIC_SUPABASE_URL.startsWith('https://')) {
  throw new Error('Invalid Supabase URL format. Must start with https://');
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'darts-manager@2.0.0'
    }
  }
});

// Test connection on initialization
supabase.from('players').select('count').limit(1).then(({ error }) => {
  if (error) {
    console.error('Supabase connection failed:', error);
  } else {
    console.log('Supabase connected successfully');
  }
});

export function handleDatabaseError(error: any): string {
  if (error.code === 'PGRST116') {
    return 'Record not found';
  }
  if (error.code === '23505') {
    return 'This record already exists';
  }
  if (error.code === '23503') {
    return 'Cannot delete - record is referenced by other data';
  }
  if (error.code === 'PGRST301') {
    return 'Database connection failed';
  }
  return error.message || 'Database operation failed';
}