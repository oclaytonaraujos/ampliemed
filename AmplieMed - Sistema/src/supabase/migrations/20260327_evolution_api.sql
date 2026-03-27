-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260327_evolution_api
-- Purpose:   Add Evolution API v2 integration support
-- Tables:    clinics, communication_messages, evolution_webhook_logs
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Extend message_status enum with 'read' value ─────────────────────────
-- Evolution API distinguishes DELIVERED from READ; we surface this distinction.
-- PostgreSQL requires ADD VALUE outside a transaction block (no IF NOT EXISTS in
-- older versions, but Supabase/pg14+ supports it).

ALTER TYPE public.message_status ADD VALUE IF NOT EXISTS 'read' AFTER 'delivered';

-- ─── 2. Add Evolution tracking columns to communication_messages ──────────────

ALTER TABLE public.communication_messages
  ADD COLUMN IF NOT EXISTS evolution_message_id   text,
  ADD COLUMN IF NOT EXISTS delivery_timestamp     timestamp with time zone,
  ADD COLUMN IF NOT EXISTS read_timestamp         timestamp with time zone,
  ADD COLUMN IF NOT EXISTS failure_reason         text;

-- Fast lookup when MESSAGES_UPDATE webhook arrives with an evolution message id
CREATE INDEX IF NOT EXISTS communication_messages_evolution_id_idx
  ON public.communication_messages (evolution_message_id)
  WHERE evolution_message_id IS NOT NULL;

-- ─── 3. Add Evolution instance columns to clinics ────────────────────────────

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS evolution_instance_id           text,
  ADD COLUMN IF NOT EXISTS evolution_webhook_token         text,
  ADD COLUMN IF NOT EXISTS evolution_webhook_registered_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS evolution_instance_status       text DEFAULT 'disconnected';

-- Constraint: status must be one of the known states
ALTER TABLE public.clinics
  DROP CONSTRAINT IF EXISTS clinics_evolution_instance_status_check;

ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_evolution_instance_status_check
  CHECK (evolution_instance_status IN ('connected', 'connecting', 'disconnected'));

-- ─── 4. Create evolution_webhook_logs table ───────────────────────────────────
-- Stores every raw webhook payload received from Evolution API for auditing,
-- debugging, and replaying failed events.

CREATE TABLE IF NOT EXISTS public.evolution_webhook_logs (
  id            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  clinic_id     uuid                     REFERENCES public.clinics(id) ON DELETE CASCADE,
  instance_name text                     NOT NULL DEFAULT '',
  event_type    text                     NOT NULL,
  payload       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  processed     boolean                  NOT NULL DEFAULT false,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT evolution_webhook_logs_pkey PRIMARY KEY (id)
);

-- Index: query unprocessed events per clinic chronologically
CREATE INDEX IF NOT EXISTS evolution_webhook_logs_clinic_unprocessed_idx
  ON public.evolution_webhook_logs (clinic_id, processed, created_at DESC);

-- Index: filter by event type for monitoring dashboards
CREATE INDEX IF NOT EXISTS evolution_webhook_logs_event_type_idx
  ON public.evolution_webhook_logs (event_type, created_at DESC);

-- ─── 5. Row Level Security for evolution_webhook_logs ────────────────────────

ALTER TABLE public.evolution_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Clinic members can view logs for their own clinic
DROP POLICY IF EXISTS "clinic_members_select_webhook_logs" ON public.evolution_webhook_logs;
CREATE POLICY "clinic_members_select_webhook_logs"
  ON public.evolution_webhook_logs
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id
        FROM public.clinic_memberships
       WHERE user_id = auth.uid()
         AND active = true
    )
  );

-- Only the service role (Edge Functions with service_role_key) can insert/update
-- Regular authenticated users cannot write directly
DROP POLICY IF EXISTS "service_role_insert_webhook_logs" ON public.evolution_webhook_logs;
CREATE POLICY "service_role_insert_webhook_logs"
  ON public.evolution_webhook_logs
  FOR INSERT
  WITH CHECK (
    -- Allow service role bypass (no JWT → auth.uid() is null in service-role calls)
    auth.uid() IS NULL
    OR
    clinic_id IN (
      SELECT clinic_id
        FROM public.clinic_memberships
       WHERE user_id = auth.uid()
         AND active = true
    )
  );

-- ─── 6. Comments for documentation ───────────────────────────────────────────

COMMENT ON COLUMN public.communication_messages.evolution_message_id IS
  'Message ID returned by Evolution API (key.id). Used to correlate MESSAGES_UPDATE webhooks.';

COMMENT ON COLUMN public.communication_messages.delivery_timestamp IS
  'Timestamp when Evolution API reported DELIVERED status for this message.';

COMMENT ON COLUMN public.communication_messages.read_timestamp IS
  'Timestamp when Evolution API reported READ or PLAYED status for this message.';

COMMENT ON COLUMN public.communication_messages.failure_reason IS
  'Human-readable reason when message status is ''failed''. Populated by Evolution API error or webhook.';

COMMENT ON COLUMN public.clinics.evolution_instance_id IS
  'Evolution API instance name/ID used for this clinic''s WhatsApp connection.';

COMMENT ON COLUMN public.clinics.evolution_webhook_token IS
  'Secret 64-char hex token embedded in the webhook URL for this clinic. Validated on every incoming webhook.';

COMMENT ON COLUMN public.clinics.evolution_webhook_registered_at IS
  'When the webhook was last registered or refreshed on the Evolution API instance.';

COMMENT ON COLUMN public.clinics.evolution_instance_status IS
  'Real-time connection state updated by CONNECTION_UPDATE webhooks: connected | connecting | disconnected.';

COMMENT ON TABLE public.evolution_webhook_logs IS
  'Audit trail of all webhook events received from Evolution API v2. Processed=true once the event has been acted upon.';
