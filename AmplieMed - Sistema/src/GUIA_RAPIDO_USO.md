# 🚀 GUIA RÁPIDO DE USO - SISTEMA MULTI-MÉDICO

## 📱 ACESSO RÁPIDO AOS MÓDULOS

### **1. Gestão de Médicos**
```typescript
setCurrentModule('doctors')
```
**Ou pelo menu:** Profissionais → Médicos

**O que você pode fazer:**
- ✅ Visualizar todos os médicos
- ✅ Ver performance em tempo real
- ✅ Filtrar por clínica, especialidade, status
- ✅ Ver detalhes completos (agenda, clínicas, honorários)
- ✅ Ver metas e projeções

---

### **2. Agendar Consulta com Médico**
```typescript
setCurrentModule('schedule')
// Clique em "Nova Consulta"
```

**Passo a passo:**
1. Preencha dados do paciente
2. **Selecione a clínica**
3. **Selecione o médico** (aparece apenas médicos daquela clínica)
4. **Selecione a especialidade** (apenas as que o médico atende)
5. **Selecione a data**
6. **Selecione o horário** (apenas horários que o médico atende)
7. Preencha dados de pagamento
8. Clique em "Agendar Consulta"

**Sistema valida automaticamente:**
- ⚠️ Médico não atende naquele dia
- ⚠️ Médico está em férias/folga
- ⚠️ Horário já ocupado
- ⚠️ Clínica fechada

---

### **3. Fila de Espera**
```typescript
setCurrentModule('queue')
```

**Informações exibidas:**
- 👤 Nome do paciente
- 🩺 **Médico responsável + CRM**
- 🏥 Especialidade
- 🚪 Sala de atendimento
- ⏱️ Tempo de espera

**Ao iniciar atendimento:**
- Sistema abre prontuário **já com dados do médico**
- Médico, CRM e especialidade aparecem no cabeçalho

---

### **4. Prontuário Eletrônico**
```typescript
// Abre automaticamente pela fila
// Ou acesse:
setCurrentModule('electronic-record')
```

**Cabeçalho mostra:**
```
Atendimento Médico
João Silva Santos • 45 anos • 123.456.789-00
🩺 Dr. Carlos Alberto Mendes • CRM 123456/SP • Cardiologia
```

**Ao finalizar:**
```
✅ Consulta finalizada com sucesso!

Médico: Dr. Carlos Alberto Mendes
CRM: 123456/SP
Prontuário assinado digitalmente.
```

**Dados salvos incluem:**
- Médico que atendeu (ID, nome, CRM, especialidade)
- Data e hora
- Todos os dados clínicos
- Procedimentos realizados

---

### **5. Relatório Financeiro por Médico**
```typescript
setCurrentModule('doctor-financial')
```

**Filtros disponíveis:**
- 🩺 Médico específico ou todos
- 🏥 Clínica específica ou todas
- 📅 Mês/Ano

**O que você vê:**

**📊 Cards Resumo:**
- Faturamento Total
- Recebido (pago)
- Pendente
- Cancelado

**📋 Tabela por Médico:**
- Nome e CRM
- Consultas realizadas
- Faturamento gerado
- **Honorários calculados** (conforme modelo de pagamento)
- **Margem da clínica** (lucro/prejuízo)
- % de margem (verde/amarelo/vermelho)

**📄 Detalhamento:**
- Lista todos os procedimentos
- Mostra paciente, médico, clínica, valor, status

**📥 Exportação:**
- Botão "Exportar PDF" (mock)
- Botão "Imprimir"

---

## 🔍 COMO BUSCAR INFORMAÇÕES

### **Buscar médico específico:**
```
Gestão de Médicos → Campo de busca
Digite: nome, CRM ou e-mail
```

### **Ver agenda de um médico:**
```
Gestão de Médicos → Detalhes do médico → Aba "Agenda Semanal"
```

### **Ver médicos de uma clínica:**
```
Gestão de Médicos → Filtro "Clínica" → Selecione
```

### **Ver consultas de um médico:**
```
Relatório Financeiro → Filtro "Médico" → Selecione
```

---

## 💰 COMO FUNCIONAM OS HONORÁRIOS

### **Modelo Fixo:**
```
Dr. X recebe R$ 15.000/mês
Não importa quantas consultas fizer
```

### **Modelo Percentual:**
```
Dra. Y recebe 40% do faturamento
Consulta R$ 280 → Honorário R$ 112 (40%)
```

### **Modelo Por Procedimento:**
```
Dr. Z tem tabela específica:
- Consulta (TUSS 10101012) → R$ 250
- Infiltração (TUSS 30606012) → R$ 300
```

### **Modelo Misto:**
```
Dr. W recebe:
- R$ 15.000 fixo +
- 30% dos procedimentos +
- R$ 200 por consulta específica
```

**Sistema calcula automaticamente no relatório!**

---

## 📊 EXEMPLO DE FLUXO COMPLETO

### **Cenário: Paciente agendando com Dr. Carlos**

**1. Agendamento (14:00):**
```
Recepcionista:
1. Nova Consulta
2. Preenche: João Silva Santos, CPF, telefone
3. Seleciona: AmplieMed - Unidade Paulista
4. Seleciona: Dr. Carlos Alberto Mendes
5. Especialidade: Cardiologia (única opção dele)
6. Data: Segunda 13/01/2026
7. Horário: 09:00 (sistema mostra disponíveis)
8. Tipo: Presencial
9. Sala: Consultório 3 (já sugere a sala dele)
10. Pagamento: Particular, R$ 350, Pix
11. Agendar ✅
```

**2. Chegada (08:55):**
```
Recepcionista:
1. Paciente chega
2. Fila de Espera → Adiciona João
3. Sistema mostra:
   📋 A047 - João Silva Santos
   🩺 Dr. Carlos Alberto Mendes (CRM 123456/SP)
   🏥 Cardiologia
   🚪 Consultório 3
```

**3. Atendimento (09:00):**
```
Recepcionista clica "Iniciar Atendimento"
  ↓
Prontuário abre com:
  Atendimento Médico
  João Silva Santos • 45 anos • 123.456.789-00
  🩺 Dr. Carlos Alberto Mendes • CRM 123456/SP • Cardiologia
  ↓
Dr. Carlos preenche:
  - Anamnese
  - Sinais vitais
  - Diagnóstico: CID I10 (Hipertensão essencial)
  - Receita: Losartana 50mg
  - Exames: Hemograma, Glicemia
  - Procedimentos: Consulta (TUSS 10101012) R$ 350
  ↓
Finaliza consulta ✅
```

**4. Faturamento (15:00):**
```
Financeiro:
1. Relatório Financeiro - Médicos
2. Filtro: Dr. Carlos | Janeiro/2026
3. Sistema mostra:
   Consultas: 1
   Faturamento: R$ 350,00
   Honorários: R$ 15.200,00 (R$ 15k fixo + R$ 200 consulta)
   Margem: -R$ 14.850,00
   % Margem: -4242% (vermelho)
   
   ⚠️ Nota: Prejuízo normal para modelo misto com salário alto
```

---

## 🎯 DICAS E TRUQUES

### **Agilizar Agendamento:**
```
1. Mantenha clínicas cadastradas
2. Médicos vinculados às clínicas
3. Escalas atualizadas
4. Use sala sugerida automaticamente
```

### **Evitar Conflitos:**
```
1. Marque férias/folgas no sistema
2. Sistema bloqueia automaticamente
3. Nenhuma consulta será agendada
```

### **Otimizar Relatórios:**
```
1. Filtre por período específico
2. Exporte PDF mensalmente
3. Envie para contador
4. Acompanhe margem por médico
```

### **Melhorar Performance:**
```
1. Defina metas realistas
2. Acompanhe projeção
3. Ajuste escala conforme demanda
4. Monitore satisfação dos pacientes
```

---

## ❓ PERGUNTAS FREQUENTES

**P: Como adicionar um novo médico?**
R: Gestão de Médicos → "Novo Médico" (em desenvolvimento)

**P: Médico pode atender em várias clínicas?**
R: ✅ Sim! Ao cadastrar, vincule a todas as clínicas necessárias

**P: Como mudar a escala de um médico?**
R: Gestão de Médicos → Detalhes → Editar (em desenvolvimento)

**P: Honorário está errado, como ajustar?**
R: Gestão de Médicos → Detalhes → Aba "Modelo de Pagamento"

**P: Posso ver consultas de todos os médicos?**
R: ✅ Sim! Relatório Financeiro → Filtro "Todos os médicos"

**P: Como exportar para Excel?**
R: Use "Exportar PDF" e converta, ou aguarde feature Excel

**P: Sistema calcula imposto?**
R: ❌ Não. Apenas honorários brutos. Consulte contador.

**P: Como saber se médico está disponível?**
R: Ao agendar, sistema mostra apenas horários disponíveis

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### **Nenhum médico aparece ao agendar:**
```
✅ Verifique se selecionou a clínica
✅ Verifique se há médicos vinculados àquela clínica
✅ Verifique status dos médicos (devem estar "ativos")
```

### **Nenhum horário disponível:**
```
✅ Médico pode não atender naquele dia da semana
✅ Médico pode estar em férias/folga
✅ Todos os horários podem estar ocupados
✅ Clínica pode estar fechada
```

### **Relatório sem dados:**
```
✅ Verifique filtro de período
✅ Verifique se há consultas no mês selecionado
✅ Verifique filtro de médico/clínica
```

### **Honorário calculado zerado:**
```
✅ Verifique modelo de pagamento do médico
✅ Modelo "fixo" não calcula por procedimento
✅ Verifique se procedimento tem código TUSS correto
```

---

## 🔐 CONTROLE DE ACESSO

### **Admin:**
✅ Vê todos os médicos
✅ Edita todos os dados
✅ Acessa todos os relatórios financeiros
✅ Vê honorários de todos

### **Médico:**
✅ Vê apenas seus próprios dados
✅ Vê apenas suas consultas
❌ Não vê honorários de outros
❌ Não vê relatório financeiro geral

### **Recepcionista:**
✅ Agenda consultas
✅ Gerencia fila
✅ Vê lista de médicos (para agendar)
❌ Não vê honorários
❌ Não vê relatórios financeiros

### **Financeiro:**
✅ Vê todos os relatórios
✅ Vê honorários de todos
✅ Exporta relatórios
❌ Não agenda consultas
❌ Não edita médicos

---

## 📞 SUPORTE

Dúvidas sobre o sistema?
- 📧 Email: suporte@ampliemed.com.br (mock)
- 📱 WhatsApp: (11) 98765-4321 (mock)
- 🌐 Documentação: `/SISTEMA_MULTI_MEDICO.md`
- 📝 Atualizações: `/ATUALIZACOES_MULTI_MEDICO.md`

---

**AmplieMed** - Sistema completo de gestão clínica multi-médico 🚀
