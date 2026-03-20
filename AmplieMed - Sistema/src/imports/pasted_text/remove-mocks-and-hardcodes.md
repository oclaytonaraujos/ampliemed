Perfeito. Agora não quero mais auditoria.

Sua nova missão é ELIMINAR de vez os mocks, placeholders, hardcodes e simulações identificados no relatório, implementando as correções reais diretamente no código.

Objetivo:
deixar o sistema funcional, com dados reais vindos do AppContext/Supabase, sem dependência de dados fictícios.

Regras obrigatórias:
- execute as correções no código, não apenas descreva
- altere os arquivos necessários
- preserve o layout e a UX atual sempre que possível
- não crie novos mocks para “quebrar galho”
- não deixe TODO, FIXME, placeholder ou comentário de integração futura
- quando faltar dado real, exiba EmptyState real e coerente
- quando faltar estrutura de banco, gere a migration SQL correspondente
- ao final de cada etapa, mostre exatamente:
  1. arquivos alterados
  2. o que foi removido
  3. o que foi conectado ao AppContext/Supabase
  4. migrations SQL criadas
  5. riscos ou pendências restantes

Ordem obrigatória de execução:

FASE 1 — CRÍTICOS
1. Corrigir ElectronicMedicalRecord.tsx
   - remover prescrição hardcoded inicial
   - remover evoluções fictícias
   - carregar evoluções reais de medicalRecords[] por paciente
   - prescriptions deve iniciar como array vazio

2. Corrigir PatientDetailView.tsx
   - substituir appointmentHistory = []
   - substituir financialHistory = []
   - substituir activityLog = []
   - integrar com appointments[], financialPayments[] e auditLog[] do AppContext
   - calcular totalPaid com dados reais

3. Corrigir DoctorManagement.tsx
   - remover dependência de doctorsDatabase.ts e clinicsDatabase.ts
   - usar professionals[] do AppContext como fonte principal
   - adaptar filtros, cards, exportação e ações
   - substituir ação simulada de exclusão/desativação por persistência real
   - se necessário, converter a tipagem Doctor para Professional

4. Planejar e implementar a base mínima do PatientPortal.tsx
   - conectar ao AppContext
   - identificar paciente autenticado
   - carregar appointments, medicalRecords e financialPayments reais
   - se a role patient ainda não existir, implementar a estrutura mínima necessária
   - se precisar, gerar migration SQL e ajustes de tipos

FASE 2 — ALTOS
5. Corrigir RecentActions.tsx
   - usar auditLog[] do AppContext
   - mostrar últimas ações reais do usuário atual

6. Corrigir TelemedicineModule.tsx
   - remover domínio fictício meet.ampliemed.com
   - usar URL funcional real
   - solução temporária aceitável: Jitsi Meet
   - preferencialmente usar configuração em clinicSettings

7. Corrigir CommunicationModule.tsx
   - remover campanhas hardcoded do estado inicial
   - persistir campanhas no AppContext/Supabase
   - remover cálculo simulado totalSent * 2
   - usar mensagens/campanhas reais

8. Corrigir DoctorFinancialReport.tsx
   - remover fallback clinicId: 'clinic-1'
   - remover TUSS fixo para todos os atendimentos
   - adicionar estrutura correta para tussCode
   - se necessário, gerar migration SQL e atualizar interfaces

9. Corrigir ClinicSelector.tsx
   - conectar ao AppContext
   - usar clinicSettings e selectedClinicId
   - se multi-clínica ainda não existir, deixar comportamento coerente com modo mono-clínica real
   - não usar array vazio local como fonte

FASE 3 — MÉDIOS
10. Corrigir Dashboard.tsx
   - substituir despesas: 0
   - substituir faltas: 0
   - calcular ambos com dados reais

11. Corrigir ReportsModule.tsx
   - remover range fixo 2026-01-01 / 2026-03-31
   - usar período dinâmico atual

12. Corrigir AppContext.tsx
   - remover defaults enganosos em clinic settings
   - evitar nome da clínica hardcoded como “AmplieMed” em produção real
   - corrigir defaults de templates/protocolos com IDs estáveis ou empty state real

13. Corrigir FinancialModule.tsx
   - remover arrays vazios permanentes para comissões e glosas
   - se não houver backend pronto, exibir empty state honesto
   - se houver estrutura necessária, implementar com dados reais
   - gerar migration SQL se preciso

FASE 4 — LIMPEZA TÉCNICA
14. Remover resíduos e hardcodes restantes
   - showSuccess noop
   - crmUf padrão “SP”
   - fallback arbitrário de honorário
   - comentários enganosos como “PDF simulado”
   - qualquer nomenclatura mock* que hoje esteja em produção

Importante:
- execute fase por fase
- não pare no meio
- não volte a gerar apenas relatório
- faça as alterações reais
- quando uma correção depender de migration SQL, gere o arquivo SQL completo e diga em qual ordem aplicar
- se uma correção exigir refatoração maior, implemente a versão mínima funcional imediatamente, sem deixar o componente quebrado

Entrega esperada:
- código corrigido
- migrations SQL necessárias
- lista final dos mocks eliminados
- lista curta do que ainda dependeria de decisão de produto, se houver