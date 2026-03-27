/**
 * Edge Functions Configuration & Utilities
 *
 * Provides frontend-safe utilities for Edge Functions.
 * Secret credentials (access token, email, password) are NEVER available
 * in the frontend — they exist only in Edge Functions via Deno.env.get().
 */

import { EdgeFunctions as edgeFunctionsConfig } from './envConfig';

// Type definitions
export interface EdgeFunctionConfig {
  url: string;
}

/**
 * Get Edge Functions base URL
 */
export function getEdgeFunctionBaseURL(): string {
  return edgeFunctionsConfig.url;
}

/**
 * Build full Edge Function URL
 * @param functionPath - Path to the function (e.g., '/auth/clinic-signup')
 */
export function getEdgeFunctionURL(functionPath: string): string {
  const baseURL = getEdgeFunctionBaseURL();
  return `${baseURL}${functionPath}`;
}

/**
 * Get configuration for Edge Functions (frontend-safe)
 */
export function getEdgeFunctionsConfig(): EdgeFunctionConfig {
  return {
    url: edgeFunctionsConfig.url,
  };
}

/**
 * Check if Edge Functions are properly configured
 */
export function isEdgeFunctionsConfigured(): boolean {
  return !!edgeFunctionsConfig.url;
}

/**
 * Get information about available Edge Functions
 */
export function getEdgeFunctionsInfo() {
  return {
    baseURL: edgeFunctionsConfig.url,
    isConfigured: isEdgeFunctionsConfigured(),
    availableFunctions: [
      '/auth/clinic-signup',
      '/auth/accept-clinic-invite',
      '/clinic/invite',
    ],
  };
}

/**
 * Log Edge Functions configuration (for debugging — use in dev only)
 */
export function logEdgeFunctionsConfig(): void {
  if (!import.meta.env.DEV) return;

  console.group('Edge Functions Configuration');
  console.log('Base URL:', edgeFunctionsConfig.url);
  console.log('Is Configured:', isEdgeFunctionsConfigured());
  console.log('Available Functions:', getEdgeFunctionsInfo().availableFunctions);
  console.groupEnd();
}

export default {
  getEdgeFunctionBaseURL,
  getEdgeFunctionURL,
  getEdgeFunctionsConfig,
  isEdgeFunctionsConfigured,
  getEdgeFunctionsInfo,
  logEdgeFunctionsConfig,
};
