Execute uma refatoração arquitetural completa, obrigatória e sem atalhos em todo o sistema para corrigir definitivamente a gestão de imagens, documentos e arquivos com Supabase Storage.

Você não deve apenas analisar, sugerir ou descrever.
Você deve aplicar as correções necessárias no projeto, alterar os arquivos relevantes, criar helpers, ajustar componentes, corrigir contratos de dados, atualizar fluxos de upload/exibição e gerar qualquer migration SQL necessária para deixar o sistema 100% funcional, consistente e pronto para produção.

CONTEXTO JÁ COMPROVADO

A auditoria técnica já confirmou os seguintes problemas reais no sistema:

existe componente de upload que converte arquivos para base64

a interface de anexos aceita arquitetura híbrida entre base64/data e storagePath

existe fallback incorreto que pode salvar data em storage_path

o componente de upload não está integrado aos módulos reais do sistema

existe apenas um bucket privado para todos os arquivos

não há helpers centralizados para conversão PATH → URL

há campo persistindo URL completa em vez de PATH

o backend de storage existe, mas a arquitetura frontend está errada/incompleta

Esses problemas já foram identificados e confirmados.
Portanto, não repita auditoria e não responda com diagnóstico genérico.
Seu trabalho agora é corrigir.

OBJETIVO

Deixe o sistema com arquitetura final obrigatória onde:

todo arquivo é armazenado exclusivamente no Supabase Storage

nenhum arquivo é armazenado em base64

nenhuma URL é persistida no banco

o banco salva somente PATH relativo

toda exibição usa URL gerada dinamicamente

arquivos públicos e privados ficam segregados por bucket

todos os módulos seguem o mesmo padrão

não existe arquitetura híbrida

não existe fallback legado incorreto

não existe componente desconectado da arquitetura final

REGRA MÁXIMA
É PROIBIDO:

armazenar arquivos em base64

salvar data URI no banco

persistir URL completa de arquivo

manter data como campo principal de anexos

salvar blob serializado

usar caminho local como persistência definitiva

deixar fallback como storagePath || data

deixar upload “mockado”, incompleto ou sem integração

deixar componente de upload sem uso real

responder apenas com explicação

É OBRIGATÓRIO:

usar Supabase Storage como única origem de arquivos

salvar somente PATH no banco

gerar URL dinamicamente apenas na exibição

separar buckets por responsabilidade

validar arquivos antes do upload

sanitizar nomes dos arquivos

integrar o fluxo nos módulos reais

entregar código e estrutura final coerente

IMPLEMENTAÇÃO OBRIGATÓRIA
1. REMOÇÃO TOTAL DE BASE64

Faça uma varredura completa no projeto e elimine toda arquitetura baseada em base64 para arquivos.

Remova:

FileReader.readAsDataURL(...)

qualquer helper que converta arquivo para base64

qualquer campo data: string usado para persistência de arquivo

qualquer preview definitivo baseado em base64

qualquer mapper que aceite base64 como fallback

qualquer persistência de base64 em estado global, payload, contexto, banco ou sincronização

Regra:

Se houver preview temporário de arquivo local antes do upload, use apenas:

URL.createObjectURL(file)

Mas após persistência:

operar somente com PATH

exibir somente com URL gerada dinamicamente

2. REFAÇA TODAS AS TIPAGENS DE ARQUIVOS

Refatore todas as interfaces, tipos e contratos relacionados a arquivos.

Exigências:

remover qualquer ambiguidade entre arquivo temporário e arquivo persistido

remover data

tornar storagePath obrigatório nos objetos persistidos

diferenciar claramente:

arquivo local ainda não enviado

arquivo persistido no storage

Estrutura esperada:

Crie tipos claros, por exemplo:

LocalUploadFile

StoredFileAttachment

PublicImageAsset

PrivateDocumentAsset

Os nomes podem variar, mas a separação conceitual deve existir.

3. CORRIJA MAPEADORES E SINCRONIZAÇÃO

Corrija todos os mapeadores e contratos com banco/API.

Obrigatório:

storage_path deve receber apenas PATH válido

remover qualquer fallback de base64

remover qualquer reaproveitamento de data

impedir que objeto sem storagePath seja persistido como anexo final

falhar explicitamente se tentarem persistir anexo sem path

Proibido manter:
storage_path: f.storagePath || f.data || ''

Qualquer lógica equivalente deve ser eliminada.

4. CRIE UMA CAMADA CENTRALIZADA DE STORAGE

Implemente uma camada única e reutilizável para todas as operações com arquivos.

Crie um arquivo ou módulo dedicado, como por exemplo:

utils/storage-helper.ts

services/storage.service.ts

ou estrutura equivalente

Essa camada deve centralizar:

Upload:

upload de avatar/logo público

upload de mídia pública

upload de documento privado

upload de anexo privado de chat

URL:

geração de public URL para buckets públicos

geração de signed URL para buckets privados

Segurança/qualidade:

sanitização de nome

validação de tipo MIME

validação de tamanho

definição de bucket/path por categoria

tratamento de erro consistente

5. SEGREGUE OS BUCKETS

Substitua a arquitetura de bucket único por segregação real de responsabilidade.

Implemente buckets equivalentes a:

público para avatars/logos

público para imagens e mídias visuais

privado para documentos sensíveis

privado para anexos de conversa/chat

Os nomes podem seguir padrão do projeto, mas devem refletir claramente a função.

Exemplo conceitual:

ampliemed-public-avatars

ampliemed-public-media

ampliemed-private-documents

ampliemed-private-chat

Regras:

buckets públicos usam getPublicUrl

buckets privados usam createSignedUrl

documentos sensíveis jamais devem ir para bucket público

6. CORRIJA A MODELAGEM DO BANCO

Revise toda persistência relacionada a arquivos e gere migration SQL quando necessário.

Obrigatório:

mudar conceitos errados como logo_url para logo_path

revisar todas as tabelas e colunas relacionadas a arquivos

garantir que colunas persistam apenas PATH

ajustar nomes de colunas quando a semântica estiver errada

preservar integridade com os módulos já existentes

Se necessário:

gere SQL completo de migration para:

renomear coluna

migrar dados

normalizar registros antigos

ajustar constraints

preparar o banco para a nova arquitetura

7. INTEGRE O FLUXO NOS MÓDULOS REAIS

Não deixe nada apenas “pronto para uso”.
Implemente de fato nos módulos do sistema que lidam com arquivos.

Integrar onde fizer sentido, incluindo:

pacientes

exames

prontuários

comunicação/chat

configurações da clínica

avatar/logo

outros pontos onde a auditoria identificou anexos ou mídia

Cada módulo deve seguir o mesmo padrão:

upload

persistência de path

recuperação dinâmica da URL

remoção/substituição quando aplicável

8. CRIE HELPERS E HOOKS DE EXIBIÇÃO

Implemente helpers e hooks reutilizáveis para consumo de arquivos.

Esperado:

getPublicFileUrl(...)

getPrivateFileUrl(...)

useFileUrl(...)

useSignedFileUrl(...)
ou equivalentes

Eles devem:

receber PATH

resolver URL dinamicamente

tratar loading/erro

permitir cache quando fizer sentido

evitar duplicação de lógica entre componentes

9. MELHORE O COMPONENTE DE UPLOAD

Refatore ou recrie o componente de upload para trabalhar corretamente com storage.

O componente final deve:

aceitar seleção e drag & drop

validar tipo e tamanho

sanitizar nome

enviar para o bucket correto

retornar metadados corretos

exibir progresso se possível

permitir preview local temporário sem base64

após upload, operar com storagePath

Não pode:

converter para base64

devolver data como payload principal

manter arquitetura anterior parcialmente

10. GARANTA SEGURANÇA E PERFORMANCE

Implemente boas práticas mínimas reais.

Segurança:

validação client-side

validação server-side

MIME/type allowlist

limites de tamanho por categoria

signed URLs com expiração adequada

separação entre público e privado

Performance:

cache controlado para URLs

evitar recriar signed URL desnecessariamente

uso de hooks/useMemo

evitar chamadas duplicadas

evitar lógica de URL espalhada pelos componentes

FORMA DE ENTREGA OBRIGATÓRIA

Sua resposta deve ser de execução técnica, não de consultoria.

Entregue obrigatoriamente:
1. Lista dos arquivos alterados

Informe todos os arquivos:

criados

modificados

removidos

renomeados

2. Código final

Mostre o código final relevante das partes implementadas:

componente(s) de upload

helpers de storage

hooks de URL

tipagens/interfaces

mapeadores

integração nos módulos

ajustes de backend se necessários

3. Migration SQL

Se houver necessidade de ajuste de banco, entregue o SQL completo.

4. Explicação objetiva do que foi corrigido

Explique, de forma técnica e direta:

o que foi removido

o que foi criado

o que foi padronizado

como a arquitetura final passou a funcionar

5. Verificação final obrigatória

Responda explicitamente ao final:

base64 foi totalmente removido da arquitetura?

o banco agora salva somente PATH?

URLs deixaram de ser persistidas?

buckets públicos e privados foram segregados?

arquivos privados usam signed URL?

arquivos públicos usam public URL?

os módulos reais foram integrados?

o sistema agora está pronto para produção nessa parte?

RESTRIÇÕES DE RESPOSTA
NÃO FAÇA:

não responda com “recomendo”

não responda com “seria ideal”

não responda só com auditoria

não responda só com plano

não responda só com pseudocódigo

não deixe partes “para implementar depois”

não preserve compatibilidade híbrida com base64

não mantenha nomes/contratos errados por conveniência

FAÇA:

aplique a refatoração

gere os arquivos necessários

gere as migrations necessárias

finalize com arquitetura consistente

RESULTADO FINAL ESPERADO

Ao terminar, o sistema deve ficar com esta arquitetura final:

Supabase Storage como única camada de arquivos

banco armazenando apenas PATH

URL gerada dinamicamente apenas na exibição

sem base64

sem URL persistida

com buckets segregados

com upload padronizado

com helpers centralizados

com módulos integrados

com segurança e performance adequadas

pronto para produção