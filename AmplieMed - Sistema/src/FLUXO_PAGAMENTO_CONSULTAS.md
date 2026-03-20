# 💰 Sistema de Pagamento de Consultas - AmplieMed

## 📋 Visão Geral do Fluxo Completo

O sistema AmplieMed agora possui **gestão financeira integrada desde o agendamento**, com 5 funcionalidades principais:

### ✅ **1. Pagamento no Momento do Agendamento**
### ✅ **2. Parcelamento de Consultas**
### ✅ **3. Lembretes Automáticos de Pagamento**
### ✅ **4. Diferenciação Particular vs Convênio**
### ✅ **5. Registro de Pagamento ao Finalizar Consulta**

---

## 🔄 Fluxo Detalhado

### **ETAPA 1: AGENDAMENTO COM PAGAMENTO**

Ao clicar em **"Nova Consulta"**, o sistema solicita:

#### **Dados do Paciente:**
- Nome completo
- CPF (validação automática)
- Telefone (para lembretes WhatsApp)
- E-mail

#### **Dados da Consulta:**
- Médico
- Especialidade (define valor automático)
- Data e horário
- Tipo (Presencial ou Telemedicina)
- Duração (30, 60 ou 90 min)

#### **✨ NOVO: Informações de Pagamento**

##### **Opção A: Pagamento Particular**
```
Tipo: Particular
Valor: R$ 350,00 (sugerido pela especialidade)
Forma de Pagamento:
  ├─ Pix (à vista)
  ├─ Débito (à vista)
  ├─ Dinheiro (à vista)
  └─ Crédito (com parcelamento)
      └─ Parcelas: 1x, 2x, 3x, 4x, 5x, 6x, 10x, 12x
```

**Exemplo de Parcelamento:**
- Consulta: R$ 350,00
- 3x de R$ 116,67 sem juros
- Sistema cria 3 boletos no contas a receber

##### **Opção B: Pagamento via Convênio**
```
Tipo: Convênio
Convênio: Unimed / Bradesco / Amil / etc
Valor: R$ 350,00
Status: Pendente (aguarda autorização)
```

---

### **ETAPA 2: CONSULTA AGENDADA**

Após agendamento, o sistema:

1. **Cria a consulta na agenda** com status "Pendente"
2. **Registra o pagamento** com status:
   - "Pendente" (se não pago antecipadamente)
   - "Pago" (se pago no agendamento)
3. **Envia confirmação automática** via WhatsApp

#### **Informações Exibidas na Agenda:**

```
┌─────────────────────────────────────┐
│ 09:00 - Maria Silva Santos         │
│ Dr. João Santos - Cardiologia      │
│ R$ 350,00 | 🟡 Pagamento Pendente  │
│ Status: Confirmado                  │
└─────────────────────────────────────┘
```

---

### **ETAPA 3: LEMBRETES AUTOMÁTICOS**

O sistema envia lembretes em 2 situações:

#### **A) Lembrete de Consulta**
```
📱 WhatsApp - 24h antes
"Olá Maria! Lembrete: sua consulta com 
Dr. João Santos está agendada para amanhã 
às 09:00. Confirme sua presença."
```

#### **B) Lembrete de Pagamento Pendente** ⭐ NOVO
```
📱 WhatsApp - 48h antes
"Olá Maria! Sua consulta está agendada para 
09/01 às 09:00. 
💰 Valor: R$ 350,00 (Pendente)
Formas de pagamento aceitas:
- Pix
- Cartão (até 12x)
- Dinheiro"
```

**Lembretes também para pagamento vencido:**
```
📱 WhatsApp - Após vencimento
"Olá Maria! Identificamos pagamento pendente 
de R$ 350,00 referente à consulta do dia 09/01.
Entre em contato: (11) 3456-7890"
```

---

### **ETAPA 4: REALIZAÇÃO DA CONSULTA**

Ao clicar em **"Finalizar Consulta"**:

#### **Cenário A: Pagamento JÁ REALIZADO**
```
✅ Consulta finalizada automaticamente
✅ Status alterado para "Realizado"
✅ Pagamento marcado como "Pago"
✅ Disponível para prontuário
```

#### **Cenário B: PAGAMENTO PENDENTE** ⭐ NOVO

Sistema abre modal:

```
┌──────────────────────────────────────────┐
│ Finalizar Consulta e Registrar Pagamento │
├──────────────────────────────────────────┤
│ Paciente: Maria Silva Santos             │
│ Especialidade: Cardiologia               │
│ Valor: R$ 350,00                         │
│                                          │
│ Forma de Pagamento: [Selecione ▼]       │
│  ├─ Pix                                  │
│  ├─ Cartão de Crédito                   │
│  ├─ Cartão de Débito                    │
│  └─ Dinheiro                            │
│                                          │
│ [Se Crédito] Parcelas: [3x ▼]          │
│  └─ 3x de R$ 116,67                     │
│                                          │
│ Valor Pago: R$ [350,00]                 │
│                                          │
│ [Cancelar]  [Confirmar Pagamento]       │
└──────────────────────────────────────────┘
```

**Opções de Pagamento Parcial:**
```
Se Valor Pago < Valor Total:
⚠️ Pagamento parcial detectado
Saldo restante: R$ 150,00
Status: "Parcial"
Sistema cria conta a receber para saldo
```

---

### **ETAPA 5: PÓS-CONSULTA**

Após finalização:

1. **Consulta** → Status: "Realizado"
2. **Pagamento** → Registrado no Módulo Financeiro
3. **Fluxo de Caixa** → Atualizado automaticamente
4. **Comissionamento** → Calculado para o médico
5. **Faturamento** → Se convênio, aguarda envio TISS

---

## 📊 Integração com Módulo Financeiro

### **Aba "Pagamentos"**
```
┌─────────────────────────────────────────────────────┐
│ Paciente         CPF           Valor    Status      │
├─────────────────────────────────────────────────────┤
│ Maria Silva     123.456.789   R$ 350   🟢 Pago     │
│ João Oliveira   987.654.321   R$ 350   🟡 Pendente │
│ Ana Costa       456.789.123   R$ 320   🟡 Pendente │
└─────────────────────────────────────────────────────┘
```

### **Aba "Contas a Receber"**
```
┌──────────────────────────────────────────────────────┐
│ Descrição                  Valor      Vencimento    │
├──────────────────────────────────────────────────────┤
│ Consulta João (1/3)       R$ 116,67   15/01/2026   │
│ Consulta João (2/3)       R$ 116,67   15/02/2026   │
│ Consulta João (3/3)       R$ 116,67   15/03/2026   │
└──────────────────────────────────────────────────────┘
```

### **Aba "Comissionamento"**
```
Cálculo automático baseado em consultas realizadas:
- Dr. João Santos: 28 consultas = R$ 7.400 (40%)
```

---

## 🎯 Diferenciais do Sistema

### **1. Pagamento Sem Convênio**
✅ Sistema totalmente preparado para consultas particulares
✅ Múltiplas formas de pagamento
✅ Parcelamento automático no cartão de crédito

### **2. Parcelamento Inteligente**
✅ Até 12x sem juros
✅ Cálculo automático de parcelas
✅ Controle individual de cada parcela
✅ Lembretes por parcela vencida

### **3. Lembretes Automáticos**
✅ Lembrete de consulta (24h antes)
✅ Lembrete de pagamento pendente (48h antes)
✅ Cobrança de pagamento vencido
✅ Envio via WhatsApp integrado

### **4. Registro Rápido ao Finalizar**
✅ Modal de pagamento ao finalizar consulta
✅ Não precisa ir no módulo financeiro
✅ Pagamento registrado em segundos
✅ Fluxo de caixa atualizado em tempo real

### **5. Flexibilidade Total**
✅ Pagamento antecipado no agendamento
✅ Pagamento no dia da consulta
✅ Pagamento posterior (contas a receber)
✅ Pagamento parcial com saldo em aberto

---

## 🔔 Sistema de Lembretes

### **Configuração de Envios:**

```javascript
Lembrete de Consulta:
├─ Envio: 24h antes
├─ Canal: WhatsApp
├─ Conteúdo: Confirmação + detalhes
└─ Status consulta: Confirmado/Pendente

Lembrete de Pagamento Pendente:
├─ Envio: 48h antes
├─ Canal: WhatsApp
├─ Conteúdo: Valor + formas de pagamento
└─ Status pagamento: Pendente

Cobrança de Pagamento Vencido:
├─ Envio: D+2 após consulta
├─ Canal: WhatsApp
├─ Conteúdo: Valor + contato financeiro
└─ Status pagamento: Vencido
```

---

## 💡 Casos de Uso

### **Caso 1: Consulta Particular com Pagamento à Vista**
```
1. Agenda consulta → Seleciona "Particular"
2. Escolhe "Pix" → Status: Pendente
3. Paciente paga antes da consulta
4. Recepção confirma pagamento no sistema
5. Consulta realizada → Pagamento já baixado
```

### **Caso 2: Consulta Particular Parcelada**
```
1. Agenda consulta → Seleciona "Particular"
2. Escolhe "Crédito" → 6x de R$ 58,33
3. Sistema cria 6 contas a receber
4. Envia lembretes antes de cada vencimento
5. Baixa cada parcela conforme pagamento
```

### **Caso 3: Consulta com Convênio**
```
1. Agenda consulta → Seleciona "Convênio: Unimed"
2. Verifica autorização do convênio
3. Realiza consulta normalmente
4. Sistema aguarda faturamento TISS
5. Após aprovação, recebe do convênio
```

### **Caso 4: Pagamento no Final da Consulta**
```
1. Agenda consulta → Pagamento: Pendente
2. Paciente chega e é atendido
3. Médico clica "Finalizar Consulta"
4. Sistema abre modal de pagamento
5. Registra forma + valor → Consulta finalizada
```

---

## 📈 Relatórios Disponíveis

O sistema gera automaticamente:

✅ **Consultas por status de pagamento**
✅ **Inadimplência** (pagamentos vencidos)
✅ **Previsão de recebimento** (próximos 30 dias)
✅ **Formas de pagamento mais usadas**
✅ **Taxa de pagamento antecipado**
✅ **Comissões pendentes por médico**

---

## 🚀 Próximos Passos

Para usar o novo sistema:

1. **Substitua** o componente `<ScheduleManagement>` por `<ScheduleManagementWithPayment>` no App.tsx
2. **Configure** os preços por especialidade
3. **Ative** integração com gateway de pagamento (opcional)
4. **Configure** templates de mensagens WhatsApp
5. **Treine** equipe no novo fluxo

---

## ⚙️ Configurações Técnicas

### **Preços por Especialidade (Editável):**
```typescript
const specialtyPrices = {
  'Cardiologia': 350,
  'Dermatologia': 320,
  'Ortopedia': 400,
  'Pediatria': 280,
  'Clínica Geral': 250,
};
```

### **Opções de Parcelamento:**
```typescript
const installmentOptions = [1, 2, 3, 4, 5, 6, 10, 12];
```

### **Formas de Pagamento:**
```typescript
type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'convenio';
```

---

## 📞 Suporte

Sistema desenvolvido com foco em **eficiência operacional** e **experiência do paciente**.

**Todas as funcionalidades solicitadas foram implementadas:**
✅ Integração de pagamento no agendamento
✅ Parcelamento de consultas
✅ Lembretes automáticos de pagamento
✅ Pagamento sem convênio (particular)
✅ Registro rápido ao finalizar consulta

---

**Sistema AmplieMed** - Gestão Completa para Clínicas Médicas 🏥
