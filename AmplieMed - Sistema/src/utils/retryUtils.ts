/**
 * Request retry and timeout utilities
 * Provides robust handling of network failures with exponential backoff
 */

import { logger } from './logger';
import { SYNC_CONFIG } from '../constants';

/**
 * Adds timeout to a promise
 * @throws Error if promise doesn't resolve within the specified time
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SYNC_CONFIG.API_TIMEOUT
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Requisição expirou (${timeoutMs}ms)`));
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

/**
 * Configuration for retry behavior
 */
export interface RetryOptions {
  /**
   * Maximum number of attempts (default: 3)
   */
  maxAttempts?: number;
  /**
   * Initial delay between retries in milliseconds (default: 1000)
   */
  initialDelayMs?: number;
  /**
   * Maximum delay between retries in milliseconds (default: 30000)
   */
  maxDelayMs?: number;
  /**
   * Multiplier for exponential backoff (default: 2)
   */
  backoffMultiplier?: number;
  /**
   * Function to determine if error is retryable (default: retries on network errors)
   */
  isRetryable?: (error: unknown) => boolean;
  /**
   * Optional callback called after each retry
   */
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Retries a failed promise with exponential backoff
 * @example
 * const data = await retry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { maxAttempts: 3 }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = SYNC_CONFIG.MAX_RETRIES,
    initialDelayMs = SYNC_CONFIG.RETRY_INITIAL_DELAY,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    isRetryable = isNetworkError,
    onRetry,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[Retry] Tentativa ${attempt}/${maxAttempts}`, {
        function: fn.name,
      });

      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryable(error)) {
        logger.warn('[Retry] Erro não-retentável', error);
        throw error;
      }

      // If last attempt, throw
      if (attempt === maxAttempts) {
        logger.error(
          `[Retry] Todas as ${maxAttempts} tentativas falharam`,
          error instanceof Error ? error : undefined
        );
        throw error;
      }

      // Calculate next delay with exponential backoff
      const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      const delay = Math.min(exponentialDelay, maxDelayMs);
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * (delay * 0.1);

      logger.info(`[Retry] Aguardando ${Math.round(jitteredDelay)}ms antes da próxima tentativa`, {
        attempt,
        totalAttempts: maxAttempts,
      });

      onRetry?.(attempt, error);

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}

/**
 * Combines retry and timeout for a promise
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retryOptions?: RetryOptions,
  timeoutMs?: number
): Promise<T> {
  return retry(
    () => withTimeout(fn(), timeoutMs),
    retryOptions
  );
}

/**
 * Default retryable error check - network related errors
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors are usually TypeErrors
    return error.message.includes('fetch') || error.message.includes('Network');
  }

  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    );
  }

  return false;
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
