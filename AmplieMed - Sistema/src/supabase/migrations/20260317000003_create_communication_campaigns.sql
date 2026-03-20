-- Migration: Create communication_campaigns table
-- Date: 2026-03-17
-- Purpose: Persist marketing/communication campaigns (previously in-memory only)

CREATE TABLE IF NOT EXISTS public.communication_campaigns (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  owner_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text        NOT NULL DEFAULT '',
  type         text        NOT NULL DEFAULT 'custom',   -- 'birthday' | 'followup' | 'custom'
  channel      text        NOT NULL DEFAULT 'email',    -- 'whatsapp' | 'sms' | 'email'
  status       text        NOT NULL DEFAULT 'draft',    -- 'active' | 'paused' | 'draft'
  total_recipients integer  NOT NULL DEFAULT 0,
  sent         integer      NOT NULL DEFAULT 0,
  message      text         DEFAULT NULL,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT communication_campaigns_pkey PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.communication_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own campaigns"
  ON public.communication_campaigns
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_owner
  ON public.communication_campaigns(owner_id);

CREATE INDEX IF NOT EXISTS idx_communication_campaigns_status
  ON public.communication_campaigns(owner_id, status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_communication_campaigns_updated_at
  BEFORE UPDATE ON public.communication_campaigns
  FOR EACH ROW EXECUTE PROCEDURE public.set_campaigns_updated_at();

COMMENT ON TABLE public.communication_campaigns IS
  'Marketing/reminder campaigns. Replaces ephemeral React state; fully persisted with RLS per user.';
COMMENT ON COLUMN public.communication_campaigns.type IS 'birthday | followup | custom';
COMMENT ON COLUMN public.communication_campaigns.channel IS 'whatsapp | sms | email';
COMMENT ON COLUMN public.communication_campaigns.status IS 'draft | active | paused';
