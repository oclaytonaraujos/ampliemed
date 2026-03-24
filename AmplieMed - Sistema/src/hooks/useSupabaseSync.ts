/**
 * React hook for automatic data synchronization with Supabase
 * Keeps local state in sync with remote database with configurable polling intervals
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface SyncOptions {
  /**
   * Polling interval in milliseconds (default: 30000 = 30s)
   */
  pollInterval?: number;
  /**
   * Enable real-time subscription if available (default: true)
   */
  enableRealtime?: boolean;
  /**
   * Function to sync data from server
   */
  syncFn: () => Promise<any[]>;
  /**
   * Optional callback when sync completes
   */
  onSync?: (data: any[]) => void;
  /**
   * Optional callback when sync fails
   */
  onError?: (error: Error) => void;
}

interface UseSyncState<T> {
  data: T[];
  syncing: boolean;
  lastSyncTime: Date | null;
  error: Error | null;
}

/**
 * Hook for automatic Supabase synchronization
 * @example
 * const { data: patients, syncing } = useSupabaseSync<Patient>({
 *   syncFn: () => supabase.from('patients').select('*').then(r => r.data || []),
 *   pollInterval: 30000,
 * });
 */
export function useSupabaseSync<T = any>(options: SyncOptions) {
  const { 
    pollInterval = 30000,
    enableRealtime = true,
    syncFn,
    onSync,
    onError,
  } = options;

  const [state, setState] = useState<UseSyncState<T>>({
    data: [],
    syncing: false,
    lastSyncTime: null,
    error: null,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const performSync = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      const data = await syncFn();
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          data,
          error: null,
          lastSyncTime: new Date(),
          syncing: false,
        }));

        logger.debug('[Sync] Data synchronized', {
          count: data.length,
          timestamp: new Date().toISOString(),
        });

        onSync?.(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error,
          syncing: false,
        }));

        logger.error('[Sync] Synchronization failed', error, {
          pollInterval,
        });

        onError?.(error);
      }
    }
  }, [pollInterval, syncFn, onSync, onError]);

  // Set up polling
  useEffect(() => {
    // Initial sync
    performSync();

    // Set up interval for subsequent syncs
    syncTimeoutRef.current = setInterval(performSync, pollInterval);

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [performSync, pollInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, []);

  // Manual sync trigger
  const sync = useCallback(() => performSync(), [performSync]);

  // Manual refresh (force sync immediately)
  const refresh = useCallback(() => {
    if (syncTimeoutRef.current) clearInterval(syncTimeoutRef.current);
    performSync();
    syncTimeoutRef.current = setInterval(performSync, pollInterval);
  }, [performSync, pollInterval]);

  return {
    ...state,
    sync,
    refresh,
    isSyncing: state.syncing,
  };
}

export type { UseSyncState };
