-- ============================================================
-- AmplieMed: Add appointment_id to queue_entries
-- Necessário para deduplicação de agendamentos confirmados
-- na fila de espera (evita duplicatas ao recarregar a página)
-- ============================================================

ALTER TABLE public.queue_entries
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_queue_entries_appointment_id
  ON public.queue_entries (appointment_id)
  WHERE appointment_id IS NOT NULL;
