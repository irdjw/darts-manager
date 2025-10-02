import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Validate environment variables
if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

if (!PUBLIC_SUPABASE_URL.startsWith('https://')) {
  throw new Error('Invalid Supabase URL format. Must start with https://');
}

// Create browser-safe Supabase client
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

// Only test connection in browser environment
if (browser) {
  testConnection();
}

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return;
    }

    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

export function handleDatabaseError(error: any): string {
  // Handle common PostgreSQL error codes
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
  
  // Handle network/connection errors
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  
  // Handle timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Handle authentication errors
  if (error.status === 401) {
    return 'Authentication required. Please log in again.';
  }
  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  
  // Handle server errors
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  // Return the original error message or a generic fallback
  return error.message || error.details || 'Database operation failed';
}

// Connection health check utility
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('players').select('count').limit(1);
    return { healthy: !error, error: error?.message };
  } catch (err: any) {
    return { healthy: false, error: handleDatabaseError(err) };
  }
}

// Retry utility for critical operations
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error);
      
      // Don't retry on certain error types
      if (error.code === 'PGRST116' || // Not found
          error.code === '23505' ||    // Unique constraint
          error.status === 401 ||      // Unauthorized
          error.status === 403) {      // Forbidden
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts: ${handleDatabaseError(lastError)}`);
}