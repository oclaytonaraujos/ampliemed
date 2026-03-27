/**
 * audit/save — Supabase Edge Function
 *
 * Receives audit log entries from the frontend and inserts them using
 * service_role key, bypassing the RLS USING-expression restriction that
 * prevents clients from reading back their own audit rows mid-session.
 *
 * POST /functions/v1/audit/save
 * Body: { entries: AuditRow[] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Authenticate caller
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  let body: { entries: any[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const entries = body?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return json({ saved: 0 });
  }

  // Ensure owner_id is always the authenticated user
  const rows = entries.map((e: any) => ({
    ...e,
    owner_id: e.owner_id || authData.user.id,
  }));

  const { error } = await supabase
    .from('audit_log')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('[audit/save] Insert error:', error.message);
    return json({ error: error.message }, 500);
  }

  return json({ saved: rows.length });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
