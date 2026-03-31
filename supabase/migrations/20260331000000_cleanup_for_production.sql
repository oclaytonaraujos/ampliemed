-- =============================================================================
-- MIGRAÇÃO: Limpeza de dados para produção
-- Data: 2026-03-31
-- Descrição: Remove todos os dados de teste preservando estrutura, políticas,
--            funções, triggers, tipos e demais objetos do banco.
--
-- ATENÇÃO: Esta operação é IRREVERSÍVEL. Faça um backup antes de executar.
-- =============================================================================

-- Inicia transação para garantir atomicidade
BEGIN;

-- Desabilita temporariamente triggers de auditoria para evitar registros desnecessários
SET session_replication_role = replica;

-- =============================================================================
-- 1. TABELAS DEPENDENTES (mais profundas na hierarquia)
-- =============================================================================

TRUNCATE TABLE public.reacoes_mensagens        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.messages                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.grupo_chats_membros      RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.grupo_chats              RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.chats                    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.broadcast_messages       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.team_messages            RESTART IDENTITY CASCADE;

-- =============================================================================
-- 2. DADOS CLÍNICOS (prontuários, prescrições, exames)
-- =============================================================================

TRUNCATE TABLE public.drug_interaction_alerts  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.prescriptions            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.medical_records          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.protocol_steps           RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.protocols                RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.exams                    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.telemedicine_sessions    RESTART IDENTITY CASCADE;

-- =============================================================================
-- 3. FINANCEIRO
-- =============================================================================

TRUNCATE TABLE public.financial_payments       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_glosas         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_billings       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_payables       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_receivables    RESTART IDENTITY CASCADE;

-- =============================================================================
-- 4. FILA, AGENDAMENTOS E COMUNICAÇÃO
-- =============================================================================

TRUNCATE TABLE public.queue_entries            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.appointments             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.communication_messages   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.communication_campaigns  RESTART IDENTITY CASCADE;

-- =============================================================================
-- 5. PACIENTES E CONVÊNIOS
-- =============================================================================

TRUNCATE TABLE public.patient_insurance_plans  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.patients                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.insurances               RESTART IDENTITY CASCADE;

-- =============================================================================
-- 6. PROFISSIONAIS E ESCALAS
-- =============================================================================

TRUNCATE TABLE public.professional_procedure_values  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professional_work_schedules    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professional_clinic_assignments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professionals            RESTART IDENTITY CASCADE;

-- =============================================================================
-- 7. CONFIGURAÇÕES E ESTRUTURA DE CLÍNICA
-- =============================================================================

TRUNCATE TABLE public.clinic_business_hours    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_rooms             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_settings          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_invite_tokens     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_memberships       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.role_permissions         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.user_permissions         RESTART IDENTITY CASCADE;

-- =============================================================================
-- 8. DEMAIS TABELAS
-- =============================================================================

TRUNCATE TABLE public.app_templates            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.stock_items              RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.file_attachments         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.notifications            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.audit_log                RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.evolution_webhook_logs   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.system_users             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.kv_store_d4766610        RESTART IDENTITY CASCADE;

-- =============================================================================
-- 9. CLÍNICAS (deve vir depois de todos os dependentes)
-- =============================================================================

TRUNCATE TABLE public.clinics                  RESTART IDENTITY CASCADE;

-- =============================================================================
-- 10. PROFILES (espelho de auth.users na tabela pública)
-- =============================================================================

TRUNCATE TABLE public.profiles                 RESTART IDENTITY CASCADE;

-- Reabilita triggers
SET session_replication_role = DEFAULT;

-- =============================================================================
-- 11. USUÁRIOS AUTH (Supabase)
--
-- IMPORTANTE: Esta seção requer permissão de superusuário ou service_role.
-- No painel do Supabase: Authentication > Users > selecione todos > Delete.
-- Alternativamente, execute com a role correta:
-- =============================================================================

DELETE FROM auth.users;

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================

DO $$
DECLARE
  tbl RECORD;
  cnt BIGINT;
BEGIN
  RAISE NOTICE '=== Verificação pós-limpeza ===';
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', tbl.tablename) INTO cnt;
    IF cnt > 0 THEN
      RAISE WARNING 'Tabela % ainda contém % registro(s)!', tbl.tablename, cnt;
    ELSE
      RAISE NOTICE 'OK: % está vazia.', tbl.tablename;
    END IF;
  END LOOP;
  RAISE NOTICE '=== Banco de dados pronto para produção ===';
END;
$$;

COMMIT;
