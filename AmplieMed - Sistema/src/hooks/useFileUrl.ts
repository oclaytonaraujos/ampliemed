/**
 * AmplieMed — File URL Hooks
 * ─────────────────────────────────────────────────────────────────────────────
 * Hooks reutilizáveis para resolver PATH → URL de exibição.
 *
 * Regras:
 *   - Recebem PATH (storagePath), nunca URL já montada
 *   - Geram URL dinamicamente por bucket type
 *   - Tratam loading/error
 *   - Aplicam cache para evitar chamadas duplicadas
 *   - Buckets públicos → URL construída client-side (sem API call)
 *   - Buckets privados → signed URL com TTL de 1h (com cache)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { BucketType } from '../utils/storageService';
import { BUCKET_CONFIG, getPublicFileUrl, getSignedFileUrl } from '../utils/storageService';

// ─── In-memory URL cache ──────────────────────────────────────────────────────

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CacheEntry>();

function getCached(key: string): string | null {
  const entry = urlCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    urlCache.delete(key);
    return null;
  }
  return entry.url;
}

function setCache(key: string, url: string, ttlMs: number): void {
  urlCache.set(key, { url, expiresAt: Date.now() + ttlMs });
}

// ─── useFileUrl ───────────────────────────────────────────────────────────────

export interface UseFileUrlResult {
  /** URL resolvida para exibição, ou null se ainda carregando/erro/sem path */
  url: string | null;
  loading: boolean;
  error: string | null;
  /** Força re-busca da URL (útil quando signed URL expirou) */
  refresh: () => void;
}

/**
 * Hook genérico para resolver qualquer storagePath em URL de exibição.
 *
 * @param storagePath  PATH relativo no bucket (ex: "documents/userId/file.pdf")
 * @param bucketType   Tipo do bucket onde o arquivo está armazenado
 * @param expiresIn    Segundos de validade para signed URLs (default: 3600)
 */
export function useFileUrl(
  storagePath: string | null | undefined,
  bucketType: BucketType,
  expiresIn: number = 3600,
): UseFileUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const cfg = useMemo(() => BUCKET_CONFIG[bucketType], [bucketType]);
  const cacheKey = storagePath ? `${bucketType}:${storagePath}` : null;

  useEffect(() => {
    if (!storagePath || !cacheKey) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Public buckets: compute URL instantly, no async call
    if (cfg.isPublic) {
      const publicUrl = getPublicFileUrl(storagePath, bucketType);
      setUrl(publicUrl);
      setLoading(false);
      setError(null);
      return;
    }

    // Private buckets: check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch signed URL from server
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSignedFileUrl(storagePath, bucketType, expiresIn)
      .then((signedUrl) => {
        if (cancelled) return;
        // Cache with 5-minute safety margin before expiry
        const ttlMs = Math.max((expiresIn - 300) * 1000, 60_000);
        setCache(cacheKey, signedUrl, ttlMs);
        setUrl(signedUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.message || 'Erro ao carregar URL do arquivo';
        console.error(`[useFileUrl] Failed to resolve ${storagePath} (${bucketType}):`, err);
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storagePath, bucketType, expiresIn, cfg.isPublic, cacheKey, refreshTick]);

  return {
    url,
    loading,
    error,
    refresh: () => {
      // Invalidate cache and re-fetch
      if (cacheKey) urlCache.delete(cacheKey);
      setRefreshTick((t) => t + 1);
    },
  };
}

// ─── Convenience hooks ────────────────────────────────────────────────────────

/**
 * Hook para avatares e logos (bucket público).
 * Retorna URL pública instantaneamente, sem loading state.
 */
export function useAvatarUrl(storagePath: string | null | undefined): UseFileUrlResult {
  return useFileUrl(storagePath, 'avatars');
}

/**
 * Hook para imagens/mídias públicas (bucket público).
 */
export function useMediaUrl(storagePath: string | null | undefined): UseFileUrlResult {
  return useFileUrl(storagePath, 'media');
}

/**
 * Hook para documentos médicos privados (bucket privado, signed URL).
 */
export function useDocumentUrl(
  storagePath: string | null | undefined,
  expiresIn: number = 3600,
): UseFileUrlResult {
  return useFileUrl(storagePath, 'documents', expiresIn);
}

/**
 * Hook para anexos de chat/mensagens (bucket privado, signed URL).
 */
export function useChatAttachmentUrl(
  storagePath: string | null | undefined,
  expiresIn: number = 3600,
): UseFileUrlResult {
  return useFileUrl(storagePath, 'chat', expiresIn);
}

/**
 * Hook para resolver vários paths de uma vez.
 * Retorna um Map de path → url.
 */
export function useMultipleFileUrls(
  items: { storagePath: string; bucketType: BucketType }[],
): Map<string, string | null> {
  const [urls, setUrls] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!items.length) return;

    const newUrls = new Map<string, string | null>();
    const privateItems: { storagePath: string; bucketType: BucketType }[] = [];

    // Resolve public items immediately
    for (const item of items) {
      const cfg = BUCKET_CONFIG[item.bucketType];
      if (cfg.isPublic) {
        newUrls.set(item.storagePath, getPublicFileUrl(item.storagePath, item.bucketType));
      } else {
        const cached = getCached(`${item.bucketType}:${item.storagePath}`);
        if (cached) {
          newUrls.set(item.storagePath, cached);
        } else {
          newUrls.set(item.storagePath, null);
          privateItems.push(item);
        }
      }
    }

    setUrls(new Map(newUrls));

    // Fetch private items
    if (privateItems.length > 0) {
      Promise.allSettled(
        privateItems.map(async (item) => {
          const url = await getSignedFileUrl(item.storagePath, item.bucketType, 3600);
          const ttlMs = (3600 - 300) * 1000;
          setCache(`${item.bucketType}:${item.storagePath}`, url, ttlMs);
          return { storagePath: item.storagePath, url };
        }),
      ).then((results) => {
        setUrls((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (r.status === 'fulfilled') {
              next.set(r.value.storagePath, r.value.url);
            }
          }
          return next;
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((i) => `${i.bucketType}:${i.storagePath}`))]);

  return urls;
}
