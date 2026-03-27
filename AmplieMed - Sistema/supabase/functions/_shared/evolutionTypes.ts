/**
 * Evolution API v2 — TypeScript type definitions
 *
 * Covers message sending, webhook payloads, and connection management.
 * Reference: Evolution API v2.3.x
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Message delivery status as reported by Evolution API */
export type EvolutionMessageStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'PLAYED'
  | 'ERROR'
  | 'DELETE';

/** WhatsApp instance connection state */
export type EvolutionConnectionState = 'open' | 'close' | 'connecting';

/** All webhook event types emitted by Evolution API */
export type EvolutionWebhookEventType =
  | 'APPLICATION_STARTUP'
  | 'QRCODE_UPDATED'
  | 'CONNECTION_UPDATE'
  | 'MESSAGES_SET'
  | 'MESSAGES_UPSERT'
  | 'MESSAGES_UPDATE'
  | 'MESSAGES_DELETE'
  | 'SEND_MESSAGE'
  | 'CONTACTS_SET'
  | 'CONTACTS_UPSERT'
  | 'CONTACTS_UPDATE'
  | 'PRESENCE_UPDATE'
  | 'CHATS_SET'
  | 'CHATS_UPSERT'
  | 'CHATS_UPDATE'
  | 'CHATS_DELETE'
  | 'GROUPS_UPSERT'
  | 'GROUPS_UPDATE'
  | 'GROUP_PARTICIPANTS_UPDATE'
  | 'CALL'
  | 'NEW_TOKEN'
  | 'TYPEBOT_START'
  | 'TYPEBOT_CHANGE_STATUS'
  | 'LABELS_EDIT'
  | 'LABELS_ASSOCIATION';

// ─── Message key (identifies a specific WA message) ──────────────────────────

export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

// ─── Send text request / response ────────────────────────────────────────────

export interface EvolutionSendTextRequest {
  /** Recipient phone with country code, e.g. "5511999999999" */
  number: string;
  /** Message text (plain or with WhatsApp markdown) */
  text: string;
  /** Typing presence delay in ms before sending (simulates human typing) */
  delay?: number;
  /** Show link preview when message contains a URL */
  linkPreview?: boolean;
  /** Quote / reply to an existing message */
  quoted?: {
    key: { id: string };
    message: { conversation: string };
  };
  /** Mention specific JIDs in the message */
  mentioned?: string[];
}

export interface EvolutionSendTextResponse {
  key: EvolutionMessageKey;
  message: {
    conversation?: string;
    [key: string]: unknown;
  };
  messageTimestamp: string;
  status: EvolutionMessageStatus;
}

// ─── Webhook configuration ────────────────────────────────────────────────────

export interface EvolutionSetWebhookRequest {
  /** Full HTTPS URL that will receive POST requests */
  url: string;
  /** Event types to subscribe to */
  events: EvolutionWebhookEventType[];
  /** Append event name as path suffix: {url}/messages-upsert */
  webhook_by_events?: boolean;
  /** Send media content as base64 instead of URL */
  webhook_base64?: boolean;
  /** Custom headers added to every webhook POST */
  headers?: Record<string, string>;
}

// ─── Webhook event payloads ───────────────────────────────────────────────────

export interface EvolutionMessageUpdateEntry {
  key: EvolutionMessageKey;
  update: {
    status: EvolutionMessageStatus;
    pollUpdates?: unknown[];
  };
}

export interface EvolutionConnectionUpdateData {
  instance: string;
  state: EvolutionConnectionState;
  /** Reason code from WhatsApp (e.g. 401 = logged out) */
  statusReason?: number;
}

export interface EvolutionMessagesUpsertData {
  key: EvolutionMessageKey;
  pushName?: string;
  message: Record<string, unknown>;
  messageType: string;
  messageTimestamp: number;
  instanceId?: string;
  source?: string;
}

/**
 * Top-level webhook payload received on POST /{clinicId}/{token}.
 * `data` type varies by event — use a type guard or cast after checking `event`.
 */
export interface EvolutionWebhookPayload {
  event: EvolutionWebhookEventType;
  instance: string;
  apikey?: string;
  /** Content varies by event type */
  data:
    | EvolutionMessageUpdateEntry
    | EvolutionMessageUpdateEntry[]
    | EvolutionConnectionUpdateData
    | EvolutionMessagesUpsertData
    | unknown;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
}

// ─── Instance management ──────────────────────────────────────────────────────

export interface EvolutionCreateInstanceRequest {
  instanceName: string;
  integration: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
  token?: string;
  qrcode?: boolean;
  number?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  webhook?: EvolutionSetWebhookRequest;
}

export interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: { apikey: string };
  settings: {
    reject_call: boolean;
    msg_call: string;
    groups_ignore: boolean;
    always_online: boolean;
    read_messages: boolean;
    read_status: boolean;
    sync_full_history: boolean;
  };
}

export interface EvolutionConnectionStateResponse {
  instance: {
    instanceName: string;
    state: EvolutionConnectionState;
  };
}

// ─── Service result types ─────────────────────────────────────────────────────

export interface SendMessageResult {
  /** Evolution API message ID (key.id) */
  evolutionMessageId: string;
  /** Normalized phone used in the request */
  phone: string;
  status: EvolutionMessageStatus;
}
