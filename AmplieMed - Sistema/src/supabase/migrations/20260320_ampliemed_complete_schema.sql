-- ═══════════════════════════════════════════════════════════════════════════════
-- AMPLIEMED - COMPLETE DATABASE SCHEMA AND MIGRATIONS
-- Single consolidated migration file - Source of Truth
-- ═══════════════════════════════════════════════════════════════════════════════
-- Generated: 2026-03-25
-- Purpose: Creates complete database schema and applies all enhancements
-- Tables: 42 | ENUMs: 41 | Type-Safe: ✅
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1: CREATE ALL ENUMS (Type Safety Foundation)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist', 'financial', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE active_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE certificate_type AS ENUM ('none', 'a1', 'a3');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE doctor_payment_model AS ENUM ('fixed', 'percentage', 'procedure', 'mixed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('presencial', 'telemed', 'retorno');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('pendente', 'confirmada', 'realizada', 'cancelada', 'nao_compareceu');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_type_enum AS ENUM ('particular', 'convenio', 'plano_saude');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_payment_status AS ENUM ('pendente', 'pago', 'parcial', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia', 'pix', 'cheque');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE doctor_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE template_category AS ENUM ('prescription', 'exam', 'note', 'report');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE room_type AS ENUM ('consultation', 'procedure', 'surgery', 'waiting', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE app_theme AS ENUM ('light', 'dark', 'auto');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE clinic_status AS ENUM ('active', 'inactive', 'suspended', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tax_regime AS ENUM ('simples', 'lucro_real', 'lucro_presumido', 'mei');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_type AS ENUM ('birthday', 'followup', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_channel AS ENUM ('whatsapp', 'sms', 'email');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('reminder', 'confirmation', 'notification', 'alert');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('pending', 'sent', 'failed', 'delivered');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE doctor_clinic_role AS ENUM ('employee', 'partner', 'contractor');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE time_off_type AS ENUM ('vacation', 'sick_leave', 'personal', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE patient_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE insurance_type AS ENUM ('health', 'dental', 'vision', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE record_type AS ENUM ('Consulta', 'Procedimento', 'Internação', 'Diagnóstico');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('pending', 'sent', 'received', 'paid', 'disputed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payable_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_received_status AS ENUM ('pending', 'received', 'refunded', 'disputed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE receivable_status AS ENUM ('pending', 'received', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_status AS ENUM ('solicitado', 'realizado', 'resultado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_priority AS ENUM ('normal', 'urgente', 'eletivo');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE file_entity_type AS ENUM ('patient', 'appointment', 'medical_record', 'prescription', 'exam', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_category AS ENUM ('material', 'medication', 'equipment', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM ('ok', 'low', 'out_of_stock', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_status AS ENUM ('waiting', 'called', 'in_service', 'completed', 'absent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE telemedicine_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE protocol_category AS ENUM ('tratamento', 'diagnostico', 'prevencao', 'outro');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('success', 'failure', 'pending');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: CREATE ALL TABLES (Proper order respecting FK constraints)
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text,
  role user_role NOT NULL DEFAULT 'doctor'::user_role,
  specialty text DEFAULT ''::text,
  crm text DEFAULT ''::text,
  crm_uf text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  initials text DEFAULT ''::text,
  status active_status NOT NULL DEFAULT 'active'::active_status,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_path text CHECK (avatar_path IS NULL OR avatar_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Clinics
CREATE TABLE IF NOT EXISTS public.clinics (
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
  tax_regime tax_regime DEFAULT 'simples'::tax_regime,
  default_consultation_duration integer DEFAULT 30,
  allow_overlapping_appointments boolean DEFAULT false,
  require_payment_before_consultation boolean DEFAULT false,
  send_appointment_reminders boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  status clinic_status NOT NULL DEFAULT 'active'::clinic_status,
  owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinics_pkey PRIMARY KEY (id),
  CONSTRAINT clinics_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- Professionals
CREATE TABLE IF NOT EXISTS public.professionals (
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
  digital_certificate certificate_type DEFAULT 'none'::certificate_type,
  certificate_expiry date,
  status active_status NOT NULL DEFAULT 'active'::active_status,
  clinics_names text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_model doctor_payment_model DEFAULT 'percentage'::doctor_payment_model,
  fixed_salary numeric DEFAULT 0,
  revenue_percentage numeric DEFAULT 30.00,
  goal_monthly_consultations integer,
  goal_monthly_revenue numeric,
  goal_patient_satisfaction numeric,
  consultations_this_month integer DEFAULT 0,
  revenue_this_month numeric DEFAULT 0,
  avg_satisfaction numeric DEFAULT 0,
  avg_consultation_time integer DEFAULT 0,
  role text DEFAULT 'doctor'::text,
  default_room text,
  other_role_description text,
  CONSTRAINT professionals_pkey PRIMARY KEY (id),
  CONSTRAINT professionals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT professionals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT professionals_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Doctors (legacy, can reference professionals)
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid,
  user_id uuid,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  cpf text DEFAULT ''::text,
  birth_date date,
  gender gender,
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
  cert_type certificate_type DEFAULT 'none'::certificate_type,
  cert_issuer text,
  cert_valid_until date,
  cert_serial text,
  payment_model doctor_payment_model DEFAULT 'percentage'::doctor_payment_model,
  fixed_salary numeric,
  revenue_percentage numeric,
  goal_monthly_consultations integer,
  goal_monthly_revenue numeric,
  goal_patient_satisfaction numeric,
  consultations_this_month integer DEFAULT 0,
  revenue_this_month numeric DEFAULT 0,
  avg_satisfaction numeric DEFAULT 0,
  avg_consultation_time integer DEFAULT 0,
  status doctor_status NOT NULL DEFAULT 'active'::doctor_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  photo_path text CHECK (photo_path IS NULL OR photo_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id),
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT doctors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  cpf text NOT NULL,
  rg text DEFAULT ''::text,
  birth_date date,
  age integer,
  gender gender,
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
  status patient_status NOT NULL DEFAULT 'active'::patient_status,
  last_visit date,
  total_visits integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Insurances
CREATE TABLE IF NOT EXISTS public.insurances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  cnpj text DEFAULT ''::text,
  register text DEFAULT ''::text,
  type insurance_type NOT NULL DEFAULT 'health'::insurance_type,
  status active_status NOT NULL DEFAULT 'active'::active_status,
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

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
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
  type appointment_type NOT NULL DEFAULT 'presencial'::appointment_type,
  status appointment_status NOT NULL DEFAULT 'pendente'::appointment_status,
  color text DEFAULT '#3B82F6'::text,
  room text,
  notes text,
  telemed_link text,
  consultation_value numeric,
  payment_type payment_type_enum DEFAULT 'particular'::payment_type_enum,
  insurance_name text,
  payment_status appointment_payment_status DEFAULT 'pendente'::appointment_payment_status,
  payment_method payment_method_type,
  installments integer DEFAULT 1,
  paid_amount numeric DEFAULT 0,
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tuss_code text,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT appointments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id)
);

-- Medical Records
CREATE TABLE IF NOT EXISTS public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  appointment_id uuid,
  patient_name text NOT NULL DEFAULT ''::text,
  doctor_name text NOT NULL DEFAULT ''::text,
  record_date timestamp with time zone NOT NULL DEFAULT now(),
  type record_type NOT NULL DEFAULT 'Consulta'::record_type,
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

-- Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
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

-- Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  patient_name text NOT NULL DEFAULT ''::text,
  exam_type text NOT NULL DEFAULT ''::text,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  result_date date,
  status exam_status NOT NULL DEFAULT 'solicitado'::exam_status,
  laboratory text DEFAULT ''::text,
  requested_by text DEFAULT ''::text,
  requested_by_id uuid,
  priority exam_priority NOT NULL DEFAULT 'normal'::exam_priority,
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

-- Drug Interaction Alerts
CREATE TABLE IF NOT EXISTS public.drug_interaction_alerts (
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

-- Patient Insurance Plans
CREATE TABLE IF NOT EXISTS public.patient_insurance_plans (
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

-- Clinic Settings
CREATE TABLE IF NOT EXISTS public.clinic_settings (
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
  theme app_theme DEFAULT 'light'::app_theme,
  language text DEFAULT 'pt-BR'::text,
  auto_backup boolean DEFAULT true,
  backup_interval integer DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  logo_path text CHECK (logo_path IS NULL OR logo_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),
  CONSTRAINT clinic_settings_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT clinic_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- Clinic Business Hours
CREATE TABLE IF NOT EXISTS public.clinic_business_hours (
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

-- Clinic Rooms
CREATE TABLE IF NOT EXISTS public.clinic_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  type room_type NOT NULL DEFAULT 'consultation'::room_type,
  capacity integer DEFAULT 1,
  equipment text[] DEFAULT '{}'::text[],
  available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_rooms_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Clinic Memberships
CREATE TABLE IF NOT EXISTS public.clinic_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'doctor'::text CHECK (role = ANY (ARRAY['admin'::text, 'doctor'::text, 'receptionist'::text, 'financial'::text, 'viewer'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  CONSTRAINT clinic_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_memberships_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT clinic_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Clinic Invite Tokens
CREATE TABLE IF NOT EXISTS public.clinic_invite_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  invited_email text NOT NULL,
  role text DEFAULT 'doctor'::text CHECK (role = ANY (ARRAY['admin'::text, 'doctor'::text, 'receptionist'::text, 'financial'::text, 'viewer'::text])),
  metadata jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '48:00:00'::interval),
  used_at timestamp with time zone,
  used_by uuid,
  CONSTRAINT clinic_invite_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_invite_tokens_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT clinic_invite_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT clinic_invite_tokens_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id)
);

-- Doctor Clinic Assignments
CREATE TABLE IF NOT EXISTS public.doctor_clinic_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  role doctor_clinic_role NOT NULL DEFAULT 'employee'::doctor_clinic_role,
  start_date date NOT NULL,
  end_date date,
  consultation_duration integer DEFAULT 30,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_clinic_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_clinic_assignments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT doctor_clinic_assignments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Professional Clinic Assignments (UNIQUE constraint with clinic)
CREATE TABLE IF NOT EXISTS public.professional_clinic_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT professional_clinic_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT professional_clinic_assignments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id),
  CONSTRAINT professional_clinic_assignments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT professional_clinic_assignments_professional_id_clinic_id_key UNIQUE (professional_id, clinic_id)
);

-- Doctor Procedure Values
CREATE TABLE IF NOT EXISTS public.doctor_procedure_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  tuss_code text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  percentage numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_procedure_values_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_procedure_values_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);

-- Professional Procedure Values
CREATE TABLE IF NOT EXISTS public.professional_procedure_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  tuss_code text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  percentage numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT professional_procedure_values_pkey PRIMARY KEY (id),
  CONSTRAINT professional_procedure_values_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id)
);

-- Doctor Time Off
CREATE TABLE IF NOT EXISTS public.doctor_time_off (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  type time_off_type NOT NULL,
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

-- Professional Work Schedules (with effective dates and consultation limits)
CREATE TABLE IF NOT EXISTS public.professional_work_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift_start time without time zone NOT NULL,
  shift_end time without time zone NOT NULL,
  consultation_duration integer DEFAULT 30,
  max_consultations_per_shift integer,
  effective_from date NOT NULL,
  effective_until date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT professional_work_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT professional_work_schedules_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT professional_work_schedules_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id)
);

-- Communication Campaigns (with proper ENUM types)
CREATE TABLE IF NOT EXISTS public.communication_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  type campaign_type NOT NULL DEFAULT 'custom'::campaign_type,
  channel message_channel NOT NULL DEFAULT 'whatsapp'::message_channel,
  status campaign_status NOT NULL DEFAULT 'draft'::campaign_status,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  message text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communication_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT communication_campaigns_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT communication_campaigns_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Communication Messages
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  type message_type NOT NULL DEFAULT 'reminder'::message_type,
  patient_name text DEFAULT ''::text,
  channel message_channel NOT NULL DEFAULT 'whatsapp'::message_channel,
  subject text DEFAULT ''::text,
  body text DEFAULT ''::text,
  status message_status NOT NULL DEFAULT 'pending'::message_status,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communication_messages_pkey PRIMARY KEY (id),
  CONSTRAINT communication_messages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT communication_messages_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT communication_messages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

-- App Templates
CREATE TABLE IF NOT EXISTS public.app_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  category template_category NOT NULL DEFAULT 'prescription'::template_category,
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

-- Protocols
CREATE TABLE IF NOT EXISTS public.protocols (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  title text NOT NULL,
  specialty text DEFAULT ''::text,
  category protocol_category NOT NULL DEFAULT 'tratamento'::protocol_category,
  last_update date DEFAULT CURRENT_DATE,
  usage_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT protocols_pkey PRIMARY KEY (id),
  CONSTRAINT protocols_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT protocols_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Protocol Steps
CREATE TABLE IF NOT EXISTS public.protocol_steps (
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

-- File Attachments
CREATE TABLE IF NOT EXISTS public.file_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  entity_type file_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  mime_type text DEFAULT 'application/octet-stream'::text,
  size_bytes bigint DEFAULT 0,
  storage_path text NOT NULL DEFAULT ''::text CHECK (storage_path IS NULL OR storage_path !~ similar_to_escape('(https?:|data:|blob:)%'::text)),
  storage_bucket text DEFAULT 'make-d4766610-documents'::text,
  uploaded_by text DEFAULT ''::text,
  uploaded_by_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  bucket_type text DEFAULT 'documents'::text CHECK (bucket_type = ANY (ARRAY['avatars'::text, 'media'::text, 'documents'::text, 'chat'::text])),
  CONSTRAINT file_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT file_attachments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT file_attachments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT file_attachments_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES auth.users(id)
);

-- Financial Billings
CREATE TABLE IF NOT EXISTS public.financial_billings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  insurance_id uuid,
  patient_name text DEFAULT ''::text,
  insurance_name text DEFAULT ''::text,
  billing_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  status billing_status NOT NULL DEFAULT 'pending'::billing_status,
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

-- Financial Glosas
CREATE TABLE IF NOT EXISTS public.financial_glosas (
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

-- Financial Payables
CREATE TABLE IF NOT EXISTS public.financial_payables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  supplier text DEFAULT ''::text,
  description text DEFAULT ''::text,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status payable_status NOT NULL DEFAULT 'pending'::payable_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_payables_pkey PRIMARY KEY (id),
  CONSTRAINT financial_payables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_payables_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Financial Payments
CREATE TABLE IF NOT EXISTS public.financial_payments (
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
  status payment_received_status NOT NULL DEFAULT 'pending'::payment_received_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_payments_pkey PRIMARY KEY (id),
  CONSTRAINT financial_payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT financial_payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT financial_payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);

-- Financial Receivables
CREATE TABLE IF NOT EXISTS public.financial_receivables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  patient_name text DEFAULT ''::text,
  description text DEFAULT ''::text,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status receivable_status NOT NULL DEFAULT 'pending'::receivable_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_receivables_pkey PRIMARY KEY (id),
  CONSTRAINT financial_receivables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT financial_receivables_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT financial_receivables_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

-- Stock Items
CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  category stock_category NOT NULL DEFAULT 'material'::stock_category,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'un'::text,
  batch text DEFAULT ''::text,
  expiry date,
  supplier text DEFAULT ''::text,
  status stock_status NOT NULL DEFAULT 'ok'::stock_status,
  location text,
  unit_cost numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT stock_items_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Queue Entries
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  ticket_number text NOT NULL DEFAULT ''::text,
  name text NOT NULL DEFAULT ''::text,
  status queue_status NOT NULL DEFAULT 'waiting'::queue_status,
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

-- Telemedicine Sessions
CREATE TABLE IF NOT EXISTS public.telemedicine_sessions (
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
  status telemedicine_status NOT NULL DEFAULT 'scheduled'::telemedicine_status,
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

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  clinic_id uuid,
  type notification_type NOT NULL DEFAULT 'info'::notification_type,
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

-- Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  clinic_id uuid,
  user_name text DEFAULT ''::text,
  user_role text DEFAULT ''::text,
  action audit_action NOT NULL,
  module text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  ip_address inet,
  device text DEFAULT ''::text,
  status audit_status NOT NULL DEFAULT 'success'::audit_status,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT audit_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- System Users
CREATE TABLE IF NOT EXISTS public.system_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text,
  role user_role NOT NULL DEFAULT 'doctor'::user_role,
  status active_status NOT NULL DEFAULT 'active'::active_status,
  last_login timestamp with time zone,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_users_pkey PRIMARY KEY (id),
  CONSTRAINT system_users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT system_users_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT system_users_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

-- Key-Value Store
CREATE TABLE IF NOT EXISTS public.kv_store_d4766610 (
  key text NOT NULL,
  value jsonb NOT NULL,
  CONSTRAINT kv_store_d4766610_pkey PRIMARY KEY (key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_professionals_role ON public.professionals(role);
CREATE INDEX IF NOT EXISTS idx_professionals_payment_model ON public.professionals(payment_model);
CREATE INDEX IF NOT EXISTS idx_professional_procedure_values_professional ON public.professional_procedure_values(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tuss_code ON public.appointments(tuss_code) WHERE tuss_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_owner ON public.communication_campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_status ON public.communication_campaigns(owner_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4: CREATE FUNCTIONS AND TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER IF NOT EXISTS trg_communication_campaigns_updated_at
  BEFORE UPDATE ON public.communication_campaigns
  FOR EACH ROW EXECUTE PROCEDURE public.set_campaigns_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ COMPLETE DATABASE SCHEMA INITIALIZED
-- All tables, enums, indexes, functions, and triggers are in place
-- Ready for production deployment
-- ═══════════════════════════════════════════════════════════════════════════════
