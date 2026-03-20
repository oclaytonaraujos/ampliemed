Analise profundamente todo o sistema existente e identifique toda a estrutura necessária para migrar o backend de dados para o Supabase, garantindo que o sistema funcione exclusivamente com Supabase.

Objetivo principal

O sistema não deve armazenar nenhum dado localmente.
Remova qualquer dependência de armazenamento local, como:

localStorage

sessionStorage

IndexedDB

cache persistente para dados do sistema

banco local

mocks permanentes

arquivos temporários usados como fonte principal de dados

Todos os dados do sistema devem ser lidos, gravados, atualizados, removidos e sincronizados somente pelo Supabase, em tempo real, de forma centralizada e consistente.

Sua tarefa

Analise todo o projeto e considere:

páginas

componentes

hooks

contexts

stores

services

repositories

APIs

models

interfaces

tipos TypeScript

schemas de validação

regras de negócio

fluxos de autenticação

permissões de acesso

uploads de arquivos

chats

notificações

logs

histórico

status em tempo real

relacionamentos entre entidades

qualquer dado persistente usado no sistema

Com base nessa análise, faça o seguinte:
1. Gere a estrutura completa do banco no Supabase

Crie um arquivo SQL completo e executável para o Supabase, contendo:

todas as tabelas necessárias

colunas com tipos corretos

chaves primárias

foreign keys

tabelas relacionais

índices

constraints

enums

views, se necessário

funções SQL, se necessário

triggers

campos created_at e updated_at

UUID como identificador primário

padronização de nomenclatura

2. Configure segurança corretamente

Inclua:

Row Level Security (RLS) em todas as tabelas necessárias

policies completas de leitura, inserção, edição e exclusão

regras baseadas em usuário autenticado

separação de permissões por perfil, caso o sistema possua papéis diferentes

proteção contra acesso indevido entre usuários

3. Configure realtime

Implemente a estrutura necessária para que o sistema funcione em tempo real com Supabase, incluindo o que for necessário para:

chat

mensagens

notificações

atualização de status

presença online

atualizações simultâneas entre usuários

sincronização instantânea entre telas e sessões

4. Configure storage

Se o sistema possuir arquivos, imagens, documentos, áudios ou anexos, inclua:

buckets do Supabase Storage

estrutura de organização de arquivos

tabelas de metadados dos arquivos

vínculo entre arquivos e entidades do sistema

políticas de acesso seguras para upload, visualização e remoção

5. Adapte o sistema para usar somente Supabase

Faça todas as alterações necessárias no código para que:

toda persistência venha do Supabase

toda autenticação use Supabase Auth

todo upload use Supabase Storage

toda sincronização em tempo real use Supabase Realtime

nenhuma funcionalidade dependa de armazenamento local como fonte de verdade

o sistema fique pronto para uso real em produção

6. Preserve 100% das funcionalidades

Nenhuma funcionalidade pode ser perdida.
A estrutura criada deve contemplar completamente tudo o que o sistema já faz hoje, incluindo fluxos secundários, dados auxiliares, vínculos internos, estados persistentes, históricos e dependências entre módulos.

7. Entregue o resultado de forma completa

Quero que você entregue:

o SQL completo do banco de dados

a estrutura pensada para Supabase

todas as adaptações necessárias no sistema

tudo pronto para funcionamento real

sem soluções incompletas

sem placeholders genéricos

sem ignorar módulos do sistema

Requisitos técnicos obrigatórios

A solução final deve ser:

100% compatível com Supabase

pronta para produção

escalável

segura

organizada

normalizada

com boa performance

preparada para múltiplos usuários simultâneos

preparada para operação em tempo real

Regra final

O Supabase deve ser a única fonte de verdade do sistema.
Nenhum dado de negócio pode depender de armazenamento local.
Tudo deve funcionar com persistência remota, autenticação, storage e realtime diretamente no Supabase.