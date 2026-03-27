/**
 * evolution_send_message — Supabase Edge Function
 *
 * Sends a real WhatsApp message via Evolution API v2 and updates the
 * corresponding communication_messages record in the database.
 *
 * POST /functions/v1/evolution_send_message
 *
 * Request body:
 *   {
 *     clinicId:    string  (required) — UUID of the clinic
 *     phone:       string  (required) — patient phone (any Brazilian format)
 *     text:        string  (required) — message body
 *     messageId?:  string  (optional) — existing communication_messages.id to update
 *   }
 *
 * Response 200:
 *   { success: true, evolutionMessageId: string, phone: string }
 *
 * Errors: 400 Bad Request | 401 Unauthorized | 403 Forbidden |
 *         422 Unprocessable Entity | 500 Internal Server Error
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { sendMessage } from '../_shared/evolutionService.ts';

// ─── Request/response shapes ──────────────────────────────────────────────────

interface SendMessageBody {
  clinicId: string;
  phone: string;
  text: string;
  messageId?: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // ── 1. Parse & validate body ─────────────────────────────────────────────────
  let body: SendMessageBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { clinicId, phone, text, messageId } = body;

  if (!clinicId || !phone || !text) {
    return jsonResponse(
      { error: 'Missing required fields', required: ['clinicId', 'phone', 'text'] },
      400,
    );
  }

  if (text.trim().length === 0) {
    return jsonResponse({ error: 'Message text cannot be empty' }, 400);
  }

  // ── 2. Authenticate caller ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  const jwt = authHeader?.replace('Bearer ', '').trim();

  if (!jwt) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Unauthorized — invalid or expired token' }, 401);
  }

  const userId = authData.user.id;

  // ── 3. Verify clinic membership ───────────────────────────────────────────────
  const { data: membership, error: membershipError } = await supabase
    .from('clinic_memberships')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (membershipError) {
    console.error('[evolution_send_message] Membership check error:', membershipError.message);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }

  if (!membership) {
    return jsonResponse(
      { error: 'Forbidden — you are not a member of this clinic' },
      403,
    );
  }

  // ── 4. Get Evolution instance for this clinic ─────────────────────────────────
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('name, evolution_instance_id')
    .eq('id', clinicId)
    .single();

  if (clinicError) {
    console.error('[evolution_send_message] Clinic query error:', clinicError.message);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }

  if (!clinic?.evolution_instance_id) {
    return jsonResponse(
      {
        error: 'Evolution API not configured for this clinic',
        hint: 'Set clinics.evolution_instance_id before sending WhatsApp messages',
      },
      422,
    );
  }

  const clinicName: string = clinic.name;

  // ── 5. Mark message as in-flight (if messageId provided) ──────────────────────
  if (messageId) {
    await supabase
      .from('communication_messages')
      .update({ status: 'pending' })
      .eq('id', messageId)
      .then(null, () => {}); // non-fatal
  }

  // ── 6. Send via Evolution API ─────────────────────────────────────────────────
  try {
    const result = await sendMessage(clinicName, phone, text);

    // ── 7. Persist success ────────────────────────────────────────────────────────
    if (messageId) {
      const { error: updateError } = await supabase
        .from('communication_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          evolution_message_id: result.evolutionMessageId,
          failure_reason: null,
        })
        .eq('id', messageId);

      if (updateError) {
        console.error(
          '[evolution_send_message] Failed to update message record:',
          updateError.message,
        );
      }
    }

    // Audit log
    await supabase
      .from('audit_log')
      .insert({
        owner_id: userId,
        clinic_id: clinicId,
        user_name: authData.user.email || userId,
        user_role: 'system',
        action: 'whatsapp_sent',
        module: 'communication',
        description: `WhatsApp enviado para ${result.phone} via Evolution API`,
        status: 'success',
        metadata: { evolutionMessageId: result.evolutionMessageId, messageId },
      })
      .then(null, () => {});

    return jsonResponse({
      success: true,
      evolutionMessageId: result.evolutionMessageId,
      phone: result.phone,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[evolution_send_message] Send failed:', reason);

    // Persist failure
    if (messageId) {
      await supabase
        .from('communication_messages')
        .update({
          status: 'failed',
          failure_reason: reason,
        })
        .eq('id', messageId)
        .then(null, () => {});
    }

    return jsonResponse(
      { error: 'Failed to send WhatsApp message', detail: reason },
      500,
    );
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
