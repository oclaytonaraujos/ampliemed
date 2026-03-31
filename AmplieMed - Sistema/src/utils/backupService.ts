/**
 * AmplieMed — Backup Service
 * Backup completo de todos os dados do AppContext.
 * Exporta JSON para download e restaura a partir de arquivo JSON.
 * 
 * NOTA: Toda persistência agora é feita via Supabase.
 * Este serviço trabalha com dados passados como parâmetro (in-memory).
 */

import { exportToJSON, importFromJSON } from './exportService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BackupData {
  version: string;
  createdAt: string;
  system: 'AmplieMed';
  entities: {
    patients?: unknown[];
    appointments?: unknown[];
    medicalRecords?: unknown[];
    exams?: unknown[];
    stockItems?: unknown[];
    queueEntries?: unknown[];
    financialBillings?: unknown[];
    financialPayments?: unknown[];
    financialReceivables?: unknown[];
    financialPayables?: unknown[];
    professionals?: unknown[];
    insurances?: unknown[];
    protocols?: unknown[];
    telemedicineSessions?: unknown[];
    systemUsers?: unknown[];
    appTemplates?: unknown[];
    notifications?: unknown[];
    auditLog?: unknown[];
  };
  metadata: {
    totalRecords: number;
    clinicName: string;
  };
}

// ─── Context data shape (passed from AppContext) ─────────────────────────────

export interface AppStateSnapshot {
  patients: unknown[];
  appointments: unknown[];
  medicalRecords: unknown[];
  exams: unknown[];
  stockItems: unknown[];
  queueEntries: unknown[];
  notifications: unknown[];
  financialBillings: unknown[];
  financialPayments: unknown[];
  financialReceivables: unknown[];
  financialPayables: unknown[];
  professionals: unknown[];
  insurances: unknown[];
  protocols: unknown[];
  auditLog: unknown[];
  telemedicineSessions: unknown[];
  systemUsers: unknown[];
  appTemplates: unknown[];
  clinicSettings?: { clinicName?: string };
}

// ─── Create Backup (from in-memory state) ─────────────────────────────────────

export function createBackup(state: AppStateSnapshot): BackupData {
  let totalRecords = 0;

  const entities: BackupData['entities'] = {
    patients: state.patients,
    appointments: state.appointments,
    medicalRecords: state.medicalRecords,
    exams: state.exams,
    stockItems: state.stockItems,
    queueEntries: state.queueEntries,
    notifications: state.notifications,
    financialBillings: state.financialBillings,
    financialPayments: state.financialPayments,
    financialReceivables: state.financialReceivables,
    financialPayables: state.financialPayables,
    professionals: state.professionals,
    insurances: state.insurances,
    protocols: state.protocols,
    auditLog: state.auditLog,
    telemedicineSessions: state.telemedicineSessions,
    systemUsers: state.systemUsers,
    appTemplates: state.appTemplates,
  };

  Object.values(entities).forEach(arr => {
    if (Array.isArray(arr)) totalRecords += arr.length;
  });

  return {
    version: '2.0',
    createdAt: new Date().toISOString(),
    system: 'AmplieMed',
    entities,
    metadata: {
      totalRecords,
      clinicName: state.clinicSettings?.clinicName || 'AmplieMed',
    },
  };
}

// ─── Download Backup ──────────────────────────────────────────────────────────

export function downloadBackup(state: AppStateSnapshot): void {
  const backup = createBackup(state);
  const filename = `backup_ampliemed_${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}`;
  exportToJSON(backup, filename);
}

// ─── Restore Backup (returns parsed data for caller to apply) ─────────────────

export interface RestoreResult {
  success: boolean;
  message: string;
  count: number;
  data?: BackupData;
}

export async function restoreBackup(file: File): Promise<RestoreResult> {
  try {
    const data = await importFromJSON<BackupData>(file);

    if (data.system !== 'AmplieMed') {
      return { success: false, message: 'Arquivo não é um backup válido do AmplieMed.', count: 0 };
    }

    let restoredCount = 0;
    Object.values(data.entities).forEach(entityData => {
      if (Array.isArray(entityData)) restoredCount += entityData.length;
    });

    return {
      success: true,
      message: `Backup restaurado com sucesso. ${restoredCount} registros recuperados.`,
      count: restoredCount,
      data,
    };
  } catch (err) {
    return {
      success: false,
      message: `Erro ao restaurar backup: ${err instanceof Error ? err.message : 'arquivo inválido'}`,
      count: 0,
    };
  }
}

// ─── Auto-backup (in-memory snapshots) ───────────────────────────────────────

export interface AutoBackupEntry {
  id: string;
  createdAt: string;
  size: number;
  records: number;
}

// In-memory store for auto-backups (session-level, not persisted to localStorage)
let autoBackupIndex: AutoBackupEntry[] = [];
const autoBackupStore = new Map<string, string>();
const AUTO_BACKUP_MAX = 3;

export function saveAutoBackup(state: AppStateSnapshot): AutoBackupEntry {
  const backup = createBackup(state);
  const json = JSON.stringify(backup);
  const entry: AutoBackupEntry = {
    id: `ab_${Date.now()}`,
    createdAt: new Date().toISOString(),
    size: new Blob([json]).size,
    records: backup.metadata.totalRecords,
  };

  autoBackupStore.set(entry.id, json);
  autoBackupIndex.unshift(entry);

  // Remove old backups beyond limit
  if (autoBackupIndex.length > AUTO_BACKUP_MAX) {
    const removed = autoBackupIndex.splice(AUTO_BACKUP_MAX);
    removed.forEach(r => autoBackupStore.delete(r.id));
  }

  return entry;
}

export function getAutoBackupIndex(): AutoBackupEntry[] {
  return [...autoBackupIndex];
}

export function downloadAutoBackup(entry: AutoBackupEntry): void {
  const raw = autoBackupStore.get(entry.id);
  if (!raw) return;
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_auto_${entry.createdAt.split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Storage stats (Supabase-based, no localStorage) ──────────────────────────

export function getStorageStats(state?: AppStateSnapshot): { used: number; usedMB: string; keys: number; percentUsed: number } {
  if (!state) {
    return { used: 0, usedMB: '0.00', keys: 0, percentUsed: 0 };
  }

  // Calculate approximate memory usage from in-memory state
  let total = 0;
  let keys = 0;
  const collections = Object.entries(state);
  collections.forEach(([_key, value]) => {
    if (value !== undefined && value !== null) {
      try {
        const json = JSON.stringify(value);
        total += json.length;
        keys++;
      } catch { /* ignore */ }
    }
  });

  const bytes = total * 2; // UTF-16 approximation
  const maxBytes = 50 * 1024 * 1024; // 50MB (Supabase has much more capacity)
  return {
    used: bytes,
    usedMB: (bytes / (1024 * 1024)).toFixed(2),
    keys,
    percentUsed: Math.min(100, Math.round((bytes / maxBytes) * 100)),
  };
}

// ─── Cleanup: remove ALL ampliemed_ keys from localStorage ────────────────────

export function purgeLocalStorage(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('ampliemed_') ||
      key.startsWith('sb-') ||
      key === 'hasSeenOnboarding' ||
      key === 'supabase_access_token'
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  if (keysToRemove.length > 0) {
    console.log(`[AmplieMed] Purged ${keysToRemove.length} localStorage keys:`, keysToRemove);
  }
  sessionStorage.clear();
}
