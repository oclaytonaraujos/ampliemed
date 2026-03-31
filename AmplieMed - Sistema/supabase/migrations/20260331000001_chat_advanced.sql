-- Phase 5: Advanced Chat Features Migration

-- Extensão de chats
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS fixada_em TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS silenciada_em TIMESTAMPTZ NULL;

-- Extensão de messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS editada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS editada_em TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deletada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deletada_em TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS grupo_chat_id UUID NULL,
ALTER COLUMN chat_id DROP NOT NULL;

-- Extensão Arquivos na mensagem
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
ADD COLUMN IF NOT EXISTS arquivo_tipo VARCHAR(50),
ADD COLUMN IF NOT EXISTS arquivo_nome_original TEXT,
ADD COLUMN IF NOT EXISTS arquivo_tamanho INTEGER,
ADD COLUMN IF NOT EXISTS arquivo_storage_path TEXT;

-- Tabela de Reações
CREATE TABLE IF NOT EXISTS public.reacoes_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mensagem_id, usuario_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reacoes_mensagem_id ON public.reacoes_mensagens(mensagem_id);

-- Tabela Grupo Chats
CREATE TABLE IF NOT EXISTS public.grupo_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela Membros Grupo
CREATE TABLE IF NOT EXISTS public.grupo_chats_membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_chat_id UUID REFERENCES public.grupo_chats(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'membro',
  silenciado BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grupo_chat_id, usuario_id)
);

-- RLS policies simplificadas para fase 5 (ajustar conforme regras da clinica)
ALTER TABLE public.reacoes_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RLS_reacoes_mensagens" ON public.reacoes_mensagens FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.grupo_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RLS_grupo_chats" ON public.grupo_chats FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.grupo_chats_membros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RLS_grupo_chats_membros" ON public.grupo_chats_membros FOR ALL USING (true) WITH CHECK (true);

-- Ativar Realtime para novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.reacoes_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grupo_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grupo_chats_membros;
