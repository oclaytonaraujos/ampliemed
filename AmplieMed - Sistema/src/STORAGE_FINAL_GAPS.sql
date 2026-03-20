-- ═══════════════════════════════════════════════════════════════════════════════
-- AmplieMed — Storage Final Gaps (v4)
-- Cole e execute no Supabase SQL Editor
-- Objetivo: fechar os 2 itens ainda pendentes após schema-4.txt
-- Data: 2026-03-16
-- ═══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 1 — Verificar se o trigger já existe                                │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Execute primeiro para saber se precisa criar o trigger:
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_storage_bucket'
  AND trigger_schema = 'public';

-- RESULTADO ESPERADO: 1 linha com trg_sync_storage_bucket
-- Se retornar 0 linhas → executar Seção 2
-- Se retornar 1 linha  → trigger OK, pular Seção 2

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 2 — Criar trigger (SE a Seção 1 retornou 0 linhas)                 │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.fn_sync_storage_bucket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.storage_bucket := CASE NEW.bucket_type
    WHEN 'avatars'   THEN 'make-d4766610-avatars'
    WHEN 'media'     THEN 'make-d4766610-media'
    WHEN 'chat'      THEN 'make-d4766610-chat'
    ELSE                   'make-d4766610-documents'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_storage_bucket ON public.file_attachments;

CREATE TRIGGER trg_sync_storage_bucket
  BEFORE INSERT OR UPDATE OF bucket_type ON public.file_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_storage_bucket();

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 3 — Adicionar chk_file_attachments_bucket_coherence (ausente)       │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Primeiro: corrigir dados existentes para não violar a nova constraint
UPDATE public.file_attachments
SET storage_bucket = CASE bucket_type
  WHEN 'avatars'   THEN 'make-d4766610-avatars'
  WHEN 'media'     THEN 'make-d4766610-media'
  WHEN 'chat'      THEN 'make-d4766610-chat'
  ELSE                   'make-d4766610-documents'
END;

-- Agora adicionar a constraint (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'chk_file_attachments_bucket_coherence'
      AND conrelid = 'public.file_attachments'::regclass
  ) THEN
    ALTER TABLE public.file_attachments
      ADD CONSTRAINT chk_file_attachments_bucket_coherence
      CHECK (
        (bucket_type = 'avatars'   AND storage_bucket = 'make-d4766610-avatars')   OR
        (bucket_type = 'media'     AND storage_bucket = 'make-d4766610-media')     OR
        (bucket_type = 'documents' AND storage_bucket = 'make-d4766610-documents') OR
        (bucket_type = 'chat'      AND storage_bucket = 'make-d4766610-chat')
      );
    RAISE NOTICE '[file_attachments] chk_file_attachments_bucket_coherence CRIADA.';
  ELSE
    RAISE NOTICE '[file_attachments] chk_file_attachments_bucket_coherence já existia.';
  END IF;
END $$;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 4 — Verificação final completa                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 4a. Trigger
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  string_agg(event_manipulation, ' OR ') AS eventos,
  'OK' AS status
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_storage_bucket'
GROUP BY trigger_name, event_object_table, action_timing;

-- 4b. Constraint de coerência
SELECT
  conname   AS constraint_name,
  'ATIVA'   AS status
FROM pg_constraint
WHERE conname   = 'chk_file_attachments_bucket_coherence'
  AND conrelid  = 'public.file_attachments'::regclass;

-- 4c. Todas as constraints de storage (anônimas + nomeadas)
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause,
  CASE WHEN tc.constraint_name LIKE 'chk_%' THEN 'NOMEADA' ELSE 'ANONIMA' END AS tipo
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'doctors', 'clinic_settings', 'file_attachments')
  AND (
    cc.check_clause LIKE '%similar_to_escape%'
    OR tc.constraint_name LIKE 'chk_%'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- 4d. Estado final de file_attachments
SELECT
  COUNT(*)                                                        AS total,
  COUNT(*) FILTER (WHERE storage_bucket != CASE bucket_type
    WHEN 'avatars'   THEN 'make-d4766610-avatars'
    WHEN 'media'     THEN 'make-d4766610-media'
    WHEN 'chat'      THEN 'make-d4766610-chat'
    ELSE                   'make-d4766610-documents' END)         AS bucket_incoerentes,
  COUNT(*) FILTER (WHERE storage_path ~ similar_to_escape('(https?:|data:|blob:)%'::text)) AS paths_invalidos
FROM public.file_attachments;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
--   4a → 1 linha: trg_sync_storage_bucket | file_attachments | BEFORE | INSERT OR UPDATE
--   4b → 1 linha: chk_file_attachments_bucket_coherence | ATIVA
--   4c → 5 linhas com os 4 CHECKs de _path + 1 de bucket_coherence
--   4d → bucket_incoerentes=0, paths_invalidos=0
-- ═══════════════════════════════════════════════════════════════════════════════
