/**
 * Rate limiting service for authentication
 * Prevents brute force attacks on login/signup
 */

import { logger } from './logger';
import { RATE_LIMIT } from '../constants';

/**
 * In-memory rate limit store
 * In production, this should be moved to Redis or database
 */
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

/**
 * Cleans up expired rate limit records
 */
const cleanupExpiredLimits = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
};

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterSeconds: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Checks if an action should be rate limited
 * @param key - Identifier (email, IP, user ID)
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window for rate limit
 * @returns true if action is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = RATE_LIMIT.MAX_LOGIN_ATTEMPTS,
  windowMs: number = RATE_LIMIT.RATE_LIMIT_WINDOW
): boolean {
  try {
    cleanupExpiredLimits();

    const now = Date.now();
    const record = rateLimitStore.get(key);

    // First attempt or limit expired
    if (!record || record.resetTime < now) {
      rateLimitStore.set(key, {
        attempts: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Check if under limit
    if (record.attempts < maxAttempts) {
      record.attempts++;
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[RateLimit] Erro ao verificar rate limit', error as Error, { key });
    // Fail open - allow request on error to prevent DoS of auth system
    return true;
  }
}

/**
 * Gets remaining attempts for a key
 */
export function getRemainingAttempts(
  key: string,
  maxAttempts: number = RATE_LIMIT.MAX_LOGIN_ATTEMPTS
): number {
  const record = rateLimitStore.get(key);
  if (!record) return maxAttempts;
  return Math.max(0, maxAttempts - record.attempts);
}

/**
 * Gets time until rate limit reset (in seconds)
 */
export function getResetTime(key: string): number {
  const record = rateLimitStore.get(key);
  if (!record) return 0;

  const now = Date.now();
  if (record.resetTime < now) return 0;

  return Math.ceil((record.resetTime - now) / 1000);
}

/**
 * Resets rate limit for a key (useful after successful login)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
  logger.info('[RateLimit] Rate limit reset', { key });
}

/**
 * Clears all rate limit records
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  logger.info('[RateLimit] All rate limits cleared');
}

/**
 * Validates login attempt with rate limiting
 */
export function validateLoginAttempt(email: string): void {
  const isAllowed = checkRateLimit(
    `login:${email}`,
    RATE_LIMIT.MAX_LOGIN_ATTEMPTS,
    RATE_LIMIT.RATE_LIMIT_WINDOW
  );

  if (!isAllowed) {
    const remainingSeconds = getResetTime(`login:${email}`);
    logger.warn('[RateLimit] Login rate limit exceeded', {
      email,
      retryAfter: remainingSeconds,
    });

    throw new RateLimitError(
      `Muitas tentativas de login. Tente novamente em ${remainingSeconds} segundos.`,
      remainingSeconds
    );
  }
}

/**
 * Validates signup attempt with rate limiting
 */
export function validateSignupAttempt(email: string): void {
  const isAllowed = checkRateLimit(
    `signup:${email}`,
    RATE_LIMIT.MAX_SIGNUP_ATTEMPTS,
    RATE_LIMIT.RATE_LIMIT_WINDOW
  );

  if (!isAllowed) {
    const remainingSeconds = getResetTime(`signup:${email}`);
    logger.warn('[RateLimit] Signup rate limit exceeded', {
      email,
      retryAfter: remainingSeconds,
    });

    throw new RateLimitError(
      `Muitas tentativas de cadastro. Tente novamente em ${remainingSeconds} segundos.`,
      remainingSeconds
    );
  }
}
