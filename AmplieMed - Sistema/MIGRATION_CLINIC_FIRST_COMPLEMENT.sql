-- ═════════════════════════════════════════════════════════════════════════════
-- 🏥 AMPLIEMED - MIGRAÇÃO CLINIC-FIRST COMPLEMENTAR
-- 
-- Este arquivo complementa o schema existente com RLS Policies, Índices e Funções
-- Deve ser executado APÓS a criação das tabelas clinic_invite_tokens e clinic_memberships
-- 
-- ⚠️  INSTRUÇÕES:
-- 1. Abra o SQL Editor do Supabase Dashboard
-- 2. Cole APENAS o conteúdo deste arquivo (não o arquivo anterior)
-- 3. Clique em "RUN" (botão verde no canto superior)
-- 4. Aguarde a conclusão
-- 
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. HABILITAR RLS NAS DUAS TABELAS
-- 
-- Nota: As constraints UNIQUE já existem no schema
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clinic_invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_memberships ENABLE ROW LEVEL SECURITY;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. RLS POLICIES: clinic_invite_tokens
-- ═════════════════════════════════════════════════════════════════════════════

-- Política INSERT: Admin da clínica pode criar convites
DROP POLICY IF EXISTS "invite_tokens_insert_by_admin" ON public.clinic_invite_tokens;
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

-- Política SELECT: Admin da clínica pode ver seus convites
DROP POLICY IF EXISTS "invite_tokens_select_by_admin" ON public.clinic_invite_tokens;
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
-- 3. RLS POLICIES: clinic_memberships
-- ═════════════════════════════════════════════════════════════════════════════

-- Política SELECT: Usuários veem suas próprias memberships
DROP POLICY IF EXISTS "memberships_select_own" ON public.clinic_memberships;
CREATE POLICY "memberships_select_own"
  ON public.clinic_memberships
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política SELECT: Admin da clínica vê todas as memberships da clínica
DROP POLICY IF EXISTS "memberships_select_by_admin" ON public.clinic_memberships;
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
DROP POLICY IF EXISTS "memberships_insert_by_admin" ON public.clinic_memberships;
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
DROP POLICY IF EXISTS "memberships_update_by_admin" ON public.clinic_memberships;
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

-- Política DELETE: Admin pode desativar membros
DROP POLICY IF EXISTS "memberships_delete_by_admin" ON public.clinic_memberships;
CREATE POLICY "memberships_delete_by_admin"
  ON public.clinic_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_memberships cm_admin
      WHERE cm_admin.clinic_id = clinic_memberships.clinic_id
        AND cm_admin.user_id = auth.uid()
        AND cm_admin.role = 'admin'
        AND cm_admin.active = true
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ATUALIZAR RLS: patients (adicionar isolamento por clinic_id)
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "patients_select_by_clinic" ON public.patients;
CREATE POLICY "patients_select_by_clinic"
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

DROP POLICY IF EXISTS "patients_insert_by_clinic" ON public.patients;
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

DROP POLICY IF EXISTS "patients_update_by_clinic" ON public.patients;
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

DROP POLICY IF EXISTS "patients_delete_by_clinic" ON public.patients;
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
-- 5. ATUALIZAR RLS: appointments
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "appointments_select_by_clinic" ON public.appointments;
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

DROP POLICY IF EXISTS "appointments_insert_by_clinic" ON public.appointments;
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

DROP POLICY IF EXISTS "appointments_update_by_clinic" ON public.appointments;
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

DROP POLICY IF EXISTS "appointments_delete_by_clinic" ON public.appointments;
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
-- 6. ATUALIZAR RLS: medical_records
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "medical_records_select_by_clinic" ON public.medical_records;
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

DROP POLICY IF EXISTS "medical_records_insert_by_clinic" ON public.medical_records;
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

DROP POLICY IF EXISTS "medical_records_update_by_clinic" ON public.medical_records;
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
-- 7. ATUALIZAR RLS: exams
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "exams_select_by_clinic" ON public.exams;
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

DROP POLICY IF EXISTS "exams_insert_by_clinic" ON public.exams;
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

DROP POLICY IF EXISTS "exams_update_by_clinic" ON public.exams;
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
-- 8. ATUALIZAR RLS: stock_items
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "stock_items_select_by_clinic" ON public.stock_items;
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

DROP POLICY IF EXISTS "stock_items_insert_by_clinic" ON public.stock_items;
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

DROP POLICY IF EXISTS "stock_items_update_by_clinic" ON public.stock_items;
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
-- 9. ATUALIZAR RLS: financial_billings, _payments, _receivables
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "financial_billings_select_by_clinic" ON public.financial_billings;
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

DROP POLICY IF EXISTS "financial_billings_insert_by_clinic" ON public.financial_billings;
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

DROP POLICY IF EXISTS "financial_payments_select_by_clinic" ON public.financial_payments;
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

DROP POLICY IF EXISTS "financial_payments_insert_by_clinic" ON public.financial_payments;
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

DROP POLICY IF EXISTS "financial_receivables_select_by_clinic" ON public.financial_receivables;
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

DROP POLICY IF EXISTS "financial_receivables_insert_by_clinic" ON public.financial_receivables;
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

-- ═════════════════════════════════════════════════════════════════════════════
-- 10. FUNÇÕES HELPER
-- ═════════════════════════════════════════════════════════════════════════════

-- Retorna todas as clínicas do usuário atual
DROP FUNCTION IF EXISTS public.user_clinics();
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
DROP FUNCTION IF EXISTS public.is_clinic_admin(uuid);
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
DROP FUNCTION IF EXISTS public.user_clinic_role(uuid);
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
DROP FUNCTION IF EXISTS public.is_invite_valid(text);
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
DROP FUNCTION IF EXISTS public.mark_invite_used(text, uuid);
CREATE OR REPLACE FUNCTION public.mark_invite_used(token text, user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.clinic_invite_tokens
  SET used_at = now(), used_by = $2
  WHERE token = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRAÇÃO COMPLEMENTAR
-- 
-- ✅ Próximas etapas:
-- 1. Implementar Edge Functions no Supabase:
--    - POST /auth/clinic-signup
--    - POST /clinic/[clinicId]/invite
--    - POST /auth/accept-clinic-invite
-- 
-- 2. Cores dos status (usando jsdoc.guidelines):
--    - Clinic criada: 'success'
--    - Profissional adicionado: 'success'
--    - Convite aceito: 'success'
-- 
-- ═════════════════════════════════════════════════════════════════════════════
