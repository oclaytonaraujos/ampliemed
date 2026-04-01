-- Tipos de perfil/profissional cadastráveis pela clínica.
-- Fonte única de verdade para os tipos usados no cadastro de profissionais e
-- no controle de acesso e permissões.
--
-- Execução idempotente: segura para rodar múltiplas vezes.

-- ─── Tabela principal ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_types (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id   uuid        REFERENCES public.clinics(id) ON DELETE CASCADE,
  owner_id    uuid        REFERENCES auth.users(id),
  name        text        NOT NULL,
  description text,
  code        text,
  base_role   text        NOT NULL DEFAULT 'doctor',
  color       text        NOT NULL DEFAULT '#6366f1',
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive')),
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_types_pkey PRIMARY KEY (id)
);

-- Adiciona colunas nas instâncias que já tinham a tabela sem esses campos
ALTER TABLE public.profile_types
  ADD COLUMN IF NOT EXISTS code       text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- UNIQUE CONSTRAINT em code para que ON CONFLICT (code) funcione.
-- NULLs múltiplos são permitidos pelo PostgreSQL (NULL != NULL).
-- Usa DO block para ser idempotente.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profile_types_code_key'
      AND conrelid = 'public.profile_types'::regclass
  ) THEN
    ALTER TABLE public.profile_types ADD CONSTRAINT profile_types_code_key UNIQUE (code);
  END IF;
END $$;

-- Remove índice parcial anterior (incompatível com ON CONFLICT sem cláusula WHERE)
DROP INDEX IF EXISTS profile_types_code_unique;

-- Índice para lookup rápido por código
CREATE INDEX IF NOT EXISTS profile_types_code_idx ON public.profile_types (code);

-- ─── Limpeza de permissões órfãs ao excluir um tipo ──────────────────────────
-- Quando um profile type é deletado, remove suas entradas em role_permissions.
-- Precisamos de uma função + trigger porque role_permissions.role é text (não FK direto).
CREATE OR REPLACE FUNCTION public.cleanup_profile_type_permissions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.role_permissions WHERE role = OLD.id::text;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_profile_type_permissions ON public.profile_types;
CREATE TRIGGER trg_cleanup_profile_type_permissions
  BEFORE DELETE ON public.profile_types
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_profile_type_permissions();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profile_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_profile_types"  ON public.profile_types;
DROP POLICY IF EXISTS "admins_manage_profile_types" ON public.profile_types;

-- Todos os membros autenticados podem ler
CREATE POLICY "members_read_profile_types" ON public.profile_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Somente administradores podem criar/editar/excluir
CREATE POLICY "admins_manage_profile_types" ON public.profile_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_memberships
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ─── Tipos padrão do sistema ─────────────────────────────────────────────────
-- Inseridos sem owner_id/clinic_id → disponíveis globalmente como fallback.
-- ON CONFLICT (code) DO NOTHING evita duplicatas em re-execuções.

INSERT INTO public.profile_types (name, code, base_role, color, status, is_default) VALUES
  ('Médico(a)',        'doctor',       'doctor',       '#ec4899', 'active', true),
  ('Enfermeiro(a)',    'nurse',        'doctor',       '#3b82f6', 'active', true),
  ('Técnico(a)',       'technician',   'doctor',       '#f59e0b', 'active', true),
  ('Terapeuta',        'therapist',    'doctor',       '#10b981', 'active', true),
  ('Nutricionista',    'nutritionist', 'doctor',       '#8b5cf6', 'active', true),
  ('Psicólogo(a)',     'psychologist', 'doctor',       '#6366f1', 'active', true),
  ('Farmacêutico(a)',  'pharmacist',   'doctor',       '#14b8a6', 'active', true),
  ('Recepcionista',    'receptionist', 'receptionist', '#64748b', 'active', true),
  ('Financeiro',       'financial',    'financial',    '#f97316', 'active', true),
  ('Outro',            'other',        'doctor',       '#94a3b8', 'active', true)
ON CONFLICT ON CONSTRAINT profile_types_code_key DO NOTHING;
