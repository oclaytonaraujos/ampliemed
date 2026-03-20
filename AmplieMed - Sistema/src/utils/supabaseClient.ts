/**
 * AmplieMed — Supabase Client Singleton
 * Used by the frontend for direct DB operations (with RLS).
 * Auth/Storage operations still go through the Edge Function server.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

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
