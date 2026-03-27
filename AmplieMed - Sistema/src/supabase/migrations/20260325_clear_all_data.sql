-- ═══════════════════════════════════════════════════════════════════════════════
-- AMPLIEMED — LIMPAR TODOS OS DADOS DO BANCO
-- ⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL. Todos os dados serão apagados.
--     As tabelas e estrutura do banco serão preservadas.
--     Os usuários do auth.users NÃO são apagados (apenas os dados clínicos).
-- ═══════════════════════════════════════════════════════════════════════════════
-- Como usar:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Cole este script e clique em Run
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Desabilitar verificação de FK temporariamente para simplificar a ordem
-- ─────────────────────────────────────────────────────────────────────────────
SET session_replication_role = replica;

-- ─────────────────────────────────────────────────────────────────────────────
-- NÍVEL 4: Tabelas folha (sem dependentes)
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.drug_interaction_alerts        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.patient_insurance_plans        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.prescriptions                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.protocol_steps                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professional_procedure_values  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professional_work_schedules    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professional_clinic_assignments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_business_hours          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_rooms                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_invite_tokens           RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_memberships             RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NÍVEL 3: Tabelas financeiras e clínicas dependentes
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.financial_glosas               RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_billings             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_payments             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_receivables          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.financial_payables             RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.telemedicine_sessions          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.queue_entries                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.communication_messages         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.communication_campaigns        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.file_attachments               RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NÍVEL 2: Prontuários, consultas e exames
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.medical_records                RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.exams                          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.appointments                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.stock_items                    RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NÍVEL 1: Entidades principais
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.patients                       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.insurances                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.professionals                  RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NÍVEL 0: Configurações e clínica
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.notifications                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.audit_log                      RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.system_users                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.app_templates                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.protocols                      RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinic_settings                RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clinics                        RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- KV Store local (cache do app)
-- ─────────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.kv_store_d4766610;

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles (espelho dos auth.users — limpa dados do perfil, mas NÃO apaga login)
-- Remova o comentário abaixo SOMENTE se quiser resetar os perfis também:
-- ─────────────────────────────────────────────────────────────────────────────
-- TRUNCATE TABLE public.profiles RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reabilitar verificação de FK
-- ─────────────────────────────────────────────────────────────────────────────
SET session_replication_role = DEFAULT;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ Limpeza concluída. Estrutura preservada, dados apagados.
-- ═══════════════════════════════════════════════════════════════════════════════
