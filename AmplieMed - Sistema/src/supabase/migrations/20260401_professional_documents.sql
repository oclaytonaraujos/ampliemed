-- Adiciona o tipo 'professional' ao enum file_entity_type
-- para permitir anexo de documentos em perfis de profissionais/funcionários.

ALTER TYPE public.file_entity_type ADD VALUE IF NOT EXISTS 'professional';
