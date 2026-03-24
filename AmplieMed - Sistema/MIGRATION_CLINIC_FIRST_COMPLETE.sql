-- ═════════════════════════════════════════════════════════════════════════════
-- 🏥 AMPLIEMED - MIGRAÇÃO CLINIC-FIRST COMPLETA
-- 
-- Esta migração implementa o modelo clinic-first no Supabase
-- Inclui: tabelas, índices, RLS policies, helper functions
-- 
-- ⚠️  INSTRUÇÕES DE USO:
-- 1. Abra o SQL Editor do Supabase Dashboard
-- 2. Cole TODO o conteúdo deste arquivo
-- 3. Clique em "RUN" (botão verde no canto superior)
-- 4. Aguarde a conclusão (deve ser rápido, 1-2 minutos)
-- 5. Verifique se não há erros na seção "Results"
-- 
-- Tempo estimado: 2 minutos
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CRIAR TABELA: clinic_invite_tokens
-- 
-- Armazena tokens de convite gerados por administradores de clínicas
-- Cada token: único, expira em 48h, pode ser usado apenas uma vez
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clinic_invite_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  
  CONSTRAINT clinic_invite_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_invite_tokens_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT clinic_invite_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT clinic_invite_tokens_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT clinic_invite_tokens_token_unique UNIQUE (token)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_token ON public.clinic_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_clinic_id ON public.clinic_invite_tokens(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_invited_email ON public.clinic_invite_tokens(invited_email);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_expires_at ON public.clinic_invite_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_clinic_invite_tokens_created_by ON public.clinic_invite_tokens(created_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CRIAR TABELA: clinic_memberships
-- 
-- Mapeia usuários para clínicas com papéis específicos
-- Permite que um usuário pertença a múltiplas clínicas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clinic_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'doctor'::text CHECK (role IN ('admin', 'doctor', 'receptionist', 'financial', 'viewer')),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  
  CONSTRAINT clinic_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_memberships_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT clinic_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT clinic_memberships_unique_user_clinic UNIQUE (clinic_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_user_id ON public.clinic_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_clinic_id ON public.clinic_memberships(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_role ON public.clinic_memberships(role);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_active ON public.clinic_memberships(active);

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. POLÍTICAS RLS: clinic_invite_tokens
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.clinic_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Política INSERT: Aplicação (Edge Function) pode criar convites
CREATE POLICY "invite_tokens_insert_by_admin"
  ON public.clinic_invite_tokens
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships
      WHERE clinic_id = clinic_invite_tokens.clinic_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND active = true
    )
  );

-- Política SELECT: Admin da clínica pode ver convites
CREATE POLICY "invite_tokens_select_by_admin"
  ON public.clinic_invite_tokens
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.clinic_memberships
      WHERE clinic_id = clinic_invite_tokens.clinic_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. POLÍTICAS RLS: clinic_memberships
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.clinic_memberships ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuários veem suas próprias memberships
CREATE POLICY "memberships_select_own"
  ON public.clinic_memberships
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política SELECT: Admin da clínica vê memberships da clínica
CREATE POLICY "memberships_select_by_admin"
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

-- Política INSERT: Admin da clínica pode adicionar membros
CREATE POLICY "memberships_insert_by_admin"
  ON public.clinic_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm_admin
      WHERE cm_admin.clinic_id = clinic_memberships.clinic_id
        AND cm_admin.user_id = auth.uid()
        AND cm_admin.role = 'admin'
        AND cm_admin.active = true
    )
  );

-- Política UPDATE: Admin da clínica pode atualizar memberships
CREATE POLICY "memberships_update_by_admin"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm_admin
      WHERE cm_admin.clinic_id = clinic_memberships.clinic_id
        AND cm_admin.user_id = auth.uid()
        AND cm_admin.role = 'admin'
        AND cm_admin.active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. ATUALIZAR RLS: patients
-- 
-- Usuários só veem pacientes de suas clínicas
-- ═════════════════════════════════════════════════════════════════════════════

-- Remove política antiga (se existir)
DROP POLICY IF EXISTS "auth_users_can_select_patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;

-- Cria política nova com isolamento de clinic_id
CREATE POLICY "patients_select_by_clinic"
  ON public.patients
  FOR SELECT
  USING (
    -- Backward compatibility: usuário é o owner
    auth.uid() = owner_id OR
    -- Novo: usuário é membro da clínica
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

CREATE POLICY "patients_insert_by_clinic"
  ON public.patients
  FOR INSERT
  WITH CHECK (
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

CREATE POLICY "patients_update_by_clinic"
  ON public.patients
  FOR UPDATE
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
  )
  WITH CHECK (
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

CREATE POLICY "patients_delete_by_clinic"
  ON public.patients
  FOR DELETE
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = patients.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'doctor')
          AND cm.active = true
      )
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. ATUALIZAR RLS: appointments
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;

CREATE POLICY "appointments_select_by_clinic"
  ON public.appointments
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = appointments.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "appointments_insert_by_clinic"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = appointments.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "appointments_update_by_clinic"
  ON public.appointments
  FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = appointments.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  )
  WITH CHECK (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = appointments.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "appointments_delete_by_clinic"
  ON public.appointments
  FOR DELETE
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = appointments.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'doctor')
          AND cm.active = true
      )
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. ATUALIZAR RLS: medical_records
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can view own records" ON public.medical_records;

CREATE POLICY "medical_records_select_by_clinic"
  ON public.medical_records
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = medical_records.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "medical_records_insert_by_clinic"
  ON public.medical_records
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = medical_records.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "medical_records_update_by_clinic"
  ON public.medical_records
  FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = medical_records.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  )
  WITH CHECK (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = medical_records.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. ATUALIZAR RLS: exams
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_exams" ON public.exams;

CREATE POLICY "exams_select_by_clinic"
  ON public.exams
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = exams.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "exams_insert_by_clinic"
  ON public.exams
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = exams.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

CREATE POLICY "exams_update_by_clinic"
  ON public.exams
  FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = exams.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  )
  WITH CHECK (
    auth.uid() = owner_id OR
    (
      clinic_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.clinic_memberships cm
        WHERE cm.clinic_id = exams.clinic_id
          AND cm.user_id = auth.uid()
          AND cm.active = true
      )
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 9. ATUALIZAR RLS: stock_items
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_stock_items" ON public.stock_items;

CREATE POLICY "stock_items_select_by_clinic"
  ON public.stock_items
  FOR SELECT
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = stock_items.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.active = true
    )
  );

CREATE POLICY "stock_items_insert_by_clinic"
  ON public.stock_items
  FOR INSERT
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = stock_items.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

CREATE POLICY "stock_items_update_by_clinic"
  ON public.stock_items
  FOR UPDATE
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = stock_items.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  )
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = stock_items.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 10. ATUALIZAR RLS: financial_billings
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_financial_billings" ON public.financial_billings;

CREATE POLICY "financial_billings_select_by_clinic"
  ON public.financial_billings
  FOR SELECT
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_billings.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.active = true
    )
  );

CREATE POLICY "financial_billings_insert_by_clinic"
  ON public.financial_billings
  FOR INSERT
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_billings.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

CREATE POLICY "financial_billings_update_by_clinic"
  ON public.financial_billings
  FOR UPDATE
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_billings.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  )
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_billings.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 11. ATUALIZAR RLS: financial_payments
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_financial_payments" ON public.financial_payments;

CREATE POLICY "financial_payments_select_by_clinic"
  ON public.financial_payments
  FOR SELECT
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_payments.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.active = true
    )
  );

CREATE POLICY "financial_payments_insert_by_clinic"
  ON public.financial_payments
  FOR INSERT
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_payments.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

CREATE POLICY "financial_payments_update_by_clinic"
  ON public.financial_payments
  FOR UPDATE
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_payments.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  )
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_payments.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 12. ATUALIZAR RLS: financial_receivables
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_users_can_select_financial_receivables" ON public.financial_receivables;

CREATE POLICY "financial_receivables_select_by_clinic"
  ON public.financial_receivables
  FOR SELECT
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_receivables.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.active = true
    )
  );

CREATE POLICY "financial_receivables_insert_by_clinic"
  ON public.financial_receivables
  FOR INSERT
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_receivables.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

CREATE POLICY "financial_receivables_update_by_clinic"
  ON public.financial_receivables
  FOR UPDATE
  USING (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_receivables.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  )
  WITH CHECK (
    clinic_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm
      WHERE cm.clinic_id = financial_receivables.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'financial')
        AND cm.active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 13. FUNÇÕES HELPER
-- 
-- Estas funções facilitam queries e validações no código
-- ═════════════════════════════════════════════════════════════════════════════

-- Retorna todas as clínicas do usuário atual
CREATE OR REPLACE FUNCTION public.user_clinics()
RETURNS TABLE(id uuid, name text, cnpj text, email text, phone text) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.cnpj, c.email, c.phone
  FROM public.clinics c
  INNER JOIN public.clinic_memberships cm ON cm.clinic_id = c.id
  WHERE cm.user_id = auth.uid() AND cm.active = true
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica se usuário é admin de uma clínica
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

-- Retorna o papel do usuário em uma clínica
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

-- Verifica se um convite é válido (não expirado, não usado)
CREATE OR REPLACE FUNCTION public.is_invite_valid(token text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clinic_invite_tokens
    WHERE token = $1
      AND expires_at > now()
      AND used_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marca um convite como usado
CREATE OR REPLACE FUNCTION public.mark_invite_used(token text, user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.clinic_invite_tokens
  SET used_at = now(), used_by = $2
  WHERE token = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRAÇÃO
-- 
-- ✅ Próximas etapas:
-- 1. Criar os 3 Edge Functions no Dashboard do Supabase:
--    - POST /auth/clinic-signup
--    - POST /clinic/[clinicId]/invite
--    - POST /auth/accept-clinic-invite
-- 
-- 2. Integrar no código React:
--    - Adicionar ClinicSignup.tsx
--    - Atualizar routes.tsx
--    - Atualizar Login.tsx
-- 
-- 3. Testar o fluxo completo:
--    - Registrar clínica
--    - Gerar convite
--    - Aceitar convite como profissional
-- 
-- ═════════════════════════════════════════════════════════════════════════════
