-- Migration: Add tuss_code to appointments table
-- Date: 2026-03-17
-- Purpose: Enable real TUSS code storage per appointment for financial reports

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS tuss_code text DEFAULT NULL;

COMMENT ON COLUMN public.appointments.tuss_code IS
  'TUSS procedure code (Terminologia Unificada da Saúde Suplementar) for this appointment/procedure.
   Used in financial reports (DoctorFinancialReport) for procedure-based honorarium calculation.
   Populated from the scheduling workflow when a specific procedure is selected.';

CREATE INDEX IF NOT EXISTS idx_appointments_tuss_code ON public.appointments(tuss_code)
  WHERE tuss_code IS NOT NULL;
