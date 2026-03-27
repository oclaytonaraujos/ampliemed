/**
 * evolution_webhook — Supabase Edge Function
 *
 * Receives and processes POST webhook events from Evolution API v2.
 *
 * Route:  POST /functions/v1/evolution_webhook/{secret}
 *
 * Security model:
 *   - Single global token from EVOLUTION_WEBHOOK_SECRET env var
 *   - Token extracted from URL path and compared timing-safely
 *   - No JWT required — this endpoint is called by Evolution API, not the SPA
 *
 * Performance:
 *   - Returns HTTP 200 within the validation window (~50ms)
 *   - Event processing continues asynchronously (fire-and-forget)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import {
  validateWebhookToken,
  processWebhookEvent,
} from '../_shared/evolutionService.ts';
import type { EvolutionWebhookPayload } from '../_shared/evolutionTypes.ts';

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // ── Validate global webhook secret ────────────────────────────────────────────
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const fnIndex = segments.findLastIndex((s) => s === 'evolution_webhook');
  const receivedToken = segments[fnIndex + 1] ?? url.searchParams.get('secret') ?? '';

  const storedSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET') ?? '';

  if (!validateWebhookToken(receivedToken, storedSecret)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // ── Parse payload ─────────────────────────────────────────────────────────────
  let payload: EvolutionWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Respond 200 immediately — Evolution API requires fast acknowledgement ─────
  const response = jsonResponse({ received: true });

  processWebhookEvent(payload, supabase).catch((err: Error) => {
    console.error(
      `[evolution_webhook] Background processing error (event=${payload.event}):`,
      err.message,
    );
  });

  return response;
});

// ─── Utility ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
