-- ═══════════════════════════════════════════════════════════════════════════════
-- PATIENT PORTAL TOKEN
-- Adds per-patient unique portal token + anonymous-safe RPC functions
-- enabling magic-link portal access without Supabase Auth credentials.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add portal_token column
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS portal_token UUID DEFAULT gen_random_uuid();

-- 2. Backfill any NULLs on pre-existing rows
UPDATE patients SET portal_token = gen_random_uuid() WHERE portal_token IS NULL;

-- 3. Enforce NOT NULL + unique
ALTER TABLE patients ALTER COLUMN portal_token SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_portal_token_unique'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_portal_token_unique UNIQUE (portal_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_portal_token ON patients(portal_token);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_patient_by_portal_token
-- Returns the patient row as JSON for a valid (active) portal token.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_patient_by_portal_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row patients%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM patients
  WHERE portal_token = p_token AND status = 'active';
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN row_to_json(v_row);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_appointments_by_portal_token
-- Returns upcoming (non-cancelled/completed) appointments for the patient.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_appointments_by_portal_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_cpf  TEXT;
BEGIN
  SELECT name, cpf INTO v_name, v_cpf
  FROM patients WHERE portal_token = p_token AND status = 'active';
  IF v_name IS NULL THEN RETURN '[]'::JSON; END IF;

  RETURN COALESCE(
    (SELECT json_agg(a ORDER BY a.appointment_date ASC, a.appointment_time ASC)
     FROM appointments a
     WHERE (a.patient_name = v_name OR a.patient_cpf = v_cpf)
       AND a.status NOT IN ('cancelado', 'realizado', 'cancelada', 'realizada', 'nao_compareceu')),
    '[]'::JSON
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_records_by_portal_token
-- Returns all medical records for the patient, newest first.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_records_by_portal_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   UUID;
  v_name TEXT;
BEGIN
  SELECT id, name INTO v_id, v_name
  FROM patients WHERE portal_token = p_token AND status = 'active';
  IF v_id IS NULL THEN RETURN '[]'::JSON; END IF;

  RETURN COALESCE(
    (SELECT json_agg(r ORDER BY r.record_date DESC)
     FROM medical_records r
     WHERE r.patient_id = v_id OR r.patient_name = v_name),
    '[]'::JSON
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_payments_by_portal_token
-- Returns payment history for the patient, newest first.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_payments_by_portal_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT name INTO v_name
  FROM patients WHERE portal_token = p_token AND status = 'active';
  IF v_name IS NULL THEN RETURN '[]'::JSON; END IF;

  RETURN COALESCE(
    (SELECT json_agg(p ORDER BY p.payment_date DESC)
     FROM financial_payments p
     WHERE p.patient = v_name),
    '[]'::JSON
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_professionals_for_portal
-- Returns active professionals (id, name, specialty) for the scheduling form.
-- Requires a valid portal token as minimal auth gate.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_professionals_for_portal(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patients WHERE portal_token = p_token) THEN
    RETURN '[]'::JSON;
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(
       json_build_object('id', p.id, 'name', p.name, 'specialty', p.specialty)
       ORDER BY p.name
     )
     FROM professionals p
     WHERE p.status = 'active' OR p.status IS NULL),
    '[]'::JSON
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: book_appointment_portal
-- Creates an appointment on behalf of the patient identified by portal token.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.book_appointment_portal(
  p_token       UUID,
  p_doctor_name TEXT,
  p_specialty   TEXT,
  p_date        TEXT,
  p_time        TEXT,
  p_type        TEXT DEFAULT 'presencial',
  p_notes       TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient patients%ROWTYPE;
  v_new_id  UUID := gen_random_uuid();
BEGIN
  SELECT * INTO v_patient
  FROM patients WHERE portal_token = p_token AND status = 'active';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token inválido ou paciente inativo');
  END IF;

  INSERT INTO appointments (
    id, owner_id,
    patient_name, patient_cpf, patient_phone, patient_email,
    doctor_name, specialty,
    appointment_date, appointment_time,
    duration, type, status, color,
    notes, payment_status, payment_type
  ) VALUES (
    v_new_id,
    v_patient.owner_id,
    v_patient.name, v_patient.cpf, v_patient.phone, v_patient.email,
    p_doctor_name, p_specialty,
    p_date::DATE, p_time,
    30, p_type, 'pendente', '#ec4899',
    p_notes, 'pendente', 'particular'
  );

  RETURN json_build_object('id', v_new_id, 'success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: cancel_appointment_portal
-- Cancels an appointment belonging to the patient identified by portal token.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_appointment_portal(
  p_token          UUID,
  p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_cpf  TEXT;
BEGIN
  SELECT name, cpf INTO v_name, v_cpf
  FROM patients WHERE portal_token = p_token AND status = 'active';
  IF v_name IS NULL THEN RETURN FALSE; END IF;

  UPDATE appointments
  SET status = 'cancelado'
  WHERE id = p_appointment_id
    AND (patient_name = v_name OR patient_cpf = v_cpf)
    AND status NOT IN ('realizado', 'realizada', 'cancelado', 'cancelada', 'nao_compareceu');

  RETURN FOUND;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grant execute to anon (portal) and authenticated (session mode)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_patient_by_portal_token(UUID)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointments_by_portal_token(UUID)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_records_by_portal_token(UUID)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payments_by_portal_token(UUID)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_professionals_for_portal(UUID)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_appointment_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_portal(UUID, UUID)    TO anon, authenticated;
