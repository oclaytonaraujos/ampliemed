-- Migration: Add financial fields to professionals table
-- Date: 2026-03-17
-- Purpose: Enable financial calculations directly from professionals table, eliminating need for mock data

-- Add payment_model ENUM if not exists
DO $$ BEGIN
  CREATE TYPE doctor_payment_model AS ENUM ('fixed', 'percentage', 'procedure', 'mixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add financial columns to professionals table
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS payment_model doctor_payment_model DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS fixed_salary numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_percentage numeric DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS goal_monthly_consultations integer,
  ADD COLUMN IF NOT EXISTS goal_monthly_revenue numeric,
  ADD COLUMN IF NOT EXISTS goal_patient_satisfaction numeric,
  ADD COLUMN IF NOT EXISTS consultations_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_this_month numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_satisfaction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_consultation_time integer DEFAULT 0;

-- Add role column if not exists (to filter doctors)
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'doctor';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_professionals_role ON public.professionals(role);
CREATE INDEX IF NOT EXISTS idx_professionals_payment_model ON public.professionals(payment_model);

-- Create table for procedure-specific values (like doctor_procedure_values)
CREATE TABLE IF NOT EXISTS public.professional_procedure_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  tuss_code text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  percentage numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT professional_procedure_values_pkey PRIMARY KEY (id),
  CONSTRAINT professional_procedure_values_professional_id_fkey 
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_professional_procedure_values_professional 
  ON public.professional_procedure_values(professional_id);

-- Add comments for documentation
COMMENT ON COLUMN public.professionals.payment_model IS 'Model: fixed (salary), percentage (revenue %), procedure (per-procedure), mixed (combination)';
COMMENT ON COLUMN public.professionals.fixed_salary IS 'Monthly fixed salary amount';
COMMENT ON COLUMN public.professionals.revenue_percentage IS 'Percentage of revenue earned by professional (0-100)';
COMMENT ON COLUMN public.professionals.goal_monthly_consultations IS 'Target number of consultations per month';
COMMENT ON COLUMN public.professionals.goal_monthly_revenue IS 'Target revenue amount per month';
COMMENT ON COLUMN public.professionals.consultations_this_month IS 'Actual consultations in current month (auto-updated)';
COMMENT ON COLUMN public.professionals.revenue_this_month IS 'Actual revenue in current month (auto-updated)';
