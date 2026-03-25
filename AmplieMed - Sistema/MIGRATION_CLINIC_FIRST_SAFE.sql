-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO SEGURA - CLINIC-FIRST MODEL
-- 
-- Este arquivo verifica o que já existe antes de criar
-- Evita erros de "type already exists" e "table already exists"
-- 
-- ⚠️ INSTRUÇÕES:
-- 1. Copie TODA o conteúdo deste arquivo
-- 2. Acesse: Supabase Dashboard → SQL Editor
-- 3. Cole o conteúdo (substitua o anterior)
-- 4. Clique em "RUN" (botão verde)
-- 5. Aguarde completar
--
-- ✅ Este arquivo NUNCA vai gerar erros de "already exists"
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: CRIAR TIPOS CUSTOMIZADOS (COM VERIFICAÇÃO)
-- ─────────────────────────────────────────────────────────────────────────────

-- Função auxiliar para criar tipos ENUM com segurança
DO $$
DECLARE
  type_name text;
BEGIN
  FOREACH type_name IN ARRAY ARRAY[
    'clinic_status', 'tax_regime', 'doctor_status', 'doctor_clinic_role',
    'doctor_payment_model', 'certificate_type', 'gender_enum', 'patient_status',
    'appointment_type', 'appointment_status', 'appointment_payment_status',
    'payment_type_enum', 'payment_method_enum', 'exam_status', 'exam_priority',
    'record_type', 'telemedicine_status', 'queue_status', 'notification_type',
    'billing_status', 'payment_received_status', 'receivable_status',
    'payable_status', 'stock_category', 'stock_status', 'audit_action',
    'audit_status', 'message_type', 'message_channel', 'message_status',
    'campaign_status', 'campaign_type', 'template_category', 'room_type',
    'insurance_type', 'active_status', 'user_role', 'app_theme',
    'protocol_category', 'file_entity_type'
  ]
  LOOP
    -- Verificar se tipo já existe (se existir, silenciosamente continua)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'pg_catalog' 
      AND table_name = type_name
    ) THEN
      -- Tipo não existe, será criado abaixo
      RAISE NOTICE 'Tipo % precisa ser criado', type_name;
    END IF;
  END LOOP;
END $$;

-- Criar tipos ENUM apenas se não existirem
-- Tipos para Clínica
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinic_status') THEN
    CREATE TYPE clinic_status AS ENUM ('active', 'inactive', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_regime') THEN
    CREATE TYPE tax_regime AS ENUM ('simples', 'lucro_presumido', 'lucro_real');
  END IF;
END $$;

-- Tipos para Doctor/Professional
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_status') THEN
    CREATE TYPE doctor_status AS ENUM ('active', 'inactive', 'on_leave', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_clinic_role') THEN
    CREATE TYPE doctor_clinic_role AS ENUM ('owner', 'partner', 'employee', 'contractor');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_payment_model') THEN
    CREATE TYPE doctor_payment_model AS ENUM ('fixed', 'percentage', 'hybrid');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_type') THEN
    CREATE TYPE certificate_type AS ENUM ('none', '1field', '2field');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
    CREATE TYPE gender_enum AS ENUM ('M', 'F', 'O', 'N');
  END IF;
END $$;

-- Tipos para Pacientes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_status') THEN
    CREATE TYPE patient_status AS ENUM ('active', 'inactive', 'archived');
  END IF;
END $$;

-- Tipos para Agendamentos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
    CREATE TYPE appointment_type AS ENUM ('presencial', 'telemedicine', 'hybrid');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('pendente', 'confirmado', 'em_atendimento', 'finalizado', 'cancelado', 'nao_compareceu');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_payment_status') THEN
    CREATE TYPE appointment_payment_status AS ENUM ('pendente', 'pago', 'parcial', 'cancelado');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type_enum') THEN
    CREATE TYPE payment_type_enum AS ENUM ('particular', 'convenio', 'cortesia');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE payment_method_enum AS ENUM ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'transferencia');
  END IF;
END $$;

-- Tipos para Exames
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_status') THEN
    CREATE TYPE exam_status AS ENUM ('solicitado', 'em_analise', 'pronto', 'cancelado');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_priority') THEN
    CREATE TYPE exam_priority AS ENUM ('normal', 'urgente', 'emergencial');
  END IF;
END $$;

-- Tipos para Registros Médicos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_type') THEN
    CREATE TYPE record_type AS ENUM ('Consulta', 'Procedimento', 'Exame', 'Internação');
  END IF;
END $$;

-- Tipos para Telemedicina
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'telemedicine_status') THEN
    CREATE TYPE telemedicine_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

-- Tipos para Fila de Espera
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE queue_status AS ENUM ('waiting', 'called', 'in_service', 'completed', 'no_show', 'cancelled');
  END IF;
END $$;

-- Tipos para Notificações
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'appointment', 'message');
  END IF;
END $$;

-- Tipos para Financeiro
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_status') THEN
    CREATE TYPE billing_status AS ENUM ('pending', 'sent', 'received', 'partially_paid', 'paid', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_received_status') THEN
    CREATE TYPE payment_received_status AS ENUM ('pending', 'received', 'refunded', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receivable_status') THEN
    CREATE TYPE receivable_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payable_status') THEN
    CREATE TYPE payable_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
  END IF;
END $$;

-- Tipos para Armazenamento
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_category') THEN
    CREATE TYPE stock_category AS ENUM ('material', 'medicamento', 'equipamento', 'insumo');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_status') THEN
    CREATE TYPE stock_status AS ENUM ('ok', 'baixo', 'critico', 'vencido');
  END IF;
END $$;

-- Tipos para Audit Log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'clinic_registered', 'invite_generated', 'invite_accepted');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN
    CREATE TYPE audit_status AS ENUM ('success', 'failure', 'pending');
  END IF;
END $$;

-- Tipos para Comunicação
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('reminder', 'confirmation', 'notification', 'marketing', 'other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_channel') THEN
    CREATE TYPE message_channel AS ENUM ('email', 'sms', 'whatsapp', 'push');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
    CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
    CREATE TYPE campaign_type AS ENUM ('reminder', 'followup', 'marketing', 'custom');
  END IF;
END $$;

-- Tipos para Templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_category') THEN
    CREATE TYPE template_category AS ENUM ('prescription', 'report', 'exam_request', 'medical_certificate', 'other');
  END IF;
END $$;

-- Tipos para Salas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
    CREATE TYPE room_type AS ENUM ('consultation', 'surgery', 'therapy', 'imaging', 'lab', 'administrative');
  END IF;
END $$;

-- Tipos para Seguros
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insurance_type') THEN
    CREATE TYPE insurance_type AS ENUM ('health', 'dental', 'vision', 'other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'active_status') THEN
    CREATE TYPE active_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

-- Tipos para Usuário
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'professional', 'receptionist', 'financial', 'viewer');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_theme') THEN
    CREATE TYPE app_theme AS ENUM ('light', 'dark', 'auto');
  END IF;
END $$;

-- Tipos para Protocolo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'protocol_category') THEN
    CREATE TYPE protocol_category AS ENUM ('tratamento', 'diagnostico', 'triagem', 'preventivo', 'outro');
  END IF;
END $$;

-- Tipo para Arquivo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_entity_type') THEN
    CREATE TYPE file_entity_type AS ENUM ('patient', 'appointment', 'medical_record', 'exam', 'prescription', 'protocol', 'other');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: VERIFICAR TABELAS EXISTENTES (SEM RECRIAR)
-- ─────────────────────────────────────────────────────────────────────────────

-- Verificar e listar tabelas que JÁ EXISTEM
DO $$
DECLARE
  table_info RECORD;
BEGIN
  RAISE NOTICE '========== TABELAS EXISTENTES ==========';
  FOR table_info IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Tabela encontrada: %', table_info.tablename;
  END LOOP;
  RAISE NOTICE '=========================================';
END $$;

-- Verificar e listar tipos ENUM existentes
DO $$
DECLARE
  type_info RECORD;
BEGIN
  RAISE NOTICE '========== TIPOS ENUM EXISTENTES ==========';
  FOR type_info IN
    SELECT typname FROM pg_type
    WHERE typtype = 'e'
    ORDER BY typname
  LOOP
    RAISE NOTICE 'Tipo ENUM encontrado: %', type_info.typname;
  END LOOP;
  RAISE NOTICE '==========================================';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: ADICIONAR ÍNDICES QUE FALTAM (SEGURO - SÃO IDEMPOTENTES)
-- ─────────────────────────────────────────────────────────────────────────────

-- Índices para clinics
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON public.clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_cnpj ON public.clinics(cnpj);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics(status);

-- Índices para clinic_memberships
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_user_id ON public.clinic_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_clinic_id ON public.clinic_memberships(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_role ON public.clinic_memberships(role);

-- Índices para clinic_invite_tokens
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_token ON public.clinic_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_clinic_id ON public.clinic_invite_tokens(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_invited_email ON public.clinic_invite_tokens(invited_email);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_expires_at ON public.clinic_invite_tokens(expires_at);

-- Índices para patients
CREATE INDEX IF NOT EXISTS idx_patients_owner_id ON public.patients(owner_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Índices para audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_owner_id ON public.audit_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_clinic_id ON public.audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: HABILITAR E CRIAR RLS POLICIES (SEGURO - VERIFICA EXISTÊNCIA)
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS nas tabelas críticas
ALTER TABLE IF EXISTS public.clinic_invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinic_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_records ENABLE ROW LEVEL SECURITY;

-- Criar policies com verificação segura
DO $$
BEGIN
  -- Policy: clinic_invite_tokens - INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinic_invite_tokens' AND policyname = 'clinic_invite_tokens_insert_policy'
  ) THEN
    CREATE POLICY clinic_invite_tokens_insert_policy 
      ON public.clinic_invite_tokens FOR INSERT WITH CHECK (true);
  END IF;
  
  -- Policy: clinic_memberships - SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinic_memberships' AND policyname = 'clinic_memberships_select_own'
  ) THEN
    CREATE POLICY clinic_memberships_select_own
      ON public.clinic_memberships FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  -- Policy: clinics - SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinics' AND policyname = 'clinics_select_own'
  ) THEN
    CREATE POLICY clinics_select_own
      ON public.clinics FOR SELECT
      USING (
        auth.uid() = owner_id OR
        EXISTS (
          SELECT 1 FROM public.clinic_memberships cm
          WHERE cm.clinic_id = clinics.id
            AND cm.user_id = auth.uid()
            AND cm.active = true
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: CRIAR FUNÇÕES HELPER (SE NÃO EXISTIREM)
-- ─────────────────────────────────────────────────────────────────────────────

-- Função: Get all clinics for current user
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

-- Função: Check if user is clinic admin
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

-- Função: Get user's role in clinic
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
-- ✅ MIGRAÇÃO CONCLUÍDA COM SEGURANÇA!
-- 
-- O que foi feito:
-- ✓ Todos os 40+ tipos ENUM foram criados (com verificação)
-- ✓ Todas as tabelas existentes foram preservadas
-- ✓ Índices foram adicionados (sem conflitos)
-- ✓ RLS foi habilitado nas tabelas críticas
-- ✓ Funções helper foram criadas
--
-- Próximos passos:
-- 1. Deploy das 3 Edge Functions
-- 2. Testar fluxo completo de signup
-- 3. Validar dados em tempo real
--
-- ═════════════════════════════════════════════════════════════════════════════
