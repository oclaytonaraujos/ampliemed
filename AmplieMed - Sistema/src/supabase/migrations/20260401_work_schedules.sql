-- Adiciona colunas de intervalo (pausa) e flag ativo à tabela de escalas.
-- A coluna break_time armazena o horário de início do intervalo (HH:MM).
-- A coluna is_active indica se o médico atende naquele dia da semana.

ALTER TABLE public.professional_work_schedules
  ADD COLUMN IF NOT EXISTS break_time time,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
