/**
 * Evolution API v2 — Service layer
 *
 * Single-instance model: one global WhatsApp number for all clinics.
 * The clinic name is prepended to each message for identification.
 *
 * Functions:
 *   1. buildWebhookUrl        — construct the global webhook endpoint URL
 *   2. registerWebhook        — register/update webhook on Evolution instance
 *   3. sendMessage            — send a WhatsApp text message (with clinic prefix)
 *   4. validateWebhookToken   — timing-safe token comparison
 *   5. processWebhookEvent    — handle MESSAGES_UPDATE & CONNECTION_UPDATE
 *
 * All Evolution API credentials are read from Deno.env — never hard-coded.
 */

import type {
  EvolutionSendTextRequest,
  EvolutionSendTextResponse,
  EvolutionSetWebhookRequest,
  EvolutionWebhookEventType,
  EvolutionWebhookPayload,
  EvolutionMessageUpdateEntry,
  EvolutionConnectionUpdateData,
  EvolutionMessageStatus,
  SendMessageResult,
} from './evolutionTypes.ts';

// ─── Configuration ────────────────────────────────────────────────────────────

function getEvolutionUrl(): string {
  const url = Deno.env.get('EVOLUTION_API_URL');
  if (!url) throw new Error('EVOLUTION_API_URL environment variable is not set');
  return url.replace(/\/$/, '');
}

function getEvolutionApiKey(): string {
  const key = Deno.env.get('EVOLUTION_API_KEY');
  if (!key) throw new Error('EVOLUTION_API_KEY environment variable is not set');
  return key;
}

function getInstanceName(): string {
  const name = Deno.env.get('EVOLUTION_INSTANCE_NAME');
  if (!name) throw new Error('EVOLUTION_INSTANCE_NAME environment variable is not set');
  return name;
}

function getWebhookSecret(): string {
  const secret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET');
  if (!secret) throw new Error('EVOLUTION_WEBHOOK_SECRET environment variable is not set');
  return secret;
}

/** Webhook events AmplieMed subscribes to */
const DEFAULT_WEBHOOK_EVENTS: EvolutionWebhookEventType[] = [
  'MESSAGES_UPDATE',
  'MESSAGES_UPSERT',
  'SEND_MESSAGE',
  'CONNECTION_UPDATE',
];

// ─── 1. buildWebhookUrl ───────────────────────────────────────────────────────

/**
 * Construct the global webhook URL.
 * Format: {EVOLUTION_WEBHOOK_BASE_URL}/{EVOLUTION_WEBHOOK_SECRET}
 */
export function buildWebhookUrl(): string {
  const base =
    Deno.env.get('EVOLUTION_WEBHOOK_BASE_URL') ||
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution_webhook`;
  const secret = getWebhookSecret();
  return `${base.replace(/\/$/, '')}/${secret}`;
}

// ─── 2. registerWebhook ───────────────────────────────────────────────────────

/**
 * Register (or overwrite) the global webhook on the Evolution API instance.
 * Calls POST /webhook/set/{instance}.
 *
 * @throws {Error} when the Evolution API returns a non-2xx status.
 */
export async function registerWebhook(): Promise<void> {
  const apiUrl = getEvolutionUrl();
  const apiKey = getEvolutionApiKey();
  const instanceName = getInstanceName();
  const webhookUrl = buildWebhookUrl();

  const body = {
    webhook: {
      url: webhookUrl,
      events: DEFAULT_WEBHOOK_EVENTS,
      webhook_by_events: false,
      webhook_base64: false,
      enabled: true,
    } as EvolutionSetWebhookRequest,
  };

  const res = await fetch(
    `${apiUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `Evolution API /webhook/set failed (${res.status}): ${
        (err as any)?.message || (err as any)?.error || res.statusText
      }`,
    );
  }
}

// ─── 3. sendMessage ───────────────────────────────────────────────────────────

/**
 * Send a WhatsApp text message via Evolution API.
 * Uses the global EVOLUTION_INSTANCE_NAME.
 *
 * The clinic name is prepended to the message so patients know which clinic
 * is contacting them:
 *   *[Clínica Nome]* \n{text}
 *
 * @param clinicName  Display name of the clinic (prepended to message)
 * @param phone       Patient phone — with or without country code
 * @param text        Message body
 * @param delayMs     Typing presence duration in ms (default 1200)
 */
export async function sendMessage(
  clinicName: string,
  phone: string,
  text: string,
  delayMs = 1200,
): Promise<SendMessageResult> {
  const apiUrl = getEvolutionUrl();
  const apiKey = getEvolutionApiKey();
  const instanceName = getInstanceName();

  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error(`Invalid phone number: "${phone}"`);
  }

  const fullText = `*[${clinicName}]*\n${text}`;

  const body: EvolutionSendTextRequest = {
    number: normalized,
    text: fullText,
    delay: delayMs,
    linkPreview: false,
  };

  const res = await fetch(
    `${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const detail = (err as any)?.message || (err as any)?.error || res.statusText;
    throw new Error(`Evolution API /message/sendText failed (${res.status}): ${detail}`);
  }

  const result = (await res.json()) as EvolutionSendTextResponse;

  return {
    evolutionMessageId: result.key.id,
    phone: normalized,
    status: result.status,
  };
}

// ─── 4. validateWebhookToken ──────────────────────────────────────────────────

/**
 * Compare two webhook tokens using a timing-safe byte-by-byte XOR.
 * Prevents timing attacks that would reveal partial token matches.
 *
 * @returns true only when both tokens are identical non-empty strings.
 */
export function validateWebhookToken(
  receivedToken: string,
  storedToken: string,
): boolean {
  if (!receivedToken || !storedToken) return false;

  const enc = new TextEncoder();
  const a = enc.encode(receivedToken);
  const b = enc.encode(storedToken);

  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return diff === 0;
}

// ─── 5. processWebhookEvent ───────────────────────────────────────────────────

/**
 * Persist and process an Evolution API webhook event.
 *
 * Supported events:
 *   - MESSAGES_UPDATE   → update delivery/read timestamps in communication_messages
 *   - CONNECTION_UPDATE → logged only (global instance, not per-clinic)
 *
 * All events are logged to evolution_webhook_logs first.
 */
export async function processWebhookEvent(
  payload: EvolutionWebhookPayload,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<void> {
  const { event, data, instance } = payload;

  // Always log the raw event first
  const { data: logRow, error: logErr } = await supabase
    .from('evolution_webhook_logs')
    .insert({
      clinic_id: null,
      instance_name: instance,
      event_type: event,
      payload,
      processed: false,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[evolutionService] Failed to insert webhook log:', logErr.message);
  }

  let processed = false;

  try {
    if (event === 'MESSAGES_UPDATE') {
      const updates: EvolutionMessageUpdateEntry[] = Array.isArray(data)
        ? (data as EvolutionMessageUpdateEntry[])
        : [data as EvolutionMessageUpdateEntry];

      await handleMessagesUpdate(updates, supabase);
      processed = true;
    } else if (event === 'CONNECTION_UPDATE') {
      const { state } = data as EvolutionConnectionUpdateData;
      console.log(`[evolutionService] Connection update — instance: ${instance}, state: ${state}`);
      processed = true;
    } else {
      processed = true;
    }
  } catch (err) {
    console.error(`[evolutionService] Error processing ${event}:`, (err as Error).message);
  }

  if (logRow?.id) {
    await supabase
      .from('evolution_webhook_logs')
      .update({ processed })
      .eq('id', logRow.id)
      .catch(() => {});
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function handleMessagesUpdate(
  updates: EvolutionMessageUpdateEntry[],
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<void> {
  for (const update of updates) {
    const evolutionMessageId = update?.key?.id;
    const evoStatus = update?.update?.status as EvolutionMessageStatus | undefined;

    if (!evolutionMessageId || !evoStatus) continue;

    const now = new Date().toISOString();
    // deno-lint-ignore no-explicit-any
    const patch: Record<string, any> = {};

    switch (evoStatus) {
      case 'SENT':
        patch.status = 'sent';
        break;

      case 'DELIVERED':
        patch.status = 'delivered';
        patch.delivery_timestamp = now;
        break;

      case 'READ':
      case 'PLAYED':
        patch.status = 'read';
        patch.delivery_timestamp = now;
        patch.read_timestamp = now;
        break;

      case 'ERROR':
      case 'DELETE':
        patch.status = 'failed';
        patch.failure_reason = `WhatsApp status: ${evoStatus}`;
        break;

      default:
        continue;
    }

    const { error } = await supabase
      .from('communication_messages')
      .update(patch)
      .eq('evolution_message_id', evolutionMessageId);

    if (error) {
      console.error(
        `[evolutionService] Failed to update message ${evolutionMessageId}:`,
        error.message,
      );
    }
  }
}

// ─── Phone normalization ──────────────────────────────────────────────────────

/**
 * Normalize a Brazilian phone number to the format expected by Evolution API.
 * - Strips all non-digit characters
 * - Prepends Brazilian DDI +55 if absent
 * - Returns null for empty or clearly invalid inputs
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (!digits) return null;

  // Already includes Brazilian DDI +55 (12 digits: 55+DDD+8-digit, or 13: 55+DDD+9-digit)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Local BR number without DDI (10 digits: DDD+8-digit, or 11: DDD+9-digit)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}
