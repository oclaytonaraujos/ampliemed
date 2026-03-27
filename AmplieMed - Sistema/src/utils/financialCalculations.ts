/**
 * Financial Calculations Utilities
 * Replaces mock data (doctorsDatabase) with real data from professionals
 * Created: 2026-03-17
 * Updated: 2026-03-17 — removed arbitrary fallbacks (|| 30, || 20); returns 0 when
 *   revenuePercentage is not configured so callers can detect and surface the gap.
 */

import type { Professional } from '../components/AppContext';

// ─── Configuration guard helpers ─────────────────────────────────────────────

/**
 * Returns true when the professional has a valid revenue percentage configured
 * (non-null, non-zero).  Used to distinguish "0%" from "not configured" in the UI.
 */
export function isRevenuePercentageConfigured(professional: Professional): boolean {
  return professional.revenuePercentage != null && professional.revenuePercentage > 0;
}

/**
 * Returns true when the professional's payment model is fully configured for
 * honorarium calculation (i.e. all required fields are present).
 */
export function isPaymentModelConfigured(professional: Professional): boolean {
  if (!professional.paymentModel) return false;
  switch (professional.paymentModel) {
    case 'fixed':
      return (professional.fixedSalary ?? 0) > 0;
    case 'percentage':
      return isRevenuePercentageConfigured(professional);
    case 'procedure':
      // Procedure model relies on per-procedure table; always "potentially" configured.
      return true;
    case 'mixed':
      // Mixed requires at least a fixed salary OR a percentage to be set.
      return (professional.fixedSalary ?? 0) > 0 || isRevenuePercentageConfigured(professional);
    default:
      return false;
  }
}

// ─── Core calculation ─────────────────────────────────────────────────────────

/**
 * Calculate doctor honorarium based on payment model.
 *
 * When `revenuePercentage` is not configured (null / undefined) for models that
 * require it, returns **0** instead of an arbitrary default.  Callers should use
 * `isRevenuePercentageConfigured()` to detect this case and surface a warning.
 */
export function calculateDoctorHonorarium(
  professional: Professional,
  tussCode: string,
  consultationValue: number,
  procedureValues?: { tussCode: string; value: number; percentage?: number }[]
): number {
  if (!professional.paymentModel) {
    return 0; // No payment model configured — cannot calculate
  }

  switch (professional.paymentModel) {
    case 'fixed':
      // Fixed salary model — per-consultation honorarium is zero (salary paid monthly)
      return 0;

    case 'percentage': {
      if (professional.revenuePercentage == null) {
        // Percentage not configured — return 0 (caller must detect via isRevenuePercentageConfigured)
        return 0;
      }
      return (consultationValue * professional.revenuePercentage) / 100;
    }

    case 'procedure': {
      // Look up specific procedure value
      const procedureValue = procedureValues?.find(pv => pv.tussCode === tussCode);
      if (procedureValue?.value) {
        return procedureValue.value;
      }
      if (procedureValue?.percentage) {
        return (consultationValue * procedureValue.percentage) / 100;
      }
      // No matching procedure entry — fall back to percentage if configured; else 0
      if (professional.revenuePercentage == null) return 0;
      return (consultationValue * professional.revenuePercentage) / 100;
    }

    case 'mixed': {
      // Variable component of the mixed model
      if (professional.revenuePercentage == null) return 0;
      return (consultationValue * professional.revenuePercentage) / 100;
    }

    default:
      return 0;
  }
}

// ─── Monthly totals ───────────────────────────────────────────────────────────

/**
 * Calculate total earnings including fixed salary (for monthly reports).
 * Fixed salary is added only for 'fixed' and 'mixed' models.
 */
export function calculateTotalEarnings(
  professional: Professional,
  consultationHonorarium: number
): number {
  let total = consultationHonorarium;

  if (professional.paymentModel === 'fixed' || professional.paymentModel === 'mixed') {
    total += professional.fixedSalary ?? 0;
  }

  return total;
}

// ─── Margin ───────────────────────────────────────────────────────────────────

/**
 * Calculate clinic margin (revenue - honorarium).
 */
export function calculateClinicMargin(
  consultationValue: number,
  doctorHonorarium: number
): number {
  return consultationValue - doctorHonorarium;
}

/**
 * Calculate margin percentage.
 */
export function calculateMarginPercentage(
  totalRevenue: number,
  totalHonorarium: number
): number {
  if (totalRevenue === 0) return 0;
  const margin = totalRevenue - totalHonorarium;
  return (margin / totalRevenue) * 100;
}

// ─── Labels & display ─────────────────────────────────────────────────────────

/**
 * Get payment model display name in Portuguese.
 */
export function getPaymentModelLabel(model?: string): string {
  switch (model) {
    case 'fixed':      return 'Fixo';
    case 'percentage': return 'Percentual';
    case 'procedure':  return 'Procedimento';
    case 'mixed':      return 'Misto';
    default:           return 'Não definido';
  }
}

/**
 * Format currency for Brazilian Real.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// ─── Productivity ─────────────────────────────────────────────────────────────

/**
 * Get productivity level based on consultations vs. goal.
 */
export function getProductivityLevel(
  consultationsThisMonth: number,
  goalMonthlyConsultations?: number
): 'low' | 'medium' | 'high' | 'excellent' {
  if (!goalMonthlyConsultations) {
    if (consultationsThisMonth < 30) return 'low';
    if (consultationsThisMonth < 60) return 'medium';
    if (consultationsThisMonth < 90) return 'high';
    return 'excellent';
  }

  const percentage = (consultationsThisMonth / goalMonthlyConsultations) * 100;
  if (percentage < 50)  return 'low';
  if (percentage < 80)  return 'medium';
  if (percentage < 100) return 'high';
  return 'excellent';
}

/**
 * Get productivity Tailwind color classes for UI badges.
 */
export function getProductivityColor(level: 'low' | 'medium' | 'high' | 'excellent'): string {
  switch (level) {
    case 'low':       return 'text-red-600 bg-red-50 border-red-300';
    case 'medium':    return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    case 'high':      return 'text-pink-600 bg-pink-50 border-pink-300';
    case 'excellent': return 'text-green-600 bg-green-50 border-green-300';
  }
}
