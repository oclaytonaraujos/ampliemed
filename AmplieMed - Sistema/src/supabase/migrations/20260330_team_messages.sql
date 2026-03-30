-- ============================================================
-- AmplieMed: Team Messages
-- Recados da Equipe — mensagens internas por clínica
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id   uuid        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  author_id   uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  author_name text        NOT NULL,
  author_role text        NOT NULL DEFAULT 'user',
  message     text        NOT NULL CHECK (char_length(message) > 0),
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Index for fast listing by clinic ordered by time
CREATE INDEX IF NOT EXISTS idx_team_messages_clinic_created
  ON public.team_messages (clinic_id, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Clinic members can read messages from their clinic
CREATE POLICY "team_messages_select"
  ON public.team_messages
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id
        FROM public.clinic_memberships
       WHERE user_id = auth.uid()
         AND active = true
    )
  );

-- Clinic members can insert messages for their own clinic
CREATE POLICY "team_messages_insert"
  ON public.team_messages
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND
    clinic_id IN (
      SELECT clinic_id
        FROM public.clinic_memberships
       WHERE user_id = auth.uid()
         AND active = true
    )
  );

-- Authors can delete their own messages
CREATE POLICY "team_messages_delete"
  ON public.team_messages
  FOR DELETE
  USING (author_id = auth.uid());

-- ── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
