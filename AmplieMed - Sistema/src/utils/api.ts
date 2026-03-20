/**
 * AmplieMed API — Migrado para tabelas PostgreSQL reais
 *
 * Arquitetura:
 *   - Data CRUD → Supabase Client direto (com RLS)
 *   - Auth (signup) → Edge Function (precisa de service_role_key)
 *   - Storage → Edge Function (precisa de service_role_key para signed URLs)
 *
 * Todas as operações de dados passam pelo Supabase Client com RLS,
 * eliminando a dependência do KV Store.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabase } from './supabaseClient';
import * as M from './dataMappers';

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d4766610`;

// ─── Token management (kept for Edge Function auth routes) ───────────────────
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}
export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Edge Function fetch helper (auth + storage only) ────────────────────────
async function edgeFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  // Recover token from live Supabase session when module-level cache was wiped
  // (e.g. Vite HMR resets module variables to their initial null value)
  let token = _accessToken;
  if (!token) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
        _accessToken = token; // restore cache so subsequent calls don't re-fetch
      }
    } catch { /* ignore — will fall back to publicAnonKey below */ }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || publicAnonKey}`,
    ...((options.headers as Record<string, string>) || {}),
  };
  
  try {
    const url = `${EDGE_BASE}${path}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    
    const res = await fetch(url, { ...options, headers });
    
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const msg = body?.error || `HTTP ${res.status}`;
      console.error(`[API] ${options.method || 'GET'} ${path} failed:`, msg);
      throw new Error(msg);
    }
    
    return res.json();
  } catch (err: any) {
    // Better error messages for common issues
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      console.error(`[API] Servidor não respondeu. Verifique se o Edge Function está deployado.`);
      console.error(`[API] URL: ${EDGE_BASE}${path}`);
      throw new Error('Não foi possível conectar ao servidor. O serviço pode estar temporariamente indisponível.');
    }
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH (via Edge Function — needs service_role_key)
// ═════════════════════════════════════════════════════════════════════════════

export async function signup(data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  specialty?: string;
  crm?: string;
  phone?: string;
}) {
  return edgeFetch<{ user: any; message: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: string;
  phone?: string;
  specialty?: string;
  crm?: string;
  crm_uf?: string;
}) {
  return edgeFetch<{ user: any; message: string }>('/auth/create-user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProfile() {
  return edgeFetch<{
    id: string;
    email: string;
    name: string;
    role: string;
    specialty: string;
    crm: string;
    phone: string;
  }>('/auth/me');
}

export async function updateProfile(data: Record<string, any>) {
  return edgeFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// STORAGE (via Edge Function — needs service_role_key for signed URLs)
// ═════════════════════════════════════════════════════════════════════════════

export type BucketType = 'avatars' | 'media' | 'documents' | 'chat';

// Bucket name mapping (must match server constants)
const BUCKET_NAMES: Record<BucketType, string> = {
  avatars:   'make-d4766610-avatars',
  media:     'make-d4766610-media',
  documents: 'make-d4766610-documents',
  chat:      'make-d4766610-chat',
};

const PUBLIC_BUCKETS: BucketType[] = ['avatars', 'media'];

/**
 * Upload a file to Supabase Storage via Edge Function.
 *
 * ARQUITETURA FINAL — sem base64, sem readAsDataURL:
 * Envia o arquivo como multipart/form-data (binário direto).
 * O servidor recebe o Blob, faz o upload ao Storage e retorna apenas o PATH.
 *
 * @param fileName    Sanitized file name (with timestamp)
 * @param file        Native File object — binary, never converted to base64
 * @param folder      Sub-folder within the bucket
 * @param bucketType  Target bucket ('avatars'|'media'|'documents'|'chat')
 * @returns { path, bucketType, url } — only path is meant to be persisted
 */
export async function uploadFile(
  fileName: string,
  file: File,
  folder: string,
  bucketType: BucketType = 'documents',
): Promise<{ path: string; bucketType: BucketType; url: string | null }> {
  const form = new FormData();
  // Append the file binary directly — NO base64, NO readAsDataURL
  form.append('file', file, fileName);
  form.append('folder', folder);
  form.append('bucketType', bucketType);

  // Always get a fresh token from the Supabase session to avoid expired JWT issues
  let token = getAccessToken();
  if (!token) {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
        setAccessToken(token);
      }
    } catch (e) {
      console.warn('[API] Could not refresh session token for upload:', e);
    }
  }

  if (!token) {
    console.error('[API] No access token available for upload. User may not be authenticated.');
    throw new Error('Usuário não autenticado. Faça login novamente para enviar arquivos.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // NOTE: do NOT set Content-Type — browser sets it automatically with the multipart boundary
  };

  try {
    const url = `${EDGE_BASE}/storage/upload`;
    console.log(`[API] POST ${url} (FormData, bucketType=${bucketType})`);

    const res = await fetch(url, { method: 'POST', headers, body: form });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const msg = body?.error || `HTTP ${res.status}`;
      console.error(`[API] POST /storage/upload failed:`, msg);
      throw new Error(msg);
    }

    return res.json();
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error('Não foi possível conectar ao servidor durante o upload.');
    }
    throw err;
  }
}

/**
 * Get a public URL for a public-bucket file (avatars, media).
 * Computed client-side — no API call needed.
 * @param storagePath  Relative path within the bucket
 * @param bucketType  Must be 'avatars' or 'media'
 */
export function getPublicFileUrl(storagePath: string, bucketType: BucketType = 'avatars'): string {
  const bucketName = BUCKET_NAMES[bucketType];
  // Supabase public storage URL pattern
  return `https://${import.meta.env?.VITE_SUPABASE_URL?.replace('https://', '') || 'suycrqtvipfzrkcmopua.supabase.co'}/storage/v1/object/public/${bucketName}/${storagePath}`;
}

/**
 * Get a signed URL for a private-bucket file (documents, chat).
 * Requires a server round-trip to generate the signed URL.
 * @param storagePath  Relative path within the bucket
 * @param bucketType  Must be 'documents' or 'chat'
 * @param expiresIn  Seconds until expiry (default: 3600)
 */
export async function getSignedFileUrl(
  storagePath: string,
  bucketType: BucketType = 'documents',
  expiresIn: number = 3600,
): Promise<string> {
  const res = await edgeFetch<{ signedUrl: string }>(
    `/storage/signed-url/${bucketType}/${storagePath}?expires=${expiresIn}`,
  );
  return res.signedUrl;
}

/**
 * Delete a file from storage.
 * @param storagePath  Relative path within the bucket
 * @param bucketType  Target bucket
 */
export async function deleteFile(
  storagePath: string,
  bucketType: BucketType = 'documents',
): Promise<void> {
  await edgeFetch(`/storage/file/${bucketType}/${storagePath}`, { method: 'DELETE' });
}

/**
 * Atomically delete a file attachment record from the DB AND its physical file
 * from Supabase Storage in a single server round-trip.
 *
 * Providing storagePath + bucketType avoids a DB lookup on the server side
 * (fast-path). If omitted, the server will look up the record first.
 */
export async function deleteFileAttachmentRecord(
  id: string,
  storagePath?: string,
  bucketType?: BucketType,
): Promise<void> {
  await edgeFetch(`/file-attachments/${id}`, {
    method: 'DELETE',
    body: storagePath && bucketType
      ? JSON.stringify({ storagePath, bucketType })
      : '{}',
  });
}

/**
 * Check that all Storage buckets exist and are accessible.
 * Useful for startup diagnostics.
 */
export async function checkStorageHealth(): Promise<{
  ok: boolean;
  buckets: Record<string, boolean>;
  timestamp: string;
}> {
  return edgeFetch('/storage/health');
}

/**
 * Resolve a storage path to a display URL.
 * Automatically uses public URL for public buckets, signed URL for private.
 */
export async function resolveFileUrl(
  storagePath: string,
  bucketType: BucketType,
  expiresIn: number = 3600,
): Promise<string> {
  if (PUBLIC_BUCKETS.includes(bucketType)) {
    return getPublicFileUrl(storagePath, bucketType);
  }
  return getSignedFileUrl(storagePath, bucketType, expiresIn);
}

// ═════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═════════════════════════════════════════════════════════════════════════════

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await edgeFetch<{ status: string }>('/health');
    return res.status === 'ok';
  } catch {
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Get current user ID from Supabase session
// ═════════════════════════════════════════════════════════════════════════════

async function getOwnerId(): Promise<string> {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.user?.id) throw new Error('Usuário não autenticado');
  return session.user.id;
}

// ═════════════════════════════════════════════════════════════════════════════
// DATA OPERATIONS — Direct Supabase Table Queries
// ═════════════════════════════════════════════════════════════════════════════

// ─── Generic sync: upsert all items + delete removed ones ────────────────────

async function syncCollection<T>(
  tableName: string,
  items: T[],
  toRow: (item: T, ownerId: string) => Record<string, any>,
): Promise<void> {
  const ownerId = await getOwnerId();
  const supabase = getSupabase();

  if (items.length === 0) {
    // Delete all rows for this owner
    const { error } = await supabase.from(tableName).delete().eq('owner_id', ownerId);
    if (error) {
      console.error(`[Sync] Delete-all error on ${tableName}:`, error.message, error.code);
      throw error;
    }
    return;
  }

  // Upsert all current items (INSERT or UPDATE on conflict)
  const rows = items.map((item) => toRow(item, ownerId));
  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(rows, { onConflict: 'id' });

  if (upsertError) {
    console.error(
      `[Sync] Upsert error on ${tableName}:`,
      upsertError.message,
      upsertError.code,
      upsertError.details,
    );
    throw upsertError;
  }

  // Delete rows that are no longer in local state
  const currentIds = items.map((item: any) => item.id).filter(Boolean);
  if (currentIds.length > 0) {
    // PostgREST .not('id', 'in', '(v1,v2)') — values must be comma-separated inside parens
    const idList = currentIds.join(',');
    const { error: delError } = await supabase
      .from(tableName)
      .delete()
      .eq('owner_id', ownerId)
      .not('id', 'in', `(${idList})`);

    if (delError) {
      // Non-fatal: log but don't throw so the upsert isn't rolled back
      console.error(`[Sync] Delete-stale error on ${tableName}:`, delError.message, delError.code);
    }
  }
}

// ─── Generic load: fetch all rows for current owner ──────────────────────────

async function loadTable<T>(
  tableName: string,
  fromRow: (row: any) => T,
  orderBy?: string,
): Promise<T[]> {
  const supabase = getSupabase();
  let query = supabase.from(tableName).select('*');
  if (orderBy) {
    query = query.order(orderBy, { ascending: false });
  }
  const { data, error } = await query;
  if (error) {
    console.error(`[Load] Error loading ${tableName}:`, error.message);
    return [];
  }
  return (data || []).map(fromRow);
}

// ═════════════════════════════════════════════════════════════════════════════
// LOAD ALL DATA (replaces bulk-load from KV)
// ═════════════════════════════════════════════════════════════════════════════

export interface AllData {
  patients: any[];
  appointments: any[];
  medicalRecords: any[];
  exams: any[];
  stockItems: any[];
  queueEntries: any[];
  notifications: any[];
  financialBillings: any[];
  financialPayments: any[];
  financialReceivables: any[];
  financialPayables: any[];
  professionals: any[];
  insurances: any[];
  protocols: any[];
  auditLog: any[];
  telemedicineSessions: any[];
  systemUsers: any[];
  appTemplates: any[];
  communicationMessages: any[];
  campaigns: any[];
  fileAttachments: any[];
  clinicSettings: any | null;
}

export async function loadAllData(): Promise<AllData> {
  console.log('[API] Loading all data from Supabase tables...');

  const supabase = getSupabase();

  // Load all tables in parallel for speed
  const [
    patientsRes,
    appointmentsRes,
    recordsRes,
    examsRes,
    stockRes,
    queueRes,
    notificationsRes,
    billingsRes,
    paymentsRes,
    receivablesRes,
    payablesRes,
    professionalsRes,
    insurancesRes,
    protocolsRes,
    protocolStepsRes,
    auditRes,
    teleRes,
    sysUsersRes,
    templatesRes,
    commMsgRes,
    campaignsRes,
    filesRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from('patients').select('*').order('created_at', { ascending: false }),
    supabase.from('appointments').select('*').order('appointment_date', { ascending: false }),
    supabase.from('medical_records').select('*').order('record_date', { ascending: false }),
    supabase.from('exams').select('*').order('request_date', { ascending: false }),
    supabase.from('stock_items').select('*').order('name'),
    supabase.from('queue_entries').select('*').order('arrival_time', { ascending: false }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('financial_billings').select('*').order('billing_date', { ascending: false }),
    supabase.from('financial_payments').select('*').order('payment_date', { ascending: false }),
    supabase.from('financial_receivables').select('*').order('due_date', { ascending: false }),
    supabase.from('financial_payables').select('*').order('due_date', { ascending: false }),
    supabase.from('professionals').select('*').order('name'),
    supabase.from('insurances').select('*').order('name'),
    supabase.from('protocols').select('*').order('title'),
    supabase.from('protocol_steps').select('*').order('step_number'),
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('telemedicine_sessions').select('*').order('session_date', { ascending: false }),
    supabase.from('system_users').select('*').order('name'),
    supabase.from('app_templates').select('*').order('name'),
    supabase.from('communication_messages').select('*').order('created_at', { ascending: false }),
    supabase.from('communication_campaigns').select('*').order('created_at', { ascending: false }),
    supabase.from('file_attachments').select('*').order('created_at', { ascending: false }),
    supabase.from('clinic_settings').select('*').limit(1),
  ]);

  // Transform all rows through mappers
  const allSteps = protocolStepsRes.data || [];

  return {
    patients: (patientsRes.data || []).map(M.patientFromRow),
    appointments: (appointmentsRes.data || []).map(M.appointmentFromRow),
    medicalRecords: (recordsRes.data || []).map(M.medicalRecordFromRow),
    exams: (examsRes.data || []).map(M.examFromRow),
    stockItems: (stockRes.data || []).map(M.stockItemFromRow),
    queueEntries: (queueRes.data || []).map(M.queueEntryFromRow),
    notifications: (notificationsRes.data || []).map(M.notificationFromRow),
    financialBillings: (billingsRes.data || []).map(M.billingFromRow),
    financialPayments: (paymentsRes.data || []).map(M.paymentFromRow),
    financialReceivables: (receivablesRes.data || []).map(M.receivableFromRow),
    financialPayables: (payablesRes.data || []).map(M.payableFromRow),
    professionals: (professionalsRes.data || []).map(M.professionalFromRow),
    insurances: (insurancesRes.data || []).map(M.insuranceFromRow),
    protocols: (protocolsRes.data || []).map((row: any) => M.protocolFromRow(row, allSteps)),
    auditLog: (auditRes.data || []).map(M.auditFromRow),
    telemedicineSessions: (teleRes.data || []).map(M.telemedicineFromRow),
    systemUsers: (sysUsersRes.data || []).map(M.systemUserFromRow),
    appTemplates: (templatesRes.data || []).map(M.templateFromRow),
    communicationMessages: (commMsgRes.data || []).map(M.commMessageFromRow),
    campaigns: (campaignsRes.data || []).map(M.campaignFromRow),
    fileAttachments: (filesRes.data || []).map(M.fileAttachmentFromRow),
    clinicSettings: settingsRes.data?.[0] ? M.clinicSettingsFromRow(settingsRes.data[0]) : null,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SYNC COLLECTIONS (replaces debounced KV saves)
// ═════════════════════════════════════════════════════════════════════════════

export const syncPatients = (items: any[]) => syncCollection('patients', items, M.patientToRow);
export const syncAppointments = (items: any[]) => syncCollection('appointments', items, M.appointmentToRow);
export const syncMedicalRecords = (items: any[]) => syncCollection('medical_records', items, M.medicalRecordToRow);
export const syncExams = (items: any[]) => syncCollection('exams', items, M.examToRow);
export const syncStockItems = (items: any[]) => syncCollection('stock_items', items, M.stockItemToRow);
export const syncQueueEntries = (items: any[]) => syncCollection('queue_entries', items, M.queueEntryToRow);
export const syncNotifications = (items: any[]) => syncCollection('notifications', items, M.notificationToRow);
export const syncBillings = (items: any[]) => syncCollection('financial_billings', items, M.billingToRow);
export const syncPayments = (items: any[]) => syncCollection('financial_payments', items, M.paymentToRow);
export const syncReceivables = (items: any[]) => syncCollection('financial_receivables', items, M.receivableToRow);
export const syncPayables = (items: any[]) => syncCollection('financial_payables', items, M.payableToRow);
export const syncProfessionals = (items: any[]) => syncCollection('professionals', items, M.professionalToRow);
export const syncInsurances = (items: any[]) => syncCollection('insurances', items, M.insuranceToRow);
export const syncTelemedicine = (items: any[]) => syncCollection('telemedicine_sessions', items, M.telemedicineToRow);
export const syncSystemUsers = (items: any[]) => syncCollection('system_users', items, M.systemUserToRow);
export const syncTemplates = (items: any[]) => syncCollection('app_templates', items, M.templateToRow);
export const syncCommMessages = (items: any[]) => syncCollection('communication_messages', items, M.commMessageToRow);
export const syncCampaigns = (items: any[]) => syncCollection('communication_campaigns', items, M.campaignToRow);
export const syncFileAttachments = (items: any[]) => syncCollection('file_attachments', items, M.fileAttachmentToRow);
// ─── Audit log: server-side INSERT via service_role (bypasses RLS) ────────────
// Audit log is append-only — entries are NEVER updated or deleted client-side.
export async function syncAuditLog(items: any[]): Promise<void> {
  if (items.length === 0) return; // nothing to write

  // Verify we have a valid access token before attempting to save
  let token = _accessToken;
  if (!token) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
        _accessToken = token;
      }
    } catch { /* ignore */ }
  }

  // If no valid user session, skip audit log sync (fail silently)
  if (!token || token === publicAnonKey) {
    console.warn('[Sync] ⚠️ Skipping audit log sync: no valid user session');
    return;
  }

  const rows = items.map((a) => ({
    id: a.id,
    user_name: a.user || '',
    user_role: a.userRole || '',
    action: a.action || 'read',
    module: a.module || '',
    description: a.description || '',
    ip_address: a.ipAddress && a.ipAddress !== '0.0.0.0' ? a.ipAddress : null,
    device: a.device || '',
    status: a.status || 'success',
  }));

  // Route through Edge Function so service_role_key is used server-side,
  // completely bypassing the RLS USING-expression restriction on audit_log.
  try {
    await edgeFetch('/audit/save', {
      method: 'POST',
      body: JSON.stringify({ entries: rows }),
    });
  } catch (err: any) {
    // Silently ignore 401 errors (user not authenticated - e.g., during logout)
    if (err.message?.includes('401') || err.message?.includes('Não autorizado')) {
      console.log('[Sync] Skipping audit log sync - user not authenticated');
      return;
    }
    // Re-throw other errors
    throw err;
  }
}

// ─── Protocols (special: parent + child steps) ──────────────────────────────

export async function syncProtocols(items: any[]): Promise<void> {
  const ownerId = await getOwnerId();
  const supabase = getSupabase();

  if (items.length === 0) {
    // Delete all protocols (cascades to steps)
    await supabase.from('protocols').delete().eq('owner_id', ownerId);
    return;
  }

  // Upsert protocols
  const rows = items.map((p) => M.protocolToRow(p, ownerId));
  const { error } = await supabase.from('protocols').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('[Sync] Protocol upsert error:', error.message);
    throw error;
  }

  // Delete removed protocols
  const currentIds = items.map((p: any) => p.id).filter(Boolean);
  if (currentIds.length > 0) {
    await supabase
      .from('protocols')
      .delete()
      .eq('owner_id', ownerId)
      .not('id', 'in', `(${currentIds.join(',')})`);
  }

  // Sync steps: delete all steps for these protocols, then re-insert
  for (const protocol of items) {
    if (!protocol.steps || protocol.steps.length === 0) continue;
    // Delete existing steps
    await supabase.from('protocol_steps').delete().eq('protocol_id', protocol.id);
    // Insert new steps
    const stepRows = protocol.steps.map((s: any) => M.protocolStepToRow(s, protocol.id));
    const { error: stepError } = await supabase.from('protocol_steps').insert(stepRows);
    if (stepError) {
      console.error(`[Sync] Protocol steps error for ${protocol.id}:`, stepError.message);
    }
  }
}

// ─── Clinic Settings (singleton upsert) ──────────────────────────────────────

export async function syncClinicSettings(settings: any): Promise<void> {
  const ownerId = await getOwnerId();
  const supabase = getSupabase();

  // Check if settings exist
  const { data: existing } = await supabase
    .from('clinic_settings')
    .select('id')
    .eq('owner_id', ownerId)
    .limit(1);

  const row = M.clinicSettingsToRow(settings, ownerId);

  if (existing && existing.length > 0) {
    // Update existing
    const { error } = await supabase
      .from('clinic_settings')
      .update(row)
      .eq('id', existing[0].id);
    if (error) console.error('[Sync] Clinic settings update error:', error.message);
  } else {
    // Insert new
    const { error } = await supabase.from('clinic_settings').insert(row);
    if (error) console.error('[Sync] Clinic settings insert error:', error.message);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MIGRATION: Move data from KV store to tables (one-time)
// ═════════════════════════════════════════════════════════════════════════════
// ⚠️  DESATIVADA PERMANENTEMENTE — KV store confirmado vazio.
//     O sistema roda 100% em tabelas Supabase. Não há nada a migrar.

export async function migrateFromKvStore(): Promise<boolean> {
  console.log('[Migration] KV migration is disabled — system fully on Supabase tables.');
  return false;

  // --- código original preservado abaixo (não será executado) ---
  try {
    console.log('[Migration] Checking for KV store data to migrate...');

    // Skip migration if not authenticated (no access token)
    if (!_accessToken) {
      console.log('[Migration] Not authenticated, skipping KV migration.');
      return false;
    }

    // Try loading from old KV endpoint
    const res = await edgeFetch<{ data: Record<string, any> }>('/data/bulk-load', {
      method: 'POST',
      body: JSON.stringify({
        collections: [
          'patients', 'appointments', 'medical_records', 'exams', 'stock',
          'queue', 'notifications', 'billings', 'payments', 'receivables',
          'payables', 'professionals', 'insurances', 'protocols', 'audit_log',
          'telemedicine', 'system_users', 'templates', 'comm_messages',
          'file_attachments', 'clinic_settings',
        ],
      }),
    });

    const kv = res.data;
    if (!kv) return false;

    // Check if there's actually data in KV
    const hasData = Object.values(kv).some((v) =>
      v !== null && (Array.isArray(v) ? v.length > 0 : typeof v === 'object'),
    );
    if (!hasData) {
      console.log('[Migration] No KV data found, skipping migration.');
      return false;
    }

    console.log('[Migration] Found KV data, migrating to tables...');
    const ownerId = await getOwnerId();

    // Helper to generate UUIDs for items with non-UUID ids
    const ensureUuid = (item: any): any => {
      if (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
        return item; // Already UUID
      }
      return { ...item, id: crypto.randomUUID() };
    };

    // Migrate each collection
    const migrations: Promise<void>[] = [];

    if (kv.patients?.length) {
      migrations.push(syncPatients(kv.patients.map(ensureUuid)));
    }
    if (kv.appointments?.length) {
      migrations.push(syncAppointments(kv.appointments.map(ensureUuid)));
    }
    if (kv.medical_records?.length) {
      migrations.push(syncMedicalRecords(kv.medical_records.map(ensureUuid)));
    }
    if (kv.exams?.length) {
      migrations.push(syncExams(kv.exams.map(ensureUuid)));
    }
    if (kv.stock?.length) {
      migrations.push(syncStockItems(kv.stock.map(ensureUuid)));
    }
    if (kv.queue?.length) {
      migrations.push(syncQueueEntries(kv.queue.map(ensureUuid)));
    }
    if (kv.notifications?.length) {
      migrations.push(syncNotifications(kv.notifications.map(ensureUuid)));
    }
    if (kv.billings?.length) {
      migrations.push(syncBillings(kv.billings.map(ensureUuid)));
    }
    if (kv.payments?.length) {
      migrations.push(syncPayments(kv.payments.map(ensureUuid)));
    }
    if (kv.receivables?.length) {
      migrations.push(syncReceivables(kv.receivables.map(ensureUuid)));
    }
    if (kv.payables?.length) {
      migrations.push(syncPayables(kv.payables.map(ensureUuid)));
    }
    if (kv.professionals?.length) {
      migrations.push(syncProfessionals(kv.professionals.map(ensureUuid)));
    }
    if (kv.insurances?.length) {
      migrations.push(syncInsurances(kv.insurances.map(ensureUuid)));
    }
    if (kv.protocols?.length) {
      migrations.push(syncProtocols(kv.protocols.map(ensureUuid)));
    }
    if (kv.audit_log?.length) {
      migrations.push(syncAuditLog(kv.audit_log.map(ensureUuid)));
    }
    if (kv.telemedicine?.length) {
      migrations.push(syncTelemedicine(kv.telemedicine.map(ensureUuid)));
    }
    if (kv.system_users?.length) {
      migrations.push(syncSystemUsers(kv.system_users.map(ensureUuid)));
    }
    if (kv.templates?.length) {
      migrations.push(syncTemplates(kv.templates.map(ensureUuid)));
    }
    if (kv.comm_messages?.length) {
      migrations.push(syncCommMessages(kv.comm_messages.map(ensureUuid)));
    }
    if (kv.file_attachments?.length) {
      migrations.push(syncFileAttachments(kv.file_attachments.map(ensureUuid)));
    }
    if (kv.clinic_settings && typeof kv.clinic_settings === 'object') {
      migrations.push(syncClinicSettings(kv.clinic_settings));
    }

    await Promise.allSettled(migrations);
    console.log('[Migration] KV → Tables migration completed!');
    return true;
  } catch (err) {
    console.error('[Migration] Failed to migrate from KV store:', err);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPAT  kept for any code that still imports these
// ═════════════════════════════════════════════════════════════════════════════

export type CollectionName = string;
export async function saveCollection(_name: CollectionName, _data: any): Promise<void> {
  // No-op: replaced by syncXxx functions
  console.warn('[API] saveCollection is deprecated. Use specific sync functions.');
}
export async function loadCollection<T = any>(_name: CollectionName): Promise<T | null> {
  console.warn('[API] loadCollection is deprecated. Use loadAllData().');
  return null;
}
export async function bulkLoad(_collections: CollectionName[]): Promise<Record<string, any>> {
  console.warn('[API] bulkLoad is deprecated. Use loadAllData().');
  return {};
}
export async function bulkSave(_collections: { name: CollectionName; data: any }[]): Promise<void> {
  console.warn('[API] bulkSave is deprecated. Use specific sync functions.');
}
export async function deleteCollection(_name: CollectionName): Promise<void> {
  console.warn('[API] deleteCollection is deprecated.');
}