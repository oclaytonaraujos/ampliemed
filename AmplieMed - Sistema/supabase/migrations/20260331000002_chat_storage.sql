-- Criação do Bucket de Anexos do Chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Permite que qualquer pessoa leia os arquivos do chat público (ou usuários logados, ajustado na policy)
CREATE POLICY "Permitir leitura pública de anexos do chat" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat_attachments');

-- Permite o upload (INSERT) para autenticados no bucket de chats
CREATE POLICY "Permitir upload para autenticados" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat_attachments' AND auth.role() = 'authenticated');

-- Permite remoção (DELETE) pelo próprio usuário que fez upload (owner) se necessário
CREATE POLICY "Permitir exclusão pelo próprio autor"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat_attachments' AND auth.uid() = owner);
