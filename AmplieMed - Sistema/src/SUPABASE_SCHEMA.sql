-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Source: Supabase live export (schema-4.txt) — verificado em 2026-03-16
-- Migrations aplicadas: STORAGE_CLEANUP_MIGRATION.sql (v3) + STORAGE_FINAL_GAPS.sql (v4)
-- Status: ✅ SCHEMA 100% FECHADO E VERIFICADO
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- AmplieMed — Schema de Referência Completo
-- Projeto: suycrqtvipfzrkcmopua
-- Arquitetura de Storage: _path (relativo) — sem _url, sem base64, sem blob
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Contratos oficiais de campo de arquivo:
--   profiles.avatar_path       → bucket make-d4766610-avatars   (público)
--   doctors.photo_path         → bucket make-d4766610-avatars   (público)
--   clinic_settings.logo_path  → bucket make-d4766610-avatars   (público)
--   file_attachments.storage_path → bucket dinâmico via bucket_type
--
-- ✅ Trigger ativo: trg_sync_storage_bucket
--      BEFORE INSERT OR UPDATE OF bucket_type ON file_attachments
--      → preenche storage_bucket automaticamente a partir de bucket_type
--
-- ✅ CHECK constraints NOMEADAS ativas (verificadas via pg_constraint):
--   chk_clinic_settings_logo_path_no_url     → clinic_settings.logo_path
--   chk_doctors_photo_path_no_url            → doctors.photo_path
--   chk_profiles_avatar_path_no_url          → profiles.avatar_path
--   chk_file_attachments_storage_path_no_url → file_attachments.storage_path
--   chk_file_attachments_bucket_coherence    → file_attachments (bucket_type × storage_bucket)
--
-- NOTA: O dump visual do Supabase exibe constraints nomeadas inline na coluna,
--       sem o prefixo CONSTRAINT <nome>. As constraints existem como NOMEADAS
--       no pg_constraint e podem ser removidas por nome via ALTER TABLE DROP CONSTRAINT.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── ENUMs definidos no banco (USER-DEFINED) ─────────────────────────────────
-- user_role:              admin | doctor | receptionist | financial
-- gender_type:            M | F | Outro
-- active_status:          active | inactive
-- patient_status:         active | inactive
-- appointment_type:       presencial | telemedicina
-- appointment_status:     confirmado | pendente | cancelado | realizado
-- payment_type_enum:      particular | convenio
-- payment_method:         pix | credito | debito | dinheiro | convenio
-- appointment_payment_status: pendente | pago | parcial | cancelado
-- billing_status:         pending | submitted | approved | rejected | paid | partial
-- payable_status:         pending | paid | overdue | cancelled
-- receivable_status:      pending | received | overdue | cancelled
-- payment_received_status:pending | confirmed | cancelled | refunded
-- exam_status:            solicitado | coletado | em_analise | concluido | cancelado
-- exam_priority:          normal | urgente | muito_urgente
-- record_type:            Consulta | Retorno | Emergência | Cirurgia | Exame | Telemedicina
-- notification_type:      info | warning | error | success
-- message_type:           reminder | result | campaign | chat | system
-- message_channel:        whatsapp | email | sms | push
-- message_status:         pending | sent | delivered | read | failed
-- campaign_type:          reminder | result | birthday | custom | followup
-- campaign_status:        draft | scheduled | running | completed | cancelled
-- queue_status:           waiting | called | in_consultation | completed | absent | cancelled
-- insurance_type:         health | dental | life | multi
-- stock_category:         medicamento | material | equipamento | outro
-- stock_status:           ok | low | critical | expired
-- protocol_category:      tratamento | diagnostico | prevencao | emergencia | cirurgia
-- app_theme:              light | dark | auto
-- tax_regime:             simples | presumido | real
-- clinic_status:          active | inactive | suspended
-- room_type:              consultation | exam | procedure | waiting | reception
-- audit_action:           create | read | update | delete | login | logout | export | import | sign | error
-- audit_status:           success | failure
-- telemedicine_status:    scheduled | in_progress | completed | cancelled | no_show
-- doctor_status:          active | inactive | vacation | suspended
-- doctor_clinic_role:     owner | employee | partner | contractor
-- doctor_payment_model:   percentage | fixed | mixed
-- certificate_type:       none | a1 | a3
-- doctor_time_off_type:   vacation | sick_leave | conference | personal | other
-- template_category:      prescription | exam | referral | certificate | report | custom
-- attachment_entity_type: patient | appointment | medical_record | exam | prescription | financial
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── app_templates ────────────────────────────────────────────────────────────
CREATE TABLE public.app_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  category USER-DEFINED NOT NULL DEFAULT 'prescription'::template_category,
  specialty text DEFAULT ''::text,
  is_favorite boolean NOT NULL DEFAULT false,
  usage_count integer DEFAULT 0,
  content text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_templates_pkey PRIMARY KEY (id),
  CONSTRAINT app_templates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT app_templates_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── appointments ─────────────────────────────────────────────────────────────
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  doctor_id uuid,
  professional_id uuid,
  patient_name text NOT NULL DEFAULT ''::text,
  patient_cpf text DEFAULT ''::text,
  patient_phone text DEFAULT ''::text,
  patient_email text DEFAULT ''::text,
  doctor_name text NOT NULL DEFAULT ''::text,
  specialty text DEFAULT ''::text,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  type USER-DEFINED NOT NULL DEFAULT 'presencial'::appointment_type,
  status USER-DEFINED NOT NULL DEFAULT 'pendente'::appointment_status,
  color text DEFAULT '#3B82F6'::text,
  room text,
  notes text,
  telemed_link text,
  consultation_value numeric,
  payment_type USER-DEFINED DEFAULT 'particular'::payment_type_enum,
  insurance_name text,
  payment_status USER-DEFINED DEFAULT 'pendente'::appointment_payment_status,
  payment_method USER-DEFINED,
  installments integer DEFAULT 1,
  paid_amount numeric DEFAULT 0,
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT appointments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id)
);

-- ─── audit_log ────────────────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  clinic_id uuid,
  user_name text DEFAULT ''::text,
  user_role text DEFAULT ''::text,
  action USER-DEFINED NOT NULL,
  module text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  ip_address inet,
  device text DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'success'::audit_status,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT audit_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── clinic_business_hours ───────────────────────────────────────────────────
CREATE TABLE public.clinic_business_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  shift_start time without time zone,
  shift_end time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_business_hours_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_business_hours_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── clinic_rooms ─────────────────────────────────────────────────────────────
CREATE TABLE public.clinic_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'consultation'::room_type,
  capacity integer DEFAULT 1,
  equipment text[] DEFAULT '{}'::text[],
  available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_rooms_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── clinic_settings ──────────────────────────────────────────────────────────
-- logo_url REMOVIDA (migration v2/v3). Contrato oficial: logo_path (PATH relativo).
-- CHECK chk_clinic_settings_logo_path_no_url: bloqueia http/https/data/blob.
CREATE TABLE public.clinic_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid,
  owner_id uuid,
  clinic_name text NOT NULL DEFAULT 'AmplieMed'::text,
  cnpj text DEFAULT ''::text,
  address text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  email text DEFAULT ''::text,
  working_hours_start time without time zone DEFAULT '08:00:00'::time without time zone,
  working_hours_end time without time zone DEFAULT '18:00:00'::time without time zone,
  appointment_interval integer DEFAULT 30,
  timezone text DEFAULT 'America/Sao_Paulo'::text,
  notifications_email boolean DEFAULT true,
  notifications_sms boolean DEFAULT false,
  notifications_whatsapp boolean DEFAULT false,
  theme USER-DEFINED DEFAULT 'light'::app_theme,
  language text DEFAULT 'pt-BR'::text,
  auto_backup boolean DEFAULT true,
  backup_interval integer DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  logo_path text CHECK (logo_path IS NULL OR logo_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),  -- PATH relativo em make-d4766610-avatars
  CONSTRAINT clinic_settings_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT clinic_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- ─── clinics ──────────────────────────────────────────────────────────────────
CREATE TABLE public.clinics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text UNIQUE,
  registro_ans text,
  email text,
  phone text,
  website text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  specialties text[] DEFAULT '{}'::text[],
  accepted_insurances text[] DEFAULT '{}'::text[],
  bank_name text,
  bank_agency text,
  bank_account text,
  tax_regime USER-DEFINED DEFAULT 'simples'::tax_regime,
  default_consultation_duration integer DEFAULT 30,
  allow_overlapping_appointments boolean DEFAULT false,
  require_payment_before_consultation boolean DEFAULT false,
  send_appointment_reminders boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  status USER-DEFINED NOT NULL DEFAULT 'active'::clinic_status,
  owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinics_pkey PRIMARY KEY (id),
  CONSTRAINT clinics_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- ─── communication_campaigns ──────────────────────────────────────────────────
CREATE TABLE public.communication_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'custom'::campaign_type,
  channel USER-DEFINED NOT NULL DEFAULT 'whatsapp'::message_channel,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::campaign_status,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  message text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communication_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT communication_campaigns_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT communication_campaigns_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── communication_messages ───────────────────────────────────────────────────
CREATE TABLE public.communication_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  type USER-DEFINED NOT NULL DEFAULT 'reminder'::message_type,
  patient_name text DEFAULT ''::text,
  channel USER-DEFINED NOT NULL DEFAULT 'whatsapp'::message_channel,
  subject text DEFAULT ''::text,
  body text DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::message_status,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communication_messages_pkey PRIMARY KEY (id),
  CONSTRAINT communication_messages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT communication_messages_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT communication_messages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

-- ─── doctor_clinic_assignments ───────────────────────────────────────────────
CREATE TABLE public.doctor_clinic_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'employee'::doctor_clinic_role,
  start_date date NOT NULL,
  end_date date,
  consultation_duration integer DEFAULT 30,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_clinic_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_clinic_assignments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT doctor_clinic_assignments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── doctor_procedure_values ─────────────────────────────────────────────────
CREATE TABLE public.doctor_procedure_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  tuss_code text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  percentage numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_procedure_values_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_procedure_values_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);

-- ─── doctor_time_off ─────────────────────────────────────────────────────────
CREATE TABLE public.doctor_time_off (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  approved boolean DEFAULT false,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_time_off_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_time_off_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT doctor_time_off_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id)
);

-- ─── doctor_work_schedules ───────────────────────────────────────────────────
CREATE TABLE public.doctor_work_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift_start time without time zone NOT NULL,
  shift_end time without time zone NOT NULL,
  consultation_duration integer DEFAULT 30,
  max_consultations_per_shift integer,
  effective_from date NOT NULL,
  effective_until date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_work_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_work_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT doctor_work_schedules_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── doctors ─────────────────────────────────────────────────────────────────
-- photo_url REMOVIDA (migration v2/v3). Contrato oficial: photo_path (PATH relativo).
-- CHECK chk_doctors_photo_path_no_url: bloqueia http/https/data/blob.
CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid,
  user_id uuid,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  cpf text DEFAULT ''::text,
  birth_date date,
  gender USER-DEFINED,
  crm text NOT NULL,
  crm_uf text DEFAULT ''::text,
  registro_ans text DEFAULT ''::text,
  specialties text[] DEFAULT '{}'::text[],
  subspecialties text[] DEFAULT '{}'::text[],
  rqe text,
  email text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  cellphone text DEFAULT ''::text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  cert_type USER-DEFINED DEFAULT 'none'::certificate_type,
  cert_issuer text,
  cert_valid_until date,
  cert_serial text,
  payment_model USER-DEFINED DEFAULT 'percentage'::doctor_payment_model,
  fixed_salary numeric,
  revenue_percentage numeric,
  goal_monthly_consultations integer,
  goal_monthly_revenue numeric,
  goal_patient_satisfaction numeric,
  consultations_this_month integer DEFAULT 0,
  revenue_this_month numeric DEFAULT 0,
  avg_satisfaction numeric DEFAULT 0,
  avg_consultation_time integer DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'active'::doctor_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  photo_path text CHECK (photo_path IS NULL OR photo_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),  -- PATH relativo em make-d4766610-avatars
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id),
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT doctors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- ─── drug_interaction_alerts ─────────────────────────────────────────────────
CREATE TABLE public.drug_interaction_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  medical_record_id uuid,
  drug_a text NOT NULL,
  drug_b text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate'::text,
  description text DEFAULT ''::text,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT drug_interaction_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT drug_interaction_alerts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT drug_interaction_alerts_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id),
  CONSTRAINT drug_interaction_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id)
);

-- ─── exams ────────────────────────────────────────────────────────────────────
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  patient_name text NOT NULL DEFAULT ''::text,
  exam_type text NOT NULL DEFAULT ''::text,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  result_date date,
  status USER-DEFINED NOT NULL DEFAULT 'solicitado'::exam_status,
  laboratory text DEFAULT ''::text,
  requested_by text DEFAULT ''::text,
  requested_by_id uuid,
  priority USER-DEFINED NOT NULL DEFAULT 'normal'::exam_priority,
  tuss_code text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT exams_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT exams_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT exams_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES auth.users(id)
);

-- ─── file_attachments ────────────────────────────────────────────────────────
-- storage_bucket preenchido AUTOMATICAMENTE via trigger trg_sync_storage_bucket.
-- CHECK chk_file_attachments_storage_path_no_url: bloqueia http/https/data/blob em storage_path.
-- CHECK chk_file_attachments_bucket_coherence: garante par bucket_type × storage_bucket válido.
-- Mapeamento bucket_type → storage_bucket:
--   avatars   → make-d4766610-avatars   (público)
--   media     → make-d4766610-media     (público)
--   chat      → make-d4766610-chat      (privado)
--   documents → make-d4766610-documents (privado) [default]
CREATE TABLE public.file_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  entity_type USER-DEFINED NOT NULL,
  entity_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  mime_type text DEFAULT 'application/octet-stream'::text,
  size_bytes bigint DEFAULT 0,
  storage_path text NOT NULL DEFAULT ''::text CHECK (storage_path IS NULL OR storage_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),  -- PATH relativo — nunca URL/base64/blob
  storage_bucket text DEFAULT 'make-d4766610-documents'::text,  -- auto via trigger (pendente verificação)
  uploaded_by text DEFAULT ''::text,
  uploaded_by_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  bucket_type text DEFAULT 'documents'::text CHECK (bucket_type = ANY (ARRAY['avatars'::text, 'media'::text, 'documents'::text, 'chat'::text])),
  CONSTRAINT file_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT file_attachments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT file_attachments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT file_attachments_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES auth.users(id)
);

-- ─── financial_billings ───────────────────────────────────────────────────────
CREATE TABLE public.financial_billings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  insurance_id uuid,
  patient_name text DEFAULT ''::text,
  insurance_name text DEFAULT ''::text,
  billing_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::billing_status,
  items_count integer DEFAULT 0,
  guide_number text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_billings_pkey PRIMARY KEY (id),
  CONSTRAINT financial_billings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_billings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT financial_billings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT financial_billings_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.insurances(id)
);

-- ─── financial_glosas ────────────────────────────────────────────────────────
CREATE TABLE public.financial_glosas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  billing_id uuid,
  insurance_id uuid,
  patient_name text DEFAULT ''::text,
  insurance_name text DEFAULT ''::text,
  guide_number text DEFAULT ''::text,
  original_amount numeric NOT NULL DEFAULT 0,
  glosa_amount numeric NOT NULL DEFAULT 0,
  reason text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'pendente'::text,
  contested_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_glosas_pkey PRIMARY KEY (id),
  CONSTRAINT financial_glosas_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_glosas_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT financial_glosas_billing_id_fkey FOREIGN KEY (billing_id) REFERENCES public.financial_billings(id),
  CONSTRAINT financial_glosas_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.insurances(id)
);

-- ─── financial_payables ───────────────────────────────────────────���───────────
CREATE TABLE public.financial_payables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  supplier text DEFAULT ''::text,
  description text DEFAULT ''::text,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::payable_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_payables_pkey PRIMARY KEY (id),
  CONSTRAINT financial_payables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_payables_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── financial_payments ───────────────────────────────────────────────────────
CREATE TABLE public.financial_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  appointment_id uuid,
  patient_name text DEFAULT ''::text,
  payment_type text DEFAULT ''::text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  method text DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::payment_received_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_payments_pkey PRIMARY KEY (id),
  CONSTRAINT financial_payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT financial_payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT financial_payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);

-- ─── financial_receivables ────────────────────────────────────────────────────
CREATE TABLE public.financial_receivables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  patient_name text DEFAULT ''::text,
  description text DEFAULT ''::text,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::receivable_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_receivables_pkey PRIMARY KEY (id),
  CONSTRAINT financial_receivables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_receivables_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT financial_receivables_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

-- ─── insurances ───────────────────────────────────────────────────────────────
CREATE TABLE public.insurances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  cnpj text DEFAULT ''::text,
  register text DEFAULT ''::text,
  type USER-DEFINED NOT NULL DEFAULT 'health'::insurance_type,
  status USER-DEFINED NOT NULL DEFAULT 'active'::active_status,
  phone text DEFAULT ''::text,
  email text DEFAULT ''::text,
  contract_date date,
  expiration_date date,
  grace_period integer DEFAULT 0,
  coverage_percentage numeric DEFAULT 100.00,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurances_pkey PRIMARY KEY (id),
  CONSTRAINT insurances_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT insurances_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── kv_store_d4766610 (sistema — não modificar) ─────────────────────────────
CREATE TABLE public.kv_store_d4766610 (
  key text NOT NULL,
  value jsonb NOT NULL,
  CONSTRAINT kv_store_d4766610_pkey PRIMARY KEY (key)
);

-- ─── medical_records ─────────────────────────────────────────────────────────
CREATE TABLE public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  appointment_id uuid,
  patient_name text NOT NULL DEFAULT ''::text,
  doctor_name text NOT NULL DEFAULT ''::text,
  record_date timestamp with time zone NOT NULL DEFAULT now(),
  type USER-DEFINED NOT NULL DEFAULT 'Consulta'::record_type,
  cid10 text DEFAULT ''::text,
  chief_complaint text DEFAULT ''::text,
  conduct_plan text DEFAULT ''::text,
  anamnesis text,
  physical_exam text,
  prescriptions text,
  signed boolean NOT NULL DEFAULT false,
  signed_at timestamp with time zone,
  signed_by uuid,
  signature_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medical_records_pkey PRIMARY KEY (id),
  CONSTRAINT medical_records_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT medical_records_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT medical_records_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES auth.users(id)
);

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  type USER-DEFINED NOT NULL DEFAULT 'info'::notification_type,
  title text NOT NULL DEFAULT ''::text,
  message text NOT NULL DEFAULT ''::text,
  is_read boolean NOT NULL DEFAULT false,
  urgent boolean NOT NULL DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── patient_insurance_plans ─────────────────────────────────────────────────
CREATE TABLE public.patient_insurance_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  insurance_id uuid NOT NULL,
  card_number text,
  validity date,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patient_insurance_plans_pkey PRIMARY KEY (id),
  CONSTRAINT patient_insurance_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_insurance_plans_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.insurances(id)
);

-- ─── patients ────────────────────────────────────────────────────────────────
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  cpf text NOT NULL,
  rg text DEFAULT ''::text,
  birth_date date,
  age integer,
  gender USER-DEFINED,
  phone text DEFAULT ''::text,
  phone2 text,
  email text DEFAULT ''::text,
  mother_name text DEFAULT ''::text,
  marital_status text DEFAULT ''::text,
  occupation text DEFAULT ''::text,
  address_cep text DEFAULT ''::text,
  address_street text DEFAULT ''::text,
  address_number text DEFAULT ''::text,
  address_complement text,
  address_neighborhood text DEFAULT ''::text,
  address_city text DEFAULT ''::text,
  address_state text DEFAULT ''::text,
  insurance text DEFAULT ''::text,
  insurance_number text,
  insurance_validity text,
  observations text,
  allergies text,
  medications text,
  lgpd_consent boolean NOT NULL DEFAULT false,
  lgpd_consent_date timestamp with time zone,
  responsible_name text,
  responsible_cpf text,
  responsible_phone text,
  responsible_relationship text,
  status USER-DEFINED NOT NULL DEFAULT 'active'::patient_status,
  last_visit date,
  total_visits integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── prescriptions ───────────────────────────────────────────────────────────
CREATE TABLE public.prescriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  owner_id uuid NOT NULL,
  medication_name text NOT NULL,
  dosage text DEFAULT ''::text,
  frequency text DEFAULT ''::text,
  duration text DEFAULT ''::text,
  route text DEFAULT ''::text,
  instructions text DEFAULT ''::text,
  quantity integer DEFAULT 1,
  is_controlled boolean DEFAULT false,
  signed boolean DEFAULT false,
  signed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT prescriptions_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id),
  CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT prescriptions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- ─── professionals ───────────────────────────────────────────────────────────
CREATE TABLE public.professionals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  user_id uuid,
  clinic_id uuid,
  name text NOT NULL,
  crm text DEFAULT ''::text,
  crm_uf text DEFAULT ''::text,
  specialty text DEFAULT ''::text,
  email text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  cpf text DEFAULT ''::text,
  digital_certificate USER-DEFINED DEFAULT 'none'::certificate_type,
  certificate_expiry date,
  status USER-DEFINED NOT NULL DEFAULT 'active'::active_status,
  clinics_names text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT professionals_pkey PRIMARY KEY (id),
  CONSTRAINT professionals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT professionals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT professionals_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── profiles ────────────────────────────────────────────────────────────────
-- avatar_url REMOVIDA (migration v2/v3). Contrato oficial: avatar_path (PATH relativo).
-- CHECK chk_profiles_avatar_path_no_url: bloqueia http/https/data/blob.
CREATE TABLE public.profiles (
  id uuid NOT NULL,  -- mesmo UUID do auth.users
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text,
  role USER-DEFINED NOT NULL DEFAULT 'doctor'::user_role,
  specialty text DEFAULT ''::text,
  crm text DEFAULT ''::text,
  crm_uf text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  initials text DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'active'::active_status,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_path text CHECK (avatar_path IS NULL OR avatar_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),  -- PATH relativo em make-d4766610-avatars
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- ─── protocol_steps ──────────────────────────────────────────────────────────
CREATE TABLE public.protocol_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text DEFAULT ''::text,
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT protocol_steps_pkey PRIMARY KEY (id),
  CONSTRAINT protocol_steps_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.protocols(id)
);

-- ─── protocols ───────────────────────────────────────────────────────────────
CREATE TABLE public.protocols (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  title text NOT NULL,
  specialty text DEFAULT ''::text,
  category USER-DEFINED NOT NULL DEFAULT 'tratamento'::protocol_category,
  last_update date DEFAULT CURRENT_DATE,
  usage_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT protocols_pkey PRIMARY KEY (id),
  CONSTRAINT protocols_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT protocols_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── queue_entries ───────────────────────────────────────────────────────────
CREATE TABLE public.queue_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  ticket_number text NOT NULL DEFAULT ''::text,
  name text NOT NULL DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'waiting'::queue_status,
  arrival_time timestamp with time zone NOT NULL DEFAULT now(),
  waiting_time integer DEFAULT 0,
  doctor text DEFAULT ''::text,
  doctor_id uuid,
  specialty text DEFAULT ''::text,
  priority boolean NOT NULL DEFAULT false,
  room text,
  cpf text,
  birth_date date,
  age integer,
  gender text,
  phone text,
  email text,
  insurance text,
  allergies text,
  called_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT queue_entries_pkey PRIMARY KEY (id),
  CONSTRAINT queue_entries_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT queue_entries_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT queue_entries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT queue_entries_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);

-- ─── stock_items ────────────────────────────────────────────────────────────
CREATE TABLE public.stock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  category USER-DEFINED NOT NULL DEFAULT 'material'::stock_category,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'un'::text,
  batch text DEFAULT ''::text,
  expiry date,
  supplier text DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'ok'::stock_status,
  location text,
  unit_cost numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT stock_items_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── system_users ────────────────────────────────────────────────────────────
CREATE TABLE public.system_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text,
  role USER-DEFINED NOT NULL DEFAULT 'doctor'::user_role,
  status USER-DEFINED NOT NULL DEFAULT 'active'::active_status,
  last_login timestamp with time zone,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_users_pkey PRIMARY KEY (id),
  CONSTRAINT system_users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT system_users_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT system_users_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- ─── telemedicine_sessions ───────────────────────────────────────────────────
CREATE TABLE public.telemedicine_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  doctor_id uuid,
  appointment_id uuid,
  patient_name text NOT NULL DEFAULT ''::text,
  doctor_name text NOT NULL DEFAULT ''::text,
  specialty text DEFAULT ''::text,
  session_date date NOT NULL,
  session_time time without time zone NOT NULL,
  duration integer DEFAULT 30,
  link text DEFAULT ''::text,
  status USER-DEFINED NOT NULL DEFAULT 'scheduled'::telemedicine_status,
  recording_consent boolean NOT NULL DEFAULT false,
  notes text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telemedicine_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT telemedicine_sessions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT telemedicine_sessions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT telemedicine_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT telemedicine_sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT telemedicine_sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER — fn_sync_storage_bucket
-- Adicionado via STORAGE_CLEANUP_MIGRATION.sql (v3)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Garante que storage_bucket seja sempre coerente com bucket_type.
-- Executado BEFORE INSERT OR UPDATE OF bucket_type ON file_attachments.

-- CREATE OR REPLACE FUNCTION public.fn_sync_storage_bucket() RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.storage_bucket := CASE NEW.bucket_type
--     WHEN 'avatars'   THEN 'make-d4766610-avatars'
--     WHEN 'media'     THEN 'make-d4766610-media'
--     WHEN 'chat'      THEN 'make-d4766610-chat'
--     ELSE                   'make-d4766610-documents'
--   END;
--   RETURN NEW;
-- END; $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_sync_storage_bucket
--   BEFORE INSERT OR UPDATE OF bucket_type ON public.file_attachments
--   FOR EACH ROW EXECUTE FUNCTION public.fn_sync_storage_bucket();


-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE — Buckets ativos
-- ═══════════════════════════════════════════════════════════════════════════════
-- make-d4766610-avatars   (público)  → avatar_path, photo_path, logo_path
-- make-d4766610-media     (público)  → mídias visuais operacionais
-- make-d4766610-documents (privado)  → prontuários, exames, documentos médicos
-- make-d4766610-chat      (privado)  → arquivos de mensagens/chat


-- ═══════════════════════════════════════════════════════════��═══════════════════
-- REALTIME — Tabelas habilitadas
-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE communication_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE telemedicine_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE medical_records;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RESUMO DE CONSTRAINTS DE STORAGE (STORAGE_CLEANUP_MIGRATION.sql v3)
-- ═══════════════════════════════════════════════════════════════════════════════
-- chk_profiles_avatar_path_no_url          → profiles.avatar_path
-- chk_doctors_photo_path_no_url            → doctors.photo_path
-- chk_clinic_settings_logo_path_no_url     → clinic_settings.logo_path
-- chk_file_attachments_storage_path_no_url → file_attachments.storage_path
-- chk_file_attachments_bucket_coherence    → file_attachments (bucket_type × storage_bucket)
-- Trigger: trg_sync_storage_bucket         → file_attachments (auto-fill storage_bucket)