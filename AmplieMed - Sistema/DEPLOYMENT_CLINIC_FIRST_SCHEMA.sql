-- ═════════════════════════════════════════════════════════════════════════════
-- DEPLOYMENT CLINIC-FIRST MODEL - SCHEMA SQL COMPLETO
-- 
-- Este arquivo contém TODOS os tipos, tabelas e policies necessárias
-- para o modelo clinic-first funcionar corretamente.
-- 
-- ⚠️ INSTRUÇÕES:
-- 1. Copie TODO o conteúdo deste arquivo
-- 2. Acesse: Supabase Dashboard → SQL Editor
-- 3. Cole o conteúdo
-- 4. Clique em "RUN" (botão verde)
-- 5. Aguarde completar (ver ✅ "Successfully executed")
--
-- ⏱️  Tempo estimado: 2-3 minutos
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: CRIAR TIPOS CUSTOMIZADOS (ENUMS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Tipos para Clínica
CREATE TYPE clinic_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE tax_regime AS ENUM ('simples', 'lucro_presumido', 'lucro_real');

-- Tipos para Doctor/Professional
CREATE TYPE doctor_status AS ENUM ('active', 'inactive', 'on_leave', 'archived');
CREATE TYPE doctor_clinic_role AS ENUM ('owner', 'partner', 'employee', 'contractor');
CREATE TYPE doctor_payment_model AS ENUM ('fixed', 'percentage', 'hybrid');
CREATE TYPE certificate_type AS ENUM ('none', '1field', '2field');
CREATE TYPE gender_enum AS ENUM ('M', 'F', 'O', 'N');

-- Tipos para Pacientes
CREATE TYPE patient_status AS ENUM ('active', 'inactive', 'archived');

-- Tipos para Agendamentos
CREATE TYPE appointment_type AS ENUM ('presencial', 'telemedicine', 'hybrid');
CREATE TYPE appointment_status AS ENUM ('pendente', 'confirmado', 'em_atendimento', 'finalizado', 'cancelado', 'nao_compareceu');
CREATE TYPE appointment_payment_status AS ENUM ('pendente', 'pago', 'parcial', 'cancelado');
CREATE TYPE payment_type_enum AS ENUM ('particular', 'convenio', 'cortesia');
CREATE TYPE payment_method_enum AS ENUM ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'transferencia');

-- Tipos para Exames
CREATE TYPE exam_status AS ENUM ('solicitado', 'em_analise', 'pronto', 'cancelado');
CREATE TYPE exam_priority AS ENUM ('normal', 'urgente', 'emergencial');

-- Tipos para Registros Médicos
CREATE TYPE record_type AS ENUM ('Consulta', 'Procedimento', 'Exame', 'Internação');

-- Tipos para Telemedicina
CREATE TYPE telemedicine_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Tipos para Fila de Espera
CREATE TYPE queue_status AS ENUM ('waiting', 'called', 'in_service', 'completed', 'no_show', 'cancelled');

-- Tipos para Notificações
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'appointment', 'message');

-- Tipos para Financeiro
CREATE TYPE billing_status AS ENUM ('pending', 'sent', 'received', 'partially_paid', 'paid', 'cancelled');
CREATE TYPE payment_received_status AS ENUM ('pending', 'received', 'refunded', 'cancelled');
CREATE TYPE receivable_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE payable_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Tipos para Armazenamento
CREATE TYPE stock_category AS ENUM ('material', 'medicamento', 'equipamento', 'insumo');
CREATE TYPE stock_status AS ENUM ('ok', 'baixo', 'critico', 'vencido');

-- Tipos para Audit Log
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'clinic_registered', 'invite_generated', 'invite_accepted');
CREATE TYPE audit_status AS ENUM ('success', 'failure', 'pending');

-- Tipos para Comunicação
CREATE TYPE message_type AS ENUM ('reminder', 'confirmation', 'notification', 'marketing', 'other');
CREATE TYPE message_channel AS ENUM ('email', 'sms', 'whatsapp', 'push');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE campaign_type AS ENUM ('reminder', 'followup', 'marketing', 'custom');

-- Tipos para Templates
CREATE TYPE template_category AS ENUM ('prescription', 'report', 'exam_request', 'medical_certificate', 'other');

-- Tipos para Salas
CREATE TYPE room_type AS ENUM ('consultation', 'surgery', 'therapy', 'imaging', 'lab', 'administrative');

-- Tipos para Seguros
CREATE TYPE insurance_type AS ENUM ('health', 'dental', 'vision', 'other');
CREATE TYPE active_status AS ENUM ('active', 'inactive');

-- Tipos para Usuário
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'professional', 'receptionist', 'financial', 'viewer');
CREATE TYPE app_theme AS ENUM ('light', 'dark', 'auto');

-- Tipos para Protocolo
CREATE TYPE protocol_category AS ENUM ('tratamento', 'diagnostico', 'triagem', 'preventivo', 'outro');

-- Tipo para Arquivo
CREATE TYPE file_entity_type AS ENUM ('patient', 'appointment', 'medical_record', 'exam', 'prescription', 'protocol', 'other');

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: CRIAR TABELAS (EM ORDEM DE DEPENDÊNCIA)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles (extensão de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'doctor'::user_role,
  specialty text DEFAULT '',
  crm text DEFAULT '',
  crm_uf text DEFAULT '',
  phone text DEFAULT '',
  initials text DEFAULT '',
  status active_status NOT NULL DEFAULT 'active'::active_status,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_path text
);

-- 2. Clinics
CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  CONSTRAINT clinics_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para clinics
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON public.clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_cnpj ON public.clinics(cnpj);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics(status);

-- 3. Clinic Settings
CREATE TABLE IF NOT EXISTS public.clinic_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid,
  owner_id uuid,
  clinic_name text NOT NULL DEFAULT 'AmplieMed'::text,
  cnpj text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
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
  logo_path text,
  CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT clinic_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Clinic Business Hours
CREATE TABLE IF NOT EXISTS public.clinic_business_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  shift_start time without time zone,
  shift_end time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_business_hours_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

-- 5. Clinic Rooms
CREATE TABLE IF NOT EXISTS public.clinic_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  type room_type NOT NULL DEFAULT 'consultation'::room_type,
  capacity integer DEFAULT 1,
  equipment text[] DEFAULT '{}'::text[],
  available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_rooms_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

-- 6. Clinic Memberships
CREATE TABLE IF NOT EXISTS public.clinic_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'doctor'::text CHECK (role IN ('admin', 'doctor', 'receptionist', 'financial', 'viewer')),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  CONSTRAINT clinic_memberships_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT clinic_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT clinic_memberships_unique_user_clinic UNIQUE (clinic_id, user_id)
);

-- Índices para clinic_memberships
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_user_id ON public.clinic_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_clinic_id ON public.clinic_memberships(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_role ON public.clinic_memberships(role);

-- 7. Clinic Invite Tokens
CREATE TABLE IF NOT EXISTS public.clinic_invite_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  invited_email text NOT NULL,
  role text DEFAULT 'doctor'::text CHECK (role IN ('admin', 'doctor', 'receptionist', 'financial', 'viewer')),
  metadata jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at timestamp with time zone,
  used_by uuid,
  CONSTRAINT clinic_invite_tokens_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT clinic_invite_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT clinic_invite_tokens_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para clinic_invite_tokens
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_token ON public.clinic_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_clinic_id ON public.clinic_invite_tokens(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_invited_email ON public.clinic_invite_tokens(invited_email);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_expires_at ON public.clinic_invite_tokens(expires_at);

-- 8. System Users
CREATE TABLE IF NOT EXISTS public.system_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id uuid,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'doctor'::user_role,
  status active_status NOT NULL DEFAULT 'active'::active_status,
  last_login timestamp with time zone,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT system_users_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT system_users_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 9. Professionals
CREATE TABLE IF NOT EXISTS public.professionals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  user_id uuid,
  clinic_id uuid,
  name text NOT NULL,
  crm text DEFAULT '',
  crm_uf text DEFAULT '',
  specialty text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  cpf text DEFAULT '',
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
  CONSTRAINT professionals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT professionals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT professionals_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 10. Doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid,
  user_id uuid,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  cpf text DEFAULT '',
  birth_date date,
  gender gender_enum,
  crm text NOT NULL,
  crm_uf text DEFAULT '',
  registro_ans text DEFAULT '',
  specialties text[] DEFAULT '{}'::text[],
  subspecialties text[] DEFAULT '{}'::text[],
  rqe text,
  email text DEFAULT '',
  phone text DEFAULT '',
  cellphone text DEFAULT '',
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
  photo_path text,
  CONSTRAINT doctors_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE SET NULL,
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT doctors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 11. Doctor Clinic Assignments
CREATE TABLE IF NOT EXISTS public.doctor_clinic_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  role doctor_clinic_role NOT NULL DEFAULT 'employee'::doctor_clinic_role,
  start_date date NOT NULL,
  end_date date,
  consultation_duration integer DEFAULT 30,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_clinic_assignments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE,
  CONSTRAINT doctor_clinic_assignments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

-- 12. Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  cpf text NOT NULL,
  rg text DEFAULT '',
  birth_date date,
  age integer,
  gender gender_enum,
  phone text DEFAULT '',
  phone2 text,
  email text DEFAULT '',
  mother_name text DEFAULT '',
  marital_status text DEFAULT '',
  occupation text DEFAULT '',
  address_cep text DEFAULT '',
  address_street text DEFAULT '',
  address_number text DEFAULT '',
  address_complement text,
  address_neighborhood text DEFAULT '',
  address_city text DEFAULT '',
  address_state text DEFAULT '',
  insurance text DEFAULT '',
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
  CONSTRAINT patients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- Índices para patients
CREATE INDEX IF NOT EXISTS idx_patients_owner_id ON public.patients(owner_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- 13. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  doctor_id uuid,
  professional_id uuid,
  patient_name text NOT NULL DEFAULT '',
  patient_cpf text DEFAULT '',
  patient_phone text DEFAULT '',
  patient_email text DEFAULT '',
  doctor_name text NOT NULL DEFAULT '',
  specialty text DEFAULT '',
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
  payment_method payment_method_enum,
  installments integer DEFAULT 1,
  paid_amount numeric DEFAULT 0,
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tuss_code text,
  CONSTRAINT appointments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL,
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL,
  CONSTRAINT appointments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE SET NULL
);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 14. Medical Records
CREATE TABLE IF NOT EXISTS public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  appointment_id uuid,
  patient_name text NOT NULL DEFAULT '',
  doctor_name text NOT NULL DEFAULT '',
  record_date timestamp with time zone NOT NULL DEFAULT now(),
  type record_type NOT NULL DEFAULT 'Consulta'::record_type,
  cid10 text DEFAULT '',
  chief_complaint text DEFAULT '',
  conduct_plan text DEFAULT '',
  anamnesis text,
  physical_exam text,
  prescriptions text,
  signed boolean NOT NULL DEFAULT false,
  signed_at timestamp with time zone,
  signed_by uuid,
  signature_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medical_records_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT medical_records_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL,
  CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
  CONSTRAINT medical_records_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 15. Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  patient_name text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT '',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  result_date date,
  status exam_status NOT NULL DEFAULT 'solicitado'::exam_status,
  laboratory text DEFAULT '',
  requested_by text DEFAULT '',
  requested_by_id uuid,
  priority exam_priority NOT NULL DEFAULT 'normal'::exam_priority,
  tuss_code text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT exams_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT exams_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL,
  CONSTRAINT exams_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 16. Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  owner_id uuid NOT NULL,
  medication_name text NOT NULL,
  dosage text DEFAULT '',
  frequency text DEFAULT '',
  duration text DEFAULT '',
  route text DEFAULT '',
  instructions text DEFAULT '',
  quantity integer DEFAULT 1,
  is_controlled boolean DEFAULT false,
  signed boolean DEFAULT false,
  signed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id) ON DELETE CASCADE,
  CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL,
  CONSTRAINT prescriptions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 17. Queue Entries
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  ticket_number text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  status queue_status NOT NULL DEFAULT 'waiting'::queue_status,
  arrival_time timestamp with time zone NOT NULL DEFAULT now(),
  waiting_time integer DEFAULT 0,
  doctor text DEFAULT '',
  doctor_id uuid,
  specialty text DEFAULT '',
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
  CONSTRAINT queue_entries_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT queue_entries_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT queue_entries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL,
  CONSTRAINT queue_entries_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL
);

-- 18. Telemedicine Sessions
CREATE TABLE IF NOT EXISTS public.telemedicine_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  doctor_id uuid,
  appointment_id uuid,
  patient_name text NOT NULL DEFAULT '',
  doctor_name text NOT NULL DEFAULT '',
  specialty text DEFAULT '',
  session_date date NOT NULL,
  session_time time without time zone NOT NULL,
  duration integer DEFAULT 30,
  link text DEFAULT '',
  status telemedicine_status NOT NULL DEFAULT 'scheduled'::telemedicine_status,
  recording_consent boolean NOT NULL DEFAULT false,
  notes text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telemedicine_sessions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT telemedicine_sessions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT telemedicine_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL,
  CONSTRAINT telemedicine_sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL,
  CONSTRAINT telemedicine_sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL
);

-- 19. Insurances
CREATE TABLE IF NOT EXISTS public.insurances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  cnpj text DEFAULT '',
  register text DEFAULT '',
  type insurance_type NOT NULL DEFAULT 'health'::insurance_type,
  status active_status NOT NULL DEFAULT 'active'::active_status,
  phone text DEFAULT '',
  email text DEFAULT '',
  contract_date date,
  expiration_date date,
  grace_period integer DEFAULT 0,
  coverage_percentage numeric DEFAULT 100.00,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurances_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT insurances_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 20. Patient Insurance Plans
CREATE TABLE IF NOT EXISTS public.patient_insurance_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  insurance_id uuid NOT NULL,
  card_number text,
  validity date,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patient_insurance_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT patient_insurance_plans_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.insurances(id) ON DELETE CASCADE
);

-- 21. Stock Items
CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  category stock_category NOT NULL DEFAULT 'material'::stock_category,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'un'::text,
  batch text DEFAULT '',
  expiry date,
  supplier text DEFAULT '',
  status stock_status NOT NULL DEFAULT 'ok'::stock_status,
  location text,
  unit_cost numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT stock_items_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 22. Financial Billings
CREATE TABLE IF NOT EXISTS public.financial_billings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  insurance_id uuid,
  patient_name text DEFAULT '',
  insurance_name text DEFAULT '',
  billing_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  status billing_status NOT NULL DEFAULT 'pending'::billing_status,
  items_count integer DEFAULT 0,
  guide_number text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_billings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT financial_billings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT financial_billings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL,
  CONSTRAINT financial_billings_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.insurances(id) ON DELETE SET NULL
);

-- 23. Financial Payments
CREATE TABLE IF NOT EXISTS public.financial_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  appointment_id uuid,
  patient_name text DEFAULT '',
  payment_type text DEFAULT '',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  method text DEFAULT '',
  status payment_received_status NOT NULL DEFAULT 'pending'::payment_received_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT financial_payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT financial_payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL,
  CONSTRAINT financial_payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL
);

-- 24. Financial Receivables
CREATE TABLE IF NOT EXISTS public.financial_receivables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  patient_name text DEFAULT '',
  description text DEFAULT '',
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status receivable_status NOT NULL DEFAULT 'pending'::receivable_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_receivables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT financial_receivables_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT financial_receivables_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL
);

-- 25. Financial Payables
CREATE TABLE IF NOT EXISTS public.financial_payables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  supplier text DEFAULT '',
  description text DEFAULT '',
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status payable_status NOT NULL DEFAULT 'pending'::payable_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT financial_payables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT financial_payables_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 26. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  type notification_type NOT NULL DEFAULT 'info'::notification_type,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  urgent boolean NOT NULL DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 27. Communication Messages
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  patient_id uuid,
  type message_type NOT NULL DEFAULT 'reminder'::message_type,
  patient_name text DEFAULT '',
  channel message_channel NOT NULL DEFAULT 'whatsapp'::message_channel,
  subject text DEFAULT '',
  body text DEFAULT '',
  status message_status NOT NULL DEFAULT 'pending'::message_status,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communication_messages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT communication_messages_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT communication_messages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL
);

-- 28. Communication Campaigns
CREATE TABLE IF NOT EXISTS public.communication_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  type campaign_type NOT NULL DEFAULT 'custom'::campaign_type,
  channel message_channel NOT NULL DEFAULT 'whatsapp'::message_channel,
  status campaign_status NOT NULL DEFAULT 'draft'::campaign_status,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  message text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communication_campaigns_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT communication_campaigns_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 29. Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid,
  clinic_id uuid,
  user_name text DEFAULT '',
  user_role text DEFAULT '',
  action audit_action NOT NULL,
  module text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  ip_address inet,
  device text DEFAULT '',
  status audit_status NOT NULL DEFAULT 'success'::audit_status,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT audit_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- Índices para audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_owner_id ON public.audit_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_clinic_id ON public.audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- 30. Protocols
CREATE TABLE IF NOT EXISTS public.protocols (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  title text NOT NULL,
  specialty text DEFAULT '',
  category protocol_category NOT NULL DEFAULT 'tratamento'::protocol_category,
  last_update date DEFAULT CURRENT_DATE,
  usage_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT protocols_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT protocols_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 31. Protocol Steps
CREATE TABLE IF NOT EXISTS public.protocol_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id uuid NOT NULL,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT protocol_steps_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.protocols(id) ON DELETE CASCADE
);

-- 32. App Templates
CREATE TABLE IF NOT EXISTS public.app_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  name text NOT NULL,
  category template_category NOT NULL DEFAULT 'prescription'::template_category,
  specialty text DEFAULT '',
  is_favorite boolean NOT NULL DEFAULT false,
  usage_count integer DEFAULT 0,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_templates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT app_templates_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL
);

-- 33. File Attachments
CREATE TABLE IF NOT EXISTS public.file_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  clinic_id uuid,
  entity_type file_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  mime_type text DEFAULT 'application/octet-stream'::text,
  size_bytes bigint DEFAULT 0,
  storage_path text NOT NULL DEFAULT '',
  storage_bucket text DEFAULT 'make-d4766610-documents'::text,
  uploaded_by text DEFAULT '',
  uploaded_by_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  bucket_type text DEFAULT 'documents'::text CHECK (bucket_type IN ('avatars', 'media', 'documents', 'chat')),
  CONSTRAINT file_attachments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT file_attachments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL,
  CONSTRAINT file_attachments_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: HABILITAR RLS (ROW LEVEL SECURITY)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clinic_invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: CRIAR RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- CLINIC_INVITE_TOKENS Policies
CREATE POLICY "Allow anyone to create invites"
  ON public.clinic_invite_tokens
  FOR INSERT
  USING (true);

CREATE POLICY "Clinic admins can view invites"
  ON public.clinic_invite_tokens
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = clinic_invite_tokens.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.active = true
    )
  );

-- CLINIC_MEMBERSHIPS Policies
CREATE POLICY "Users can view own memberships"
  ON public.clinic_memberships
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Clinic admins can view memberships"
  ON public.clinic_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm_admin
      WHERE cm_admin.clinic_id = clinic_memberships.clinic_id
        AND cm_admin.user_id = auth.uid()
        AND cm_admin.role = 'admin'
        AND cm_admin.active = true
    )
  );

CREATE POLICY "Clinic admins can manage memberships"
  ON public.clinic_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm_admin
      WHERE cm_admin.clinic_id = clinic_memberships.clinic_id
        AND cm_admin.user_id = auth.uid()
        AND cm_admin.role = 'admin'
        AND cm_admin.active = true
    )
  );

-- CLINICS Policies
CREATE POLICY "Users can view clinics they belong to"
  ON public.clinics
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = clinics.id
        AND cm.user_id = auth.uid()
        AND cm.active = true
    )
  );

-- PATIENTS Policies
CREATE POLICY "Users can view clinic patients"
  ON public.patients
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = patients.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: CRIAR FUNÇÕES HELPER
-- ─────────────────────────────────────────────────────────────────────────────

-- Get all clinics for current user
CREATE OR REPLACE FUNCTION public.user_clinics()
RETURNS TABLE(id uuid, name text, cnpj text, email text, phone text) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.cnpj, c.email, c.phone
  FROM public.clinics c
  INNER JOIN public.clinic_memberships cm ON cm.clinic_id = c.id
  WHERE cm.user_id = auth.uid() AND cm.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is clinic admin
CREATE OR REPLACE FUNCTION public.is_clinic_admin(clinic_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clinic_memberships
    WHERE clinic_id = $1
      AND user_id = auth.uid()
      AND role = 'admin'
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role in clinic
CREATE OR REPLACE FUNCTION public.user_clinic_role(clinic_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.clinic_memberships
    WHERE clinic_id = $1
      AND user_id = auth.uid()
      AND active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═════════════════════════════════════════════════════════════════════════════
-- ✅ DEPLOYMENT CONCLUÍDO!
-- 
-- Se chegou até aqui sem erros, o schema foi criado com sucesso.
-- 
-- Próximo passo: Deploy das Edge Functions
-- (Ver arquivo: IMPLEMENTACAO_CLINIC_FIRST_COMPLETA.md)
-- ═════════════════════════════════════════════════════════════════════════════
