/**
 * AmplieMed — Supabase Client Singleton
 * Used by the frontend for direct DB operations (with RLS).
 * Auth/Storage operations still go through the Edge Function server.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Credentials are now read from .env variables for global synchronization.
 * This allows different credentials per environment (dev/staging/prod).
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !publicAnonKey) {
  console.error(
    'Missing Supabase configuration. Check .env file:\n' +
    '  VITE_SUPABASE_URL\n' +
    '  VITE_SUPABASE_ANON_KEY'
  );
}

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, publicAnonKey);
  }
  return _supabase;
}

/** Get the current authenticated user's UUID (for owner_id on inserts) */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session?.user?.id ?? null;
}
