/**
 * JWT Configuration & Utilities
 *
 * Provides frontend-safe utilities for JWT token management.
 * JWT secrets are NEVER available in the frontend — they exist only
 * in Edge Functions via Deno.env.get("JWT_SECRET").
 */

import { JWT as jwtConfig } from './envConfig';

// Type definitions
export interface JWTConfig {
  accessTokenExpiry: number; // in seconds
}

/**
 * Get JWT configuration (safe for frontend)
 * Only exports expiry time — secrets are backend-only.
 */
export function getJWTConfig(): JWTConfig {
  return {
    accessTokenExpiry: jwtConfig.accessTokenExpiry,
  };
}

/**
 * Get token expiry in milliseconds (for use with Date)
 */
export function getTokenExpiryMs(): number {
  return jwtConfig.accessTokenExpiry * 1000;
}

/**
 * Calculate absolute expiration time for a token
 */
export function getAbsoluteExpiryTime(): Date {
  return new Date(Date.now() + getTokenExpiryMs());
}

/**
 * Check if token would expire within X seconds
 */
export function wouldExpireWithin(seconds: number): boolean {
  const now = Date.now();
  const expiryTime = now + getTokenExpiryMs();
  const checkTime = now + (seconds * 1000);
  return checkTime >= expiryTime;
}

/**
 * Frontend-safe information about JWT configuration
 */
export function getJWTInfo() {
  return {
    expirySeconds: jwtConfig.accessTokenExpiry,
    expiryMinutes: Math.round(jwtConfig.accessTokenExpiry / 60),
    expiryHours: Math.round(jwtConfig.accessTokenExpiry / 3600),
  };
}

export default {
  getJWTConfig,
  getTokenExpiryMs,
  getAbsoluteExpiryTime,
  wouldExpireWithin,
  getJWTInfo,
};
