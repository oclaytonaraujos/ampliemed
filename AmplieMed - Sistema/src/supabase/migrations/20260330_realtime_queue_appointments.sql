-- ============================================================
-- AmplieMed: Realtime para appointments e queue_entries
-- Necessário para sincronização em tempo real entre dispositivos
-- ============================================================

-- appointments já estava habilitado; só queue_entries precisou ser adicionado
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
