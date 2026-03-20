-- This migration improves how rooms are assigned to professionals.
-- 1. A new table `professional_clinic_assignments` is created to properly associate professionals with clinics and specific rooms within those clinics. This is a more flexible and scalable approach.
-- 2. A `default_room` column is added to the `professionals` table for simplicity, to define a primary or default room for a professional.

-- Create the new assignment table
CREATE TABLE public.professional_clinic_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,

  CONSTRAINT professional_clinic_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT professional_clinic_assignments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE,
  CONSTRAINT professional_clinic_assignments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT professional_clinic_assignments_professional_id_clinic_id_key UNIQUE (professional_id, clinic_id)
);

COMMENT ON TABLE public.professional_clinic_assignments IS 'Assigns professionals to clinics and specifies their room.';

-- Add a default room to the professionals table
ALTER TABLE public.professionals
ADD COLUMN default_room text;

COMMENT ON COLUMN public.professionals.default_room IS 'Default or primary room for the professional.';

-- Mark the old doctor-specific assignment table as deprecated
COMMENT ON TABLE public.doctor_clinic_assignments IS 'DEPRECATED: Use professional_clinic_assignments instead. This allows any professional, not just doctors, to be assigned to a clinic and room.';
