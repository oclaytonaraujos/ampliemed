-- ═══════════════════════════════════════════════════════════════════════════════
-- AmplieMed — Storage Architecture Final Migration v2
-- Cole e execute integralmente no Supabase SQL Editor
-- Objetivo: alinhar schema real ao contrato definitivo baseado em _path
-- Data: 2026-03-16
-- ═══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 1 — profiles: criar avatar_path, migrar avatar_url, remover legado  │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 1a. Criar coluna avatar_path se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'avatar_path'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_path TEXT;
    RAISE NOTICE '[profiles] Coluna avatar_path criada.';
  ELSE
    RAISE NOTICE '[profiles] Coluna avatar_path já existe.';
  END IF;
END $$;

-- 1b. Migrar avatar_url → avatar_path (extrai PATH relativo de URL completa)
UPDATE public.profiles
SET avatar_path = CASE
  -- URL pública Supabase: extrai tudo após /bucket-name/
  WHEN avatar_url LIKE '%/storage/v1/object/public/%'
    THEN regexp_replace(avatar_url, '^.*/storage/v1/object/public/[^/]+/', '')
  -- URL assinada Supabase: extrai PATH antes dos query params
  WHEN avatar_url LIKE '%/storage/v1/object/sign/%'
    THEN regexp_replace(split_part(avatar_url, '?', 1),
           '^.*/storage/v1/object/sign/[^/]+/', '')
  -- Já é PATH relativo (não começa com http, data, blob)
  WHEN avatar_url NOT LIKE 'http%'
   AND avatar_url NOT LIKE 'data:%'
   AND avatar_url NOT LIKE 'blob:%'
   AND avatar_url IS NOT NULL
   AND avatar_url != ''
    THEN avatar_url
  -- URL externa, base64, blob → descarta
  ELSE NULL
END
WHERE avatar_path IS NULL
  AND avatar_url IS NOT NULL
  AND avatar_url != '';

-- 1c. Limpar avatar_path inválidos (base64, blob, http) originados de qualquer fonte
UPDATE public.profiles
SET avatar_path = NULL
WHERE avatar_path LIKE 'data:%'
   OR avatar_path LIKE 'blob:%'
   OR avatar_path LIKE 'http%';

-- 1d. Remover avatar_url (campo legado — substituído por avatar_path)
--     Se a coluna não existir, o bloco simplesmente ignora.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
    RAISE NOTICE '[profiles] Coluna avatar_url removida.';
  ELSE
    RAISE NOTICE '[profiles] Coluna avatar_url já não existe.';
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 2 — doctors: criar photo_path, migrar photo_url, remover legado     │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 2a. Criar coluna photo_path se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'doctors'
      AND column_name  = 'photo_path'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN photo_path TEXT;
    RAISE NOTICE '[doctors] Coluna photo_path criada.';
  ELSE
    RAISE NOTICE '[doctors] Coluna photo_path já existe.';
  END IF;
END $$;

-- 2b. Migrar photo_url → photo_path
UPDATE public.doctors
SET photo_path = CASE
  WHEN photo_url LIKE '%/storage/v1/object/public/%'
    THEN regexp_replace(photo_url, '^.*/storage/v1/object/public/[^/]+/', '')
  WHEN photo_url LIKE '%/storage/v1/object/sign/%'
    THEN regexp_replace(split_part(photo_url, '?', 1),
           '^.*/storage/v1/object/sign/[^/]+/', '')
  WHEN photo_url NOT LIKE 'http%'
   AND photo_url NOT LIKE 'data:%'
   AND photo_url NOT LIKE 'blob:%'
   AND photo_url IS NOT NULL
   AND photo_url != ''
    THEN photo_url
  ELSE NULL
END
WHERE photo_path IS NULL
  AND photo_url IS NOT NULL
  AND photo_url != '';

-- 2c. Limpar photo_path inválidos
UPDATE public.doctors
SET photo_path = NULL
WHERE photo_path LIKE 'data:%'
   OR photo_path LIKE 'blob:%'
   OR photo_path LIKE 'http%';

-- 2d. Remover photo_url (campo legado)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'doctors'
      AND column_name  = 'photo_url'
  ) THEN
    ALTER TABLE public.doctors DROP COLUMN IF EXISTS photo_url;
    RAISE NOTICE '[doctors] Coluna photo_url removida.';
  ELSE
    RAISE NOTICE '[doctors] Coluna photo_url já não existe.';
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 3 — clinic_settings: garantir logo_path, remover logo_url           │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 3a. Garantir que logo_path existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clinic_settings'
      AND column_name  = 'logo_path'
  ) THEN
    ALTER TABLE public.clinic_settings ADD COLUMN logo_path TEXT;
    RAISE NOTICE '[clinic_settings] Coluna logo_path criada.';
  ELSE
    RAISE NOTICE '[clinic_settings] Coluna logo_path já existe.';
  END IF;
END $$;

-- 3b. Migrar logo_url → logo_path (somente onde logo_path ainda está vazio)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clinic_settings'
      AND column_name  = 'logo_url'
  ) THEN
    UPDATE public.clinic_settings
    SET logo_path = CASE
      WHEN logo_url LIKE '%/storage/v1/object/public/%'
        THEN regexp_replace(logo_url, '^.*/storage/v1/object/public/[^/]+/', '')
      WHEN logo_url LIKE '%/storage/v1/object/sign/%'
        THEN regexp_replace(split_part(logo_url, '?', 1),
               '^.*/storage/v1/object/sign/[^/]+/', '')
      WHEN logo_url NOT LIKE 'http%'
       AND logo_url NOT LIKE 'data:%'
       AND logo_url NOT LIKE 'blob:%'
       AND logo_url IS NOT NULL
       AND logo_url != ''
        THEN logo_url
      ELSE NULL
    END
    WHERE (logo_path IS NULL OR logo_path = '')
      AND logo_url IS NOT NULL
      AND logo_url != '';
    RAISE NOTICE '[clinic_settings] Dados migrados de logo_url para logo_path.';
  END IF;
END $$;

-- 3c. Limpar logo_path inválidos
UPDATE public.clinic_settings
SET logo_path = NULL
WHERE logo_path LIKE 'data:%'
   OR logo_path LIKE 'blob:%'
   OR logo_path LIKE 'http%';

-- 3d. Remover logo_url (campo legado)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clinic_settings'
      AND column_name  = 'logo_url'
  ) THEN
    ALTER TABLE public.clinic_settings DROP COLUMN IF EXISTS logo_url;
    RAISE NOTICE '[clinic_settings] Coluna logo_url removida.';
  ELSE
    RAISE NOTICE '[clinic_settings] Coluna logo_url já não existe.';
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 4 — file_attachments: corrigir storage_bucket, normalizar bucket_type│
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 4a. Remover default legado 'make-d4766610-medical-files' e substituir por NULL
--     O campo storage_bucket passa a ser derivado de bucket_type no nível de app
DO $$
BEGIN
  -- Alterar default de storage_bucket para corresponder ao bucket do bucket_type 'documents'
  ALTER TABLE public.file_attachments
    ALTER COLUMN storage_bucket SET DEFAULT 'make-d4766610-documents';
  RAISE NOTICE '[file_attachments] Default de storage_bucket atualizado para make-d4766610-documents.';
EXCEPTION WHEN others THEN
  RAISE NOTICE '[file_attachments] Não foi possível alterar default de storage_bucket: %', SQLERRM;
END $$;

-- 4b. Garantir que bucket_type tem CHECK constraint com os 4 buckets válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'file_attachments_bucket_type_check'
      AND conrelid = 'public.file_attachments'::regclass
  ) THEN
    ALTER TABLE public.file_attachments
      ADD CONSTRAINT file_attachments_bucket_type_check
      CHECK (bucket_type IN ('avatars', 'media', 'documents', 'chat'));
    RAISE NOTICE '[file_attachments] CHECK constraint bucket_type adicionada.';
  ELSE
    RAISE NOTICE '[file_attachments] CHECK constraint bucket_type já existe.';
  END IF;
END $$;

-- 4c. Normalizar storage_bucket com base em bucket_type (para registros existentes)
UPDATE public.file_attachments
SET storage_bucket = CASE bucket_type
  WHEN 'avatars'   THEN 'make-d4766610-avatars'
  WHEN 'media'     THEN 'make-d4766610-media'
  WHEN 'chat'      THEN 'make-d4766610-chat'
  ELSE                   'make-d4766610-documents'
END
WHERE storage_bucket = 'make-d4766610-medical-files'
   OR storage_bucket IS NULL
   OR storage_bucket = '';

-- 4d. Corrigir bucket_type inválidos (qualquer valor fora dos 4 aceitos → documents)
UPDATE public.file_attachments
SET bucket_type = 'documents'
WHERE bucket_type IS NULL
   OR bucket_type NOT IN ('avatars', 'media', 'documents', 'chat');

-- 4e. Limpar storage_path inválidos (base64, blob:, URLs completas)
UPDATE public.file_attachments
SET storage_path = ''
WHERE storage_path LIKE 'data:%'
   OR storage_path LIKE 'blob:%'
   OR storage_path LIKE 'http:%'
   OR storage_path LIKE 'https:%';


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  SEÇÃO 5 — Verificação final (SELECT confirmatório)                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Verificar profiles
SELECT
  'profiles' AS tabela,
  COUNT(*) AS total,
  COUNT(avatar_path) AS com_avatar_path,
  COUNT(*) FILTER (WHERE avatar_path LIKE 'http%' OR avatar_path LIKE 'data:%') AS invalidos,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') AS avatar_url_ainda_existe
FROM public.profiles;

-- Verificar doctors
SELECT
  'doctors' AS tabela,
  COUNT(*) AS total,
  COUNT(photo_path) AS com_photo_path,
  COUNT(*) FILTER (WHERE photo_path LIKE 'http%' OR photo_path LIKE 'data:%') AS invalidos,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='doctors' AND column_name='photo_url') AS photo_url_ainda_existe
FROM public.doctors;

-- Verificar clinic_settings
SELECT
  'clinic_settings' AS tabela,
  COUNT(*) AS total,
  COUNT(logo_path) AS com_logo_path,
  COUNT(*) FILTER (WHERE logo_path LIKE 'http%' OR logo_path LIKE 'data:%') AS invalidos,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='clinic_settings' AND column_name='logo_url') AS logo_url_ainda_existe
FROM public.clinic_settings;

-- Verificar file_attachments
SELECT
  'file_attachments' AS tabela,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE storage_path LIKE 'data:%')  AS base64_paths,
  COUNT(*) FILTER (WHERE storage_path LIKE 'http%')   AS full_url_paths,
  COUNT(*) FILTER (WHERE storage_path = '')            AS empty_paths,
  COUNT(*) FILTER (WHERE storage_path NOT LIKE 'data:%'
                     AND storage_path NOT LIKE 'http%'
                     AND storage_path != '')           AS valid_paths
FROM public.file_attachments;

-- Verificar distribuição de buckets
SELECT
  storage_bucket,
  bucket_type,
  COUNT(*) AS registros
FROM public.file_attachments
GROUP BY storage_bucket, bucket_type
ORDER BY bucket_type;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO APÓS A EXECUÇÃO:
--
--  profiles:        avatar_url_ainda_existe = 0, avatar_path disponível
--  doctors:         photo_url_ainda_existe  = 0, photo_path disponível
--  clinic_settings: logo_url_ainda_existe   = 0, logo_path disponível
--  file_attachments: zero base64_paths, zero full_url_paths, zero legado bucket
-- ═══════════════════════════════════════════════════════════════════════════════
