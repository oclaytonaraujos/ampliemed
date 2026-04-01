-- Permissões editáveis por role e por usuário.
--
-- role_permissions: substitui a matriz PERMISSIONS hardcoded em permissions.ts.
--   Cada linha representa as ações permitidas para um role em um módulo.
--   Quando não há linha, o sistema faz fallback para a matriz estática.
--
-- user_permissions: overrides individuais por usuário.
--   Quando presente, prevalece sobre o role.

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id   uuid        REFERENCES public.clinics(id) ON DELETE CASCADE,
  role        text        NOT NULL,
  module      text        NOT NULL,
  actions     text[]      NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES auth.users(id),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_unique UNIQUE (clinic_id, role, module)
);

-- Adiciona constraint UNIQUE caso a tabela já existisse sem ela
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'role_permissions_unique'
      AND conrelid = 'public.role_permissions'::regclass
  ) THEN
    ALTER TABLE public.role_permissions
      ADD CONSTRAINT role_permissions_unique UNIQUE (clinic_id, role, module);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id   uuid        REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL,
  module      text        NOT NULL,
  actions     text[]      NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_unique UNIQUE (clinic_id, user_id, module)
);

-- Adiciona constraint UNIQUE caso a tabela já existisse sem ela
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_permissions_unique'
      AND conrelid = 'public.user_permissions'::regclass
  ) THEN
    ALTER TABLE public.user_permissions
      ADD CONSTRAINT user_permissions_unique UNIQUE (clinic_id, user_id, module);
  END IF;
END $$;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "admins_manage_user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "members_read_role_permissions"  ON public.role_permissions;
DROP POLICY IF EXISTS "members_read_user_permissions"  ON public.user_permissions;

-- Somente administradores podem gerenciar permissões.
-- Verifica (em ordem): profiles.role, clinic_memberships.role e user_metadata do JWT.
-- O fallback em clinic_memberships é necessário pois o perfil pode ter sido criado
-- com role 'doctor' (default) enquanto a membership já tem role 'admin'.
CREATE POLICY "admins_manage_role_permissions" ON public.role_permissions
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
  ) WITH CHECK (
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

CREATE POLICY "admins_manage_user_permissions" ON public.user_permissions
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
  ) WITH CHECK (
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

-- Todos os membros autenticados podem ler (para carregar permissões em runtime)
CREATE POLICY "members_read_role_permissions" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "members_read_user_permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);
