/**
 * Stripe Integration Module
 * 
 * Provides utilities for Stripe payment processing
 * Only enabled if VITE_STRIPE_PUBLISHABLE_KEY is configured in .env
 */

import { Stripe as envConfig } from './envConfig';

// Type definitions
export interface StripeConfig {
  publishableKey: string;
  isConfigured: boolean;
}

/**
 * Get Stripe configuration
 * Returns null if Stripe is not configured
 */
export function getStripeConfig(): StripeConfig | null {
  if (!envConfig.publishableKey) {
    return null;
  }
  
  return {
    publishableKey: envConfig.publishableKey,
    isConfigured: true,
  };
}

/**
 * Check if Stripe is configured and ready to use
 */
export function isStripeConfigured(): boolean {
  return envConfig.isConfigured();
}

/**
 * Initialize Stripe (would be called in components that need it)
 * 
 * Example usage:
 * ```typescript
 * import { getStripeConfig } from './stripeClient';
 * 
 * const config = getStripeConfig();
 * if (config) {
 *   // Initialize Stripe.js
 *   const stripe = await loadStripe(config.publishableKey);
 * }
 * ```
 */
export async function initializeStripe() {
  const config = getStripeConfig();
  
  if (!config) {
    console.warn('⚠️ Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in .env');
    return null;
  }
  
  try {
    // This would typically load Stripe.js library
    // const { loadStripe } = await import('@stripe/stripe-js');
    // return await loadStripe(config.publishableKey);
    
    console.log('✅ Stripe configuration loaded');
    return config;
  } catch (error) {
    console.error('❌ Failed to initialize Stripe:', error);
    return null;
  }
}

export default {
  getStripeConfig,
  isStripeConfigured,
  initializeStripe,
};
