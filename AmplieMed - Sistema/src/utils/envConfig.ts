/**
 * Environment Configuration — Central Point for All .env Variables
 *
 * This file provides centralized access to all environment variables
 * synced from .env file. Import from here instead of using import.meta.env directly.
 *
 * SECURITY: Only VITE_-prefixed variables that are safe for the browser are exposed.
 * Secret keys (service role, Stripe secret, JWT secrets, DB credentials) are
 * NEVER read here — they belong exclusively in Edge Functions / server-side code.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIGURATION (frontend-safe only)
// ─────────────────────────────────────────────────────────────────────────────

export const Supabase = {
  /** Project name for UI/logging */
  projectName: import.meta.env.VITE_SUPABASE_PROJECT_NAME || 'AMPLIEMED',

  /** Supabase project ID */
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || 'suycrqtvipfzrkcmopua',

  /** Supabase API URL */
  url: import.meta.env.VITE_SUPABASE_URL || 'https://suycrqtvipfzrkcmopua.supabase.co',

  /** Public anonymous key for frontend auth */
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // NOTE: serviceRoleKey was REMOVED — it must NEVER be in the frontend bundle.
  // Edge Functions access it via Deno.env.get("SUPABASE_SERVICE_ROLE_KEY").
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE CONFIGURATION (frontend-safe only)
// ─────────────────────────────────────────────────────────────────────────────

export const Stripe = {
  /** Public key for Stripe.js (safe to expose in frontend) */
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',

  // NOTE: secretKey was REMOVED — it must NEVER be in the frontend bundle.
  // Edge Functions access it via Deno.env.get("STRIPE_SECRET_KEY").

  /** Check if Stripe is configured */
  isConfigured: (): boolean => {
    return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// JWT CONFIGURATION (frontend-safe only)
// ─────────────────────────────────────────────────────────────────────────────

export const JWT = {
  // NOTE: JWT secrets (secret, secretPrevious, secretLegacy) were REMOVED.
  // They must NEVER be in the frontend bundle.
  // Edge Functions access them via Deno.env.get("JWT_SECRET"), etc.

  /** Access token expiration in seconds (non-secret, safe for frontend) */
  accessTokenExpiry: parseInt(import.meta.env.VITE_JWT_ACCESS_TOKEN_EXPIRY || '3600', 10),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EDGE FUNCTIONS CONFIGURATION (frontend-safe only)
// ─────────────────────────────────────────────────────────────────────────────

export const EdgeFunctions = {
  /** Base URL for invoking Edge Functions */
  url: import.meta.env.VITE_EDGE_FUNCTION_URL || 'https://suycrqtvipfzrkcmopua.supabase.co/functions/v1',

  // NOTE: accessToken, email, password were REMOVED — they are backend-only.
  // Edge Functions access them via Deno.env.get() without VITE_ prefix.
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CONFIGURATION — REMOVED ENTIRELY
// ─────────────────────────────────────────────────────────────────────────────
// Database connection strings, passwords, and host info must NEVER be in the
// frontend bundle. They are accessed exclusively in Edge Functions / server-side
// via Deno.env.get("DATABASE_URL"), etc.

// ─────────────────────────────────────────────────────────────────────────────
// ERROR TRACKING (Sentry)
// ─────────────────────────────────────────────────────────────────────────────

export const ErrorTracking = {
  /** Sentry DSN for error tracking */
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',

  /** Check if Sentry is configured */
  isSentryEnabled: (): boolean => {
    return Boolean(import.meta.env.VITE_SENTRY_DSN);
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

export const Features = {
  /** Enable/disable telemedicine module */
  telemedicine: import.meta.env.VITE_FEATURE_TELEMEDICINE === 'true',

  /** Enable/disable financial reports */
  financialReports: import.meta.env.VITE_FEATURE_FINANCIAL_REPORTS === 'true',

  /** Enable/disable audit logging */
  auditLog: import.meta.env.VITE_FEATURE_AUDIT_LOG === 'true',

  /** Enable/disable dark mode */
  darkMode: import.meta.env.VITE_FEATURE_DARK_MODE === 'true',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME INFORMATION
// ─────────────────────────────────────────────────────────────────────────────

export const Runtime = {
  /** Is development environment */
  isDev: import.meta.env.DEV,

  /** Is production environment */
  isProd: import.meta.env.PROD,

  /** Is SSR (Server-Side Rendering) */
  isSSR: import.meta.env.SSR,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION & SAFETY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that critical environment variables are configured
 * Call this during app initialization to fail fast
 */
export function validateEnvironmentConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Supabase
  if (!Supabase.projectId) {
    errors.push('VITE_SUPABASE_PROJECT_ID is not configured');
  }
  if (!Supabase.url) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  if (!Supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }

  // Check JWT expiry is valid
  if (JWT.accessTokenExpiry <= 0) {
    errors.push('VITE_JWT_ACCESS_TOKEN_EXPIRY must be greater than 0');
  }

  // Check Edge Functions URL
  if (!EdgeFunctions.url) {
    errors.push('VITE_EDGE_FUNCTION_URL is not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log environment configuration (for debugging — use in dev only)
 */
export function logEnvironmentConfig(): void {
  if (!Runtime.isDev) return;

  console.group('Environment Configuration');
  console.log('Supabase:', {
    projectId: Supabase.projectId,
    url: Supabase.url,
    hasAnonKey: !!Supabase.anonKey,
  });
  console.log('Features:', Features);
  console.log('Edge Functions URL:', EdgeFunctions.url);
  console.groupEnd();
}

export default {
  Supabase,
  Stripe,
  JWT,
  EdgeFunctions,
  ErrorTracking,
  Features,
  Runtime,
  validateEnvironmentConfig,
  logEnvironmentConfig,
};
