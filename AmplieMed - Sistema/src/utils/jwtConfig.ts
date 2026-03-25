/**
 * JWT Configuration & Utilities
 * 
 * Provides utilities for JWT token management
 * Note: JWT_SECRET secrets should only be used on the backend/Edge Functions
 * This file provides type-safe access to JWT configuration
 */

import { JWT as jwtConfig } from './envConfig';

// Type definitions
export interface JWTConfig {
  accessTokenExpiry: number; // in seconds
  hasSecrets: boolean;
}

/**
 * Get JWT configuration (safe for frontend)
 * Only exports expiry time, not the actual secrets
 */
export function getJWTConfig(): JWTConfig {
  return {
    accessTokenExpiry: jwtConfig.accessTokenExpiry,
    hasSecrets: !!jwtConfig.secret,
  };
}

/**
 * Check if JWT secrets are configured
 * Returns true if at least the primary secret is configured
 */
export function isJWTConfigured(): boolean {
  return !!jwtConfig.secret;
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
 * Use this to display info or make decisions about auth
 */
export function getJWTInfo() {
  return {
    expirySeconds: jwtConfig.accessTokenExpiry,
    expiryMinutes: Math.round(jwtConfig.accessTokenExpiry / 60),
    expiryHours: Math.round(jwtConfig.accessTokenExpiry / 3600),
    isConfigured: isJWTConfigured(),
  };
}

export default {
  getJWTConfig,
  isJWTConfigured,
  getTokenExpiryMs,
  getAbsoluteExpiryTime,
  wouldExpireWithin,
  getJWTInfo,
};
