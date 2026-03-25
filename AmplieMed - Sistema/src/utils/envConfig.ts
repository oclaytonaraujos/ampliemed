/**
 * Environment Configuration — Central Point for All .env Variables
 * 
 * This file provides centralized access to all environment variables
 * synced from .env file. Import from here instead of using import.meta.env directly.
 * 
 * ✅ All variables are properly typed and synchronized with .env
 * ✅ Safe defaults provided for development
 */

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIGURATION
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
  
  /** Service role key (⚠️ Backend only — NOT for frontend) */
  serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE CONFIGURATION (Payment Processing)
// ─────────────────────────────────────────────────────────────────────────────

export const Stripe = {
  /** Public key for Stripe.js (safe to expose in frontend) */
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  
  /** Secret key (⚠️ Backend only — NOT for frontend) */
  secretKey: import.meta.env.VITE_STRIPE_SECRET_KEY || '',
  
  /** Check if Stripe is configured */
  isConfigured: (): boolean => {
    return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// JWT CONFIGURATION (Authentication)
// ─────────────────────────────────────────────────────────────────────────────

export const JWT = {
  /** Current JWT secret (⚠️ Backend only) */
  secret: import.meta.env.VITE_JWT_SECRET || '',
  
  /** Previous JWT secret for validation during rotation (⚠️ Backend only) */
  secretPrevious: import.meta.env.VITE_JWT_SECRET_PREVIOUS || '',
  
  /** Legacy JWT secret for compatibility (⚠️ Backend only, deprecated) */
  secretLegacy: import.meta.env.VITE_JWT_SECRET_LEGACY || '',
  
  /** Access token expiration in seconds */
  accessTokenExpiry: parseInt(import.meta.env.VITE_JWT_ACCESS_TOKEN_EXPIRY || '3600', 10),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EDGE FUNCTIONS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const EdgeFunctions = {
  /** Base URL for invoking Edge Functions */
  url: import.meta.env.VITE_EDGE_FUNCTION_URL || 'https://suycrqtvipfzrkcmopua.supabase.co/functions/v1',
  
  /** Access token for deploying functions (for scripts, not frontend) */
  accessToken: import.meta.env.VITE_EDGE_FUNCTION_ACCESS_TOKEN || '',
  
  /** Email credentials for sending emails via Edge Functions */
  email: import.meta.env.VITE_EDGE_FUNCTION_SECRET_EMAIL || '',
  
  /** Password for email service (⚠️ Backend only) */
  password: import.meta.env.VITE_EDGE_FUNCTION_SECRET_PASSWORD || '',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const Database = {
  /** Full PostgreSQL connection string (⚠️ Backend/scripts only) */
  url: import.meta.env.DATABASE_URL || '',
  
  /** Database host */
  host: import.meta.env.DATABASE_HOST || 'db.suycrqtvipfzrkcmopua.supabase.co',
  
  /** Database port */
  port: parseInt(import.meta.env.DATABASE_PORT || '5432', 10),
  
  /** Database user */
  user: import.meta.env.DATABASE_USER || 'postgres',
  
  /** Database name */
  name: import.meta.env.DATABASE_NAME || 'postgres',
  
  /** Database password (⚠️ Backend/scripts only) */
  password: import.meta.env.DATABASE_PASSWORD || '',
} as const;

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
  
  console.group('🔧 Environment Configuration');
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
  Database,
  ErrorTracking,
  Features,
  Runtime,
  validateEnvironmentConfig,
  logEnvironmentConfig,
};
