/**
 * AmplieMed — Storage Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Camada centralizada para todas as operações com arquivos.
 *
 * Regras arquiteturais (DEFINITIVAS):
 *   ❌ PROIBIDO: base64, readAsDataURL, data URI, blob serializado, URL persistida
 *   ✅ OBRIGATÓRIO: armazenar apenas PATH relativo no banco
 *   ✅ OBRIGATÓRIO: gerar URL exclusivamente no momento da exibição
 *   ✅ OBRIGATÓRIO: transporte HTTP via FormData (binário direto, sem base64)
 *   ✅ OBRIGATÓRIO: buckets segregados por responsabilidade
 *
 * Buckets:
 *   avatars   (público)   → logos de clínica, fotos de perfil, fotos de médicos
 *   media     (público)   → imagens operacionais, mídias visuais
 *   documents (privado)   → documentos médicos sensíveis (prontuários, exames)
 *   chat      (privado)   → anexos de conversa/mensagem
 */

import * as api from './api';
import type { BucketType } from './api';

export type { BucketType };

// ─── Bucket configuration ────────────────────────────────────────────────────

export const BUCKET_CONFIG: Record<BucketType, { isPublic: boolean; maxMB: number }> = {
  avatars:   { isPublic: true,  maxMB: 2  },
  media:     { isPublic: true,  maxMB: 5  },
  documents: { isPublic: false, maxMB: 20 },
  chat:      { isPublic: false, maxMB: 10 },
};

// ─── MIME type allowlists per bucket ─────────────────────────────────────────

const ALLOWED_MIME: Record<BucketType, string[]> = {
  avatars:   ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  media:     ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
  chat: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** Arquivo local selecionado pelo usuário, ainda não persistido no Storage */
export interface LocalUploadFile {
  localId: string;
  file: File;
  /** URL temporária para pré-visualização via URL.createObjectURL. Revogar com revokeLocalPreviewUrl(). */
  previewUrl: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Arquivo persistido no Supabase Storage.
 * storagePath = PATH relativo no bucket — ÚNICO campo de arquivo persistido.
 * JAMAIS contém URL completa, base64, data URI ou blob serializado.
 */
export interface StoredFileAttachment {
  id: string;
  entityType: 'patient' | 'exam' | 'record' | 'appointment' | 'chat' | 'professional';
  entityId: string;
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  storagePath: string; // PATH relativo no bucket — NUNCA URL, NUNCA base64
  bucketType: BucketType;
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * Asset de logo de clínica persistido no Storage.
 * logoPath = PATH no bucket 'avatars' — NUNCA URL.
 */
export interface ClinicLogoAsset {
  logoPath: string;    // PATH relativo no bucket 'avatars'
  bucketType: 'avatars';
}

/**
 * Asset de foto de médico persistido no Storage.
 * photoPath = PATH no bucket 'avatars' — NUNCA URL.
 */
export interface DoctorPhotoAsset {
  photoPath: string;   // PATH relativo no bucket 'avatars'
  bucketType: 'avatars';
}

/**
 * Asset de avatar de perfil persistido no Storage.
 * avatarPath = PATH no bucket 'avatars' — NUNCA URL.
 */
export interface AvatarAsset {
  avatarPath: string;  // PATH relativo no bucket 'avatars'
  bucketType: 'avatars';
}

export interface UploadValidationError {
  kind: 'size' | 'mime' | 'name';
  message: string;
}

export interface UploadResult {
  storagePath: string; // PATH a ser persistido no banco — NUNCA URL
  bucketType: BucketType;
}

// ─── Sanitize filename ────────────────────────────────────────────────────────

/**
 * Sanitiza o nome do arquivo:
 *  - Remove acentos/diacríticos
 *  - Substitui caracteres especiais por underscore
 *  - Colapsa underscores múltiplos
 *  - Adiciona timestamp para unicidade
 *  - Limita nome a 100 caracteres
 */
export function sanitizeFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  const ext = dotIndex !== -1 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
  const baseName = dotIndex !== -1 ? fileName.slice(0, dotIndex) : fileName;

  const sanitized = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // Remove diacritics
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace special chars
    .replace(/_+/g, '_')              // Collapse underscores
    .replace(/^_|_$/g, '')            // Trim leading/trailing underscores
    .slice(0, 100) || 'arquivo';

  const ts = Date.now();
  return ext ? `${sanitized}_${ts}.${ext}` : `${sanitized}_${ts}`;
}

// ─── Validate file ────────────────────────────────────────────────────────────

/** Valida tipo MIME e tamanho antes do upload */
export function validateFile(file: File, bucketType: BucketType): UploadValidationError | null {
  const cfg = BUCKET_CONFIG[bucketType];
  const maxBytes = cfg.maxMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      kind: 'size',
      message: `Arquivo muito grande. Máximo para ${bucketType}: ${cfg.maxMB}MB (tamanho atual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  if (!ALLOWED_MIME[bucketType].includes(file.type)) {
    return {
      kind: 'mime',
      message: `Tipo de arquivo não permitido: ${file.type || 'desconhecido'}. Tipos aceitos: ${ALLOWED_MIME[bucketType].join(', ')}`,
    };
  }

  return null;
}

// ─── Local preview (pre-upload) ───────────────────────────────────────────────

/**
 * Cria uma URL temporária para pré-visualização local.
 * USA URL.createObjectURL (binário nativo) — JAMAIS base64/readAsDataURL.
 * OBRIGATÓRIO: chamar revokeLocalPreviewUrl() quando o componente desmontar.
 */
export function createLocalPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/** Revoga uma URL de pré-visualização local e libera memória */
export function revokeLocalPreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/** Cria um LocalUploadFile a partir de um File nativo */
export function createLocalUploadFile(file: File): LocalUploadFile {
  return {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    file,
    previewUrl: createLocalPreviewUrl(file),
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

// ─── Upload to Supabase Storage ───────────────────────────────────────────────

/**
 * Faz upload de um arquivo para o Supabase Storage.
 *
 * Fluxo interno (SEM base64):
 *   1. Valida tipo MIME e tamanho (client-side)
 *   2. Sanitiza o nome do arquivo
 *   3. Envia como FormData (binário direto) → Edge Function → Storage
 *   4. Retorna somente o PATH — JAMAIS URL, JAMAIS base64
 *
 * ARQUITETURA FINAL: nenhum passo converte para base64, readAsDataURL
 * ou qualquer representação textual do conteúdo binário do arquivo.
 */
export async function uploadToStorage(
  file: File,
  bucketType: BucketType,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  // 1. Validate client-side
  const validationError = validateFile(file, bucketType);
  if (validationError) throw new Error(validationError.message);

  // 2. Sanitize filename
  const sanitizedName = sanitizeFileName(file.name);

  onProgress?.(10);

  // 3. Upload via FormData (binary — NO base64, NO readAsDataURL)
  const result = await api.uploadFile(sanitizedName, file, folder, bucketType);
  onProgress?.(100);

  // 4. Return only PATH — URL is never returned as persistent value
  return {
    storagePath: result.path,
    bucketType,
  };
}

// ─── URL resolution ───────────────────────────────────────────────────────────

/**
 * Retorna a URL pública de um arquivo em bucket público (avatars, media).
 * Calculada client-side — sem chamada ao servidor.
 */
export function getPublicFileUrl(storagePath: string, bucketType: BucketType = 'avatars'): string {
  return api.getPublicFileUrl(storagePath, bucketType);
}

/**
 * Retorna uma signed URL para um arquivo em bucket privado (documents, chat).
 * Requer chamada ao servidor para gerar a URL assinada.
 */
export async function getSignedFileUrl(
  storagePath: string,
  bucketType: BucketType = 'documents',
  expiresIn: number = 3600,
): Promise<string> {
  return api.getSignedFileUrl(storagePath, bucketType, expiresIn);
}

/**
 * Resolve qualquer PATH em URL de exibição.
 * Seleciona automaticamente URL pública ou assinada com base no tipo de bucket.
 * NUNCA persiste a URL retornada — usar apenas para exibição imediata.
 */
export async function resolveStorageUrl(
  storagePath: string,
  bucketType: BucketType,
  expiresIn: number = 3600,
): Promise<string> {
  const cfg = BUCKET_CONFIG[bucketType];
  if (cfg.isPublic) {
    return getPublicFileUrl(storagePath, bucketType);
  }
  return getSignedFileUrl(storagePath, bucketType, expiresIn);
}

// ─── Delete from storage ─────────────────────────────────────────────────────

/** Remove um arquivo do Storage */
export async function deleteFromStorage(
  storagePath: string,
  bucketType: BucketType,
): Promise<void> {
  return api.deleteFile(storagePath, bucketType);
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
