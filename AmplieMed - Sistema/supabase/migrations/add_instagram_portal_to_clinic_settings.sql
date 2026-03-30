ALTER TABLE public.clinic_settings
  ADD COLUMN IF NOT EXISTS instagram text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS patient_portal_url text DEFAULT NULL;
