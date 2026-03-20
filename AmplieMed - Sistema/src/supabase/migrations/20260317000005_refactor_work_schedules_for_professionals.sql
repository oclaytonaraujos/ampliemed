-- This migration refactors the work schedules table to align with the new `professionals` table.
-- It renames the table, column, and constraints to ensure consistency and fix the scheduling functionality.

-- 1. Rename the table from `doctor_work_schedules` to `professional_work_schedules`
ALTER TABLE public.doctor_work_schedules RENAME TO professional_work_schedules;

-- 2. Rename the primary key constraint
ALTER TABLE public.professional_work_schedules RENAME CONSTRAINT doctor_work_schedules_pkey TO professional_work_schedules_pkey;

-- 3. Rename the foreign key constraint for clinic_id
ALTER TABLE public.professional_work_schedules RENAME CONSTRAINT doctor_work_schedules_clinic_id_fkey TO professional_work_schedules_clinic_id_fkey;

-- 4. Rename the `doctor_id` column to `professional_id`
ALTER TABLE public.professional_work_schedules RENAME COLUMN doctor_id TO professional_id;

-- 5. Drop the old foreign key on the `doctor_id` column
ALTER TABLE public.professional_work_schedules DROP CONSTRAINT doctor_work_schedules_doctor_id_fkey;

-- 6. Add a new foreign key for `professional_id` referencing the `professionals` table
ALTER TABLE public.professional_work_schedules
ADD CONSTRAINT professional_work_schedules_professional_id_fkey
FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE;

-- 7. Add a comment to the table to reflect the change
COMMENT ON TABLE public.professional_work_schedules IS 'Work schedules for all professionals, replacing the deprecated doctor_work_schedules.';
