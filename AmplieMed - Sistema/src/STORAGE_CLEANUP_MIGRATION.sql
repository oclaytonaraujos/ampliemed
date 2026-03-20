-- ═══════════════════════════════════════════════════════════════════════════════
-- AmplieMed — Storage Cleanup & Schema Hardening Migration v3
-- Cole e execute integralmente no Supabase SQL Editor
-- Objetivo: remover _url legados, blindar storage_bucket via trigger,
--           impedir paths inválidos via CHECK constraints
-- Data: 2026-03-16
-- ═══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 1 — Normalizar dados ANTES das constraints (safe-first)             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 1a. Limpar logo_path inválido em clinic_settings
UPDATE public.clinic_settings
SET logo_path = NULL
WHERE logo_path LIKE 'http:%'
   OR logo_path LIKE 'https:%'
   OR logo_path LIKE 'data:%'
   OR logo_path LIKE 'blob:%';

-- 1b. Limpar avatar_path inválido em profiles
UPDATE public.profiles
SET avatar_path = NULL
WHERE avatar_path LIKE 'http:%'
   OR avatar_path LIKE 'https:%'
   OR avatar_path LIKE 'data:%'
   OR avatar_path LIKE 'blob:%';

-- 1c. Limpar photo_path inválido em doctors
UPDATE public.doctors
SET photo_path = NULL
WHERE photo_path LIKE 'http:%'
   OR photo_path LIKE 'https:%'
   OR photo_path LIKE 'data:%'
   OR photo_path LIKE 'blob:%';

-- 1d. Normalizar storage_bucket em file_attachments com base em bucket_type
UPDATE public.file_attachments
SET storage_bucket = CASE bucket_type
  WHEN 'avatars'   THEN 'make-d4766610-avatars'
  WHEN 'media'     THEN 'make-d4766610-media'
  WHEN 'chat'      THEN 'make-d4766610-chat'
  ELSE                   'make-d4766610-documents'
END;

-- 1e. Limpar storage_path inválido em file_attachments
UPDATE public.file_attachments
SET storage_path = ''
WHERE storage_path LIKE 'http:%'
   OR storage_path LIKE 'https:%'
   OR storage_path LIKE 'data:%'
   OR storage_path LIKE 'blob:%';


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 2 — Remover colunas _url legadas                                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 2a. clinic_settings.logo_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clinic_settings'
      AND column_name  = 'logo_url'
  ) THEN
    ALTER TABLE public.clinic_settings DROP COLUMN logo_url;
    RAISE NOTICE '[clinic_settings] logo_url REMOVIDA.';
  ELSE
    RAISE NOTICE '[clinic_settings] logo_url já não existia.';
  END IF;
END $$;

-- 2b. profiles.avatar_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN avatar_url;
    RAISE NOTICE '[profiles] avatar_url REMOVIDA.';
  ELSE
    RAISE NOTICE '[profiles] avatar_url já não existia.';
  END IF;
END $$;

-- 2c. doctors.photo_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'doctors'
      AND column_name  = 'photo_url'
  ) THEN
    ALTER TABLE public.doctors DROP COLUMN photo_url;
    RAISE NOTICE '[doctors] photo_url REMOVIDA.';
  ELSE
    RAISE NOTICE '[doctors] photo_url já não existia.';
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 3 — Trigger: storage_bucket auto-preenchido a partir de bucket_type │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 3a. Function auxiliar que mapeia bucket_type → nome real do bucket
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

-- 3b. Trigger BEFORE INSERT OR UPDATE em file_attachments
DROP TRIGGER IF EXISTS trg_sync_storage_bucket ON public.file_attachments;

CREATE TRIGGER trg_sync_storage_bucket
  BEFORE INSERT OR UPDATE OF bucket_type ON public.file_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_storage_bucket();


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 4 — CHECK constraints: bloquear URL/base64/blob em campos _path     │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Padrão de validação aplicado:
--   valor NULL é permitido (campo opcional)
--   valor '' é permitido (vazio explícito)
--   qualquer valor não-nulo não pode começar com http:, https:, data:, blob:

-- 4a. file_attachments.storage_path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname    = 'chk_file_attachments_storage_path_no_url'
      AND conrelid   = 'public.file_attachments'::regclass
  ) THEN
    ALTER TABLE public.file_attachments
      ADD CONSTRAINT chk_file_attachments_storage_path_no_url
      CHECK (
        storage_path IS NULL
        OR storage_path NOT SIMILAR TO '(https?:|data:|blob:)%'
      );
    RAISE NOTICE '[file_attachments] CHECK storage_path adicionada.';
  ELSE
    RAISE NOTICE '[file_attachments] CHECK storage_path já existe.';
  END IF;
END $$;

-- 4b. clinic_settings.logo_path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname    = 'chk_clinic_settings_logo_path_no_url'
      AND conrelid   = 'public.clinic_settings'::regclass
  ) THEN
    ALTER TABLE public.clinic_settings
      ADD CONSTRAINT chk_clinic_settings_logo_path_no_url
      CHECK (
        logo_path IS NULL
        OR logo_path NOT SIMILAR TO '(https?:|data:|blob:)%'
      );
    RAISE NOTICE '[clinic_settings] CHECK logo_path adicionada.';
  ELSE
    RAISE NOTICE '[clinic_settings] CHECK logo_path já existe.';
  END IF;
END $$;

-- 4c. profiles.avatar_path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname    = 'chk_profiles_avatar_path_no_url'
      AND conrelid   = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_avatar_path_no_url
      CHECK (
        avatar_path IS NULL
        OR avatar_path NOT SIMILAR TO '(https?:|data:|blob:)%'
      );
    RAISE NOTICE '[profiles] CHECK avatar_path adicionada.';
  ELSE
    RAISE NOTICE '[profiles] CHECK avatar_path já existe.';
  END IF;
END $$;

-- 4d. doctors.photo_path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname    = 'chk_doctors_photo_path_no_url'
      AND conrelid   = 'public.doctors'::regclass
  ) THEN
    ALTER TABLE public.doctors
      ADD CONSTRAINT chk_doctors_photo_path_no_url
      CHECK (
        photo_path IS NULL
        OR photo_path NOT SIMILAR TO '(https?:|data:|blob:)%'
      );
    RAISE NOTICE '[doctors] CHECK photo_path adicionada.';
  ELSE
    RAISE NOTICE '[doctors] CHECK photo_path já existe.';
  END IF;
END $$;

-- 4e. Constraint de coerência bucket_type × storage_bucket (par válido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname    = 'chk_file_attachments_bucket_coherence'
      AND conrelid   = 'public.file_attachments'::regclass
  ) THEN
    ALTER TABLE public.file_attachments
      ADD CONSTRAINT chk_file_attachments_bucket_coherence
      CHECK (
        (bucket_type = 'avatars'   AND storage_bucket = 'make-d4766610-avatars')   OR
        (bucket_type = 'media'     AND storage_bucket = 'make-d4766610-media')     OR
        (bucket_type = 'documents' AND storage_bucket = 'make-d4766610-documents') OR
        (bucket_type = 'chat'      AND storage_bucket = 'make-d4766610-chat')
      );
    RAISE NOTICE '[file_attachments] CHECK bucket_coherence adicionada.';
  ELSE
    RAISE NOTICE '[file_attachments] CHECK bucket_coherence já existe.';
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 5 — Verificação final                                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 5a. Confirmar que _url NÃO existem mais
SELECT
  table_name,
  column_name,
  'LEGADO AINDA PRESENTE — VERIFICAR' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles'         AND column_name = 'avatar_url') OR
    (table_name = 'doctors'          AND column_name = 'photo_url')  OR
    (table_name = 'clinic_settings'  AND column_name = 'logo_url')
  )
UNION ALL
SELECT 'verificacao' AS table_name, 'resultado' AS column_name,
  CASE WHEN COUNT(*) = 0 THEN 'OK — nenhuma coluna _url legada encontrada'
       ELSE 'ERRO — colunas _url ainda presentes: ' || COUNT(*)::text
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles'        AND column_name = 'avatar_url') OR
    (table_name = 'doctors'         AND column_name = 'photo_url')  OR
    (table_name = 'clinic_settings' AND column_name = 'logo_url')
  );

-- 5b. Confirmar que _path existem
SELECT
  table_name,
  column_name,
  'CONTRATO PATH ATIVO' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles'        AND column_name = 'avatar_path') OR
    (table_name = 'doctors'         AND column_name = 'photo_path')  OR
    (table_name = 'clinic_settings' AND column_name = 'logo_path')
  )
ORDER BY table_name;

-- 5c. Confirmar constraints criadas
SELECT
  conname   AS constraint_name,
  contype   AS tipo,
  CASE contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FK' ELSE contype::text END AS tipo_legivel
FROM pg_constraint
WHERE conrelid IN (
  'public.file_attachments'::regclass,
  'public.profiles'::regclass,
  'public.doctors'::regclass,
  'public.clinic_settings'::regclass
)
  AND conname LIKE 'chk_%'
ORDER BY conrelid::text, conname;

-- 5d. Confirmar trigger criado
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_storage_bucket';

-- 5e. Estado de file_attachments
SELECT
  COUNT(*)                                                          AS total,
  COUNT(*) FILTER (WHERE storage_path NOT SIMILAR TO '(https?:|data:|blob:)%'
                     OR storage_path IS NULL)                       AS paths_validos,
  COUNT(*) FILTER (WHERE storage_bucket != CASE bucket_type
    WHEN 'avatars'   THEN 'make-d4766610-avatars'
    WHEN 'media'     THEN 'make-d4766610-media'
    WHEN 'chat'      THEN 'make-d4766610-chat'
    ELSE                   'make-d4766610-documents' END)           AS bucket_incoerentes
FROM public.file_attachments;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
--   5a → 'OK — nenhuma coluna _url legada encontrada'
--   5b → 3 linhas: avatar_path, photo_path, logo_path
--   5c → 5 constraints chk_*
--   5d → 1 trigger trg_sync_storage_bucket BEFORE INSERT OR UPDATE
--   5e → total=0, paths_validos=0, bucket_incoerentes=0 (tabela vazia)
-- ═══════════════════════════════════════════════════════════════════════════════
