Realize uma auditoria completa, profunda e exaustiva em todo o sistema para verificar como imagens, documentos e demais arquivos estão sendo tratados, armazenados, recuperados e exibidos.

A investigação deve cobrir 100% do código, fluxos, integrações, componentes, hooks, serviços, utilitários, helpers, páginas, telas, APIs, banco de dados e regras de armazenamento, sem encerrar a análise antes de concluir toda a varredura.

Objetivos da auditoria

Verifique detalhadamente se todos os arquivos criados, enviados, manipulados ou gerenciados pelo sistema estão seguindo uma arquitetura correta de armazenamento baseada em Supabase Storage, obedecendo obrigatoriamente às seguintes regras:

Regras obrigatórias

Todo arquivo deve ser armazenado no Supabase Storage.

Nenhum arquivo pode ser armazenado em base64, seja em banco, estado local, cache persistente, localStorage, sessionStorage, IndexedDB, JSON, mocks, seeds, variáveis temporárias persistidas ou qualquer outra estrutura.

Nenhuma URL de arquivo deve ser persistida no banco de dados.

No banco de dados deve ser salvo somente o PATH relativo do arquivo dentro do bucket.

Toda exibição de arquivo/imagem deve ocorrer via URL gerada dinamicamente a partir do PATH.

Buckets públicos devem usar getPublicUrl(path).

Buckets privados devem usar createSignedUrl(path, tempo_de_expiração).

O sistema não deve manter lógica híbrida entre base64, arquivo local, URL persistida e Supabase Storage. A arquitetura deve ser única, consistente e padronizada.

Todo upload deve passar por validação de tipo MIME, extensão e tamanho antes do envio.

Todo nome de arquivo deve ser sanitizado para evitar caracteres inválidos, inconsistências e riscos de segurança.

O que deve ser verificado

Faça uma varredura completa e comprove, ponto a ponto:

1. Origem e destino dos arquivos

Onde arquivos são selecionados, gerados, anexados, editados ou enviados

Quais módulos manipulam imagens, PDFs, documentos, anexos, logos, avatars, comprovantes, contratos, arquivos de chat, uploads múltiplos e quaisquer outros tipos de arquivo

Se há qualquer fluxo salvando arquivos fora do Supabase Storage

2. Upload de arquivos

Todas as funções de upload existentes

Se usam corretamente supabase.storage.from(bucket).upload(path, file)

Se retornam apenas o PATH

Se em algum ponto retornam, persistem ou reutilizam base64

Se existe fallback incorreto para armazenamento local ou estruturas temporárias persistidas

3. Persistência no banco

Verifique todas as tabelas, colunas, models, tipos, interfaces e payloads relacionados a arquivos

Confirme se o banco armazena apenas PATH relativo

Identifique qualquer coluna salvando:

base64

blob serializado

data URI

URL completa

caminho absoluto indevido

objeto de arquivo serializado

4. Exibição e consumo

Verifique todos os componentes e telas que exibem arquivos

Confirme se recebem PATH e convertem dinamicamente para URL

Verifique se há helpers centralizados para conversão PATH → URL

Identifique qualquer componente usando diretamente:

base64

URL persistida

caminho local

arquivo mockado

asset salvo fora do fluxo do Supabase

5. Arquitetura de buckets

Valide se a arquitetura do sistema segue um modelo organizado por responsabilidade, com separação entre arquivos públicos e privados, mantendo coerência arquitetural.

A auditoria deve avaliar se o sistema adota uma estrutura equivalente a esta lógica arquitetural:

bucket público para avatares/logos/imagens públicas

bucket público para imagens operacionais/postagens/imagens de módulos visuais

bucket privado para documentos sensíveis

bucket privado para anexos de conversa/chat/mensagens

Não é necessário que os nomes sejam idênticos, mas a arquitetura deve ser equivalente em organização, segurança e finalidade.

6. Segurança e privacidade

Verifique se documentos sensíveis estão em bucket privado

Verifique se signed URLs possuem expiração apropriada

Verifique se arquivos públicos não estão sendo expostos indevidamente

Verifique se há falhas de acesso, políticas abertas demais ou ausência de segregação entre arquivos públicos e privados

7. Padronização e consistência

Verifique se todos os módulos seguem o mesmo padrão arquitetural

Aponte inconsistências entre telas, serviços e helpers

Identifique módulos legados ou parcialmente migrados

Identifique qualquer uso misto entre arquitetura correta e soluções improvisadas

8. Compatibilidade e legado

Verifique se existem tratamentos para dados antigos, como:

URLs completas já salvas

caminhos com prefixos duplicados

arquivos mockados

base64 legado

Avalie se há compatibilidade segura sem comprometer a arquitetura correta atual

9. Performance e boas práticas

Verifique existência de cache controlado para URLs públicas quando fizer sentido

Verifique uso de useMemo, helpers centralizados ou abstrações equivalentes para evitar recálculo desnecessário

Verifique duplicidade de lógica entre componentes

10. Remoção de irregularidades

Identifique exatamente onde existem problemas como:

base64 armazenado

URL persistida no banco

armazenamento local indevido

arquivos fora do Supabase Storage

helpers ausentes

buckets incorretos

falta de validação

exposição indevida de arquivos privados

Critério de comparação arquitetural

A análise também deve verificar se o sistema está implementado com o mesmo nível de solidez de uma arquitetura ideal baseada nestes princípios:

banco guarda apenas PATH

URL nunca é persistida

arquivos públicos e privados são separados por bucket

upload é centralizado por helper/função utilitária

exibição converte PATH para URL dinamicamente

documentos privados usam signed URL temporária

imagens públicas usam public URL

não existe base64 persistido

há validação, sanitização, compatibilidade com legado e consistência entre módulos

Entrega obrigatória da auditoria

Ao final, entregue um relatório completo, técnico e objetivo, contendo:

A. Mapeamento completo

Todos os pontos do sistema que manipulam arquivos

Todos os buckets identificados

Todas as tabelas/colunas relacionadas

Todas as funções/helpers/componentes envolvidos

B. Diagnóstico

Classifique cada parte como:

Correto

Parcialmente correto

Incorreto

Não implementado

Precisa refatoração

C. Evidências

Para cada problema encontrado, mostre:

arquivo

função

componente

trecho responsável

motivo técnico do problema

impacto gerado

D. Lacunas arquiteturais

Explique claramente o que falta para que o sistema fique 100% aderente ao padrão esperado.

E. Plano de correção

Forneça uma lista priorizada com:

problemas críticos

problemas médios

melhorias recomendadas

F. Conclusão final obrigatória

Responda explicitamente:

O sistema armazena 100% dos arquivos no Supabase Storage?

O sistema evita totalmente base64?

O banco salva somente PATH, sem URL persistida?

A exibição é feita 100% via URL dinâmica?

A arquitetura atual está sólida, consistente e padronizada?

O sistema possui uma arquitetura de gestão de imagens e arquivos no mesmo nível de robustez esperado?

Regra final de execução

Não encerre a análise com suposições.
Não conclua antes de investigar 100% do sistema.
Não dê resposta genérica.
A resposta final deve ser baseada em verificação real, completa e detalhada de toda a base do projeto.