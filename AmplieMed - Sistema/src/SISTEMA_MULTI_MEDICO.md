# 🏥 SISTEMA MULTI-MÉDICO E MULTI-CLÍNICA - AmplieMed

## ✅ IMPLEMENTAÇÃO COMPLETA - OPÇÃO 3 AVANÇADA

---

## 🎯 O QUE FOI IMPLEMENTADO

### **GESTÃO COMPLETA DE MÚLTIPLOS MÉDICOS**
O sistema agora suporta **gestão avançada multi-clínica** com todas as funcionalidades solicitadas:

✅ **Cadastro completo de médicos**  
✅ **Múltiplas clínicas por médico**  
✅ **Agenda individualizada por clínica**  
✅ **Escalas e horários personalizados**  
✅ **Honorários por procedimento**  
✅ **Relatórios e produtividade**  
✅ **Metas e KPIs individuais**  
✅ **Controle de acesso por médico**  
✅ **Certificados digitais ICP-Brasil individuais**  
✅ **Gestão de folgas e férias**  

---

## 📦 ARQUIVOS CRIADOS

### 1. **`/data/doctorsDatabase.ts`** - Base de Dados de Médicos

#### **Estrutura Doctor:**
```typescript
interface Doctor {
  id: string;
  personalInfo: {
    name: string;
    cpf: string;
    birthDate: string;
    gender: 'M' | 'F' | 'Outro';
    photo?: string;
  };
  professionalInfo: {
    crm: string;
    crmUf: string;
    registroANS: string;
    specialties: string[];
    subspecialties?: string[];
    rqe?: string;
  };
  contact: {
    email: string;
    phone: string;
    cellphone: string;
    address: {...};
  };
  digitalCertificate: {
    type: 'A1' | 'A3';
    issuer: string;
    validUntil: string;
    serialNumber: string;
  };
  clinics: DoctorClinicAssignment[]; // MÚLTIPLAS CLÍNICAS
  workSchedule: WorkSchedule[]; // ESCALAS POR CLÍNICA
  financialInfo: {
    paymentModel: 'fixed' | 'percentage' | 'procedure' | 'mixed';
    fixedSalary?: number;
    percentage?: number;
    procedureValues?: ProcedureHonorarium[];
  };
  performance: {
    goals: {
      monthlyConsultations?: number;
      monthlyRevenue?: number;
      patientSatisfaction?: number;
    };
    current: {
      consultationsThisMonth: number;
      revenueThisMonth: number;
      averageSatisfaction: number;
      averageConsultationTime: number;
    };
  };
  status: 'active' | 'inactive' | 'vacation' | 'suspended';
}
```

#### **Médicos Mock Cadastrados:**
1. **Dr. Carlos Alberto Mendes** - Cardiologia
   - CRM 123456/SP
   - Trabalha em 2 clínicas (Paulista como sócio, Moema como funcionário)
   - Modelo misto: R$ 15k fixo + 30% + honorários por procedimento
   - Agenda: Segunda e Quarta na Paulista, Terça e Quinta em Moema
   - Performance: 98 consultas, R$ 42.350, 4.7⭐

2. **Dra. Ana Paula Silva** - Pediatria/Neonatologia
   - CRM 234567/SP
   - Trabalha em 1 clínica (Paulista como funcionária)
   - Modelo percentual: 40% do faturamento
   - Agenda: Segunda, Terça e Quinta
   - Performance: 142 consultas, R$ 33.800, 4.9⭐

3. **Dr. Roberto Oliveira** - Ortopedia/Traumatologia
   - CRM 345678/SP
   - Trabalha em 2 clínicas (Proprietário em Moema, Voluntário no Hospital)
   - Modelo por procedimento: Valores fixos por TUSS
   - Agenda: Segunda, Quarta e Sexta em Moema, Sábado no Hospital
   - Performance: 73 consultas, R$ 58.200, 4.8⭐

---

### 2. **`/data/clinicsDatabase.ts`** - Base de Dados de Clínicas

#### **Estrutura Clinic:**
```typescript
interface Clinic {
  id: string;
  name: string;
  cnpj: string;
  registroANS: string;
  contact: {...};
  address: {...};
  businessHours: BusinessHours[]; // Horários por dia da semana
  rooms: ConsultationRoom[]; // Salas disponíveis
  specialties: string[];
  insurances: string[];
  financialInfo: {...};
  settings: {
    defaultConsultationDuration: number;
    allowOverlappingAppointments: boolean;
    requirePaymentBeforeConsultation: boolean;
    sendAppointmentReminders: boolean;
    reminderHoursBefore: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
}
```

#### **Clínicas Mock Cadastradas:**
1. **AmplieMed - Unidade Paulista**
   - 6 consultórios + sala de telemedicina
   - Aberto Seg-Sex 7h-19h, Sáb 8h-14h
   - 6 especialidades
   - 7 convênios

2. **AmplieMed - Unidade Moema**
   - 3 consultórios + sala de fisioterapia
   - Aberto Seg-Sex 8h-18h
   - Foco em Ortopedia
   - 4 convênios

3. **Hospital Santa Maria**
   - 24h por dia
   - Emergência e internação
   - 9 convênios incluindo SUS

---

### 3. **`/components/DoctorManagement.tsx`** - Interface de Gestão

#### **Funcionalidades:**

**📊 Dashboard de Médicos:**
- Card com total de médicos ativos
- Card com total de consultas do mês
- Card com receita total
- Card com satisfação média

**🔍 Filtros Avançados:**
- Busca por nome, CRM ou e-mail
- Filtro por clínica
- Filtro por especialidade
- Filtro por status (ativo/inativo)

**📋 Listagem de Médicos:**
Cada card mostra:
- Foto/avatar do médico
- Nome completo
- CRM/UF e especialidades
- Status (ativo, férias, inativo)
- Número de clínicas que atende
- Telefone, e-mail, certificado digital
- **Performance do mês:**
  - Consultas realizadas/meta (com barra de progresso)
  - Receita gerada/meta (com barra de progresso)
  - Satisfação média/meta (com barra de progresso)
  - Indicador visual: ⭐ Excelente, ✓ Bom, ⚠ Atenção, 🔴 Crítico

**👁️ Detalhes Completos:**
Ao clicar em "Detalhes", abre tela com:
- **Informações Pessoais:** CPF, data de nascimento, gênero, telefone, e-mail, endereço completo
- **Informações Profissionais:** Registro ANS, RQE, especialidades, subespecialidades
- **Clínicas:** Lista de todas as clínicas com:
  - Nome da clínica
  - Papel (proprietário/sócio/funcionário/voluntário)
  - Data de início
  - Duração padrão de consulta
  - Sala/consultório
- **Agenda Semanal:** Grade de domingo a sábado mostrando:
  - Em qual clínica trabalha cada dia
  - Turnos (manhã/tarde/noite)
  - Horários de entrada e saída
- **Certificado Digital:**
  - Tipo (A1/A3)
  - Emissor
  - Validade
  - Número serial
- **Modelo de Pagamento:**
  - Tipo (fixo/percentual/procedimento/misto)
  - Valores configurados
- **Metas e Performance:**
  - % de atingimento das metas
  - Projeção de fim de mês
  - Status geral

**✏️ Ações:**
- Visualizar detalhes
- Editar (apenas admin)
- Desativar (apenas admin)

---

## 🔧 FUNÇÕES UTILITÁRIAS

### **`getDoctorById(id)`**
Retorna médico por ID.

### **`getDoctorsByClinic(clinicId)`**
Retorna todos médicos ativos de uma clínica.

### **`getDoctorsBySpecialty(specialty)`**
Retorna todos médicos de uma especialidade.

### **`isDoctorAvailable(doctorId, clinicId, date, time)`**
Verifica se médico está disponível em determinado horário:
- Checa se está ativo
- Checa folgas/férias
- Checa escala do dia
- Checa se horário está dentro do turno

### **`getAvailableSlots(doctorId, clinicId, date)`**
Retorna todos horários disponíveis do médico em uma data:
```typescript
getAvailableSlots('DOC001', 'CLINIC001', new Date('2026-01-13'))
// Retorna: ['08:00', '08:30', '09:00', '09:30', ..., '17:30']
```

### **`calculateDoctorHonorarium(doctorId, tussCode, procedureValue)`**
Calcula honorário do médico por procedimento:
- **Salário fixo:** Retorna 0
- **Percentual:** Calcula % do valor do procedimento
- **Por procedimento:** Retorna valor fixo ou % específica do TUSS
- **Misto:** Combina salário fixo + percentual

Exemplo:
```typescript
// Dr. Carlos tem valor fixo de R$ 200 para consulta (TUSS 10101012)
calculateDoctorHonorarium('DOC001', '10101012', 150.00);
// Retorna: 200.00 (valor fixo dele, independente do valor cobrado)

// Dra. Ana tem 40% de percentual
calculateDoctorHonorarium('DOC002', '10101012', 150.00);
// Retorna: 60.00 (40% de R$ 150)
```

### **`getDoctorProductivitySummary(doctorId)`**
Gera resumo completo de produtividade:
```typescript
{
  goalsAchievement: {
    consultations: 81.67, // % da meta
    revenue: 84.70, // % da meta
    satisfaction: 104.44 // % da meta
  },
  projections: {
    consultationsEndOfMonth: 125,
    revenueEndOfMonth: 54200
  },
  status: 'good' // excellent | good | attention | critical
}
```

---

## 🗂️ GESTÃO DE FOLGAS

### **TimeOff Interface:**
```typescript
interface TimeOff {
  doctorId: string;
  type: 'vacation' | 'sick_leave' | 'conference' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  reason?: string;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
}
```

**Exemplo cadastrado:**
- Dr. Carlos em férias de 10/02 a 24/02
- Dra. Ana em congresso de 15/03 a 17/03

Durante esses períodos, `isDoctorAvailable()` retorna `false`.

---

## 📈 MODELO DE HONORÁRIOS

### **Modelo Fixo:**
```typescript
financialInfo: {
  paymentModel: 'fixed',
  fixedSalary: 15000 // R$ 15.000/mês
}
```
Médico recebe salário fixo mensal, independente de quantas consultas fizer.

### **Modelo Percentual:**
```typescript
financialInfo: {
  paymentModel: 'percentage',
  percentage: 40 // 40% do faturamento
}
```
Médico recebe % de todos os procedimentos que realizar.

### **Modelo Por Procedimento:**
```typescript
financialInfo: {
  paymentModel: 'procedure',
  procedureValues: [
    { tussCode: '10101012', value: 250 }, // R$ 250 por consulta
    { tussCode: '30606012', value: 300 }, // R$ 300 por infiltração
    { tussCode: '20101015', percentage: 60 } // 60% do valor do ECG
  ]
}
```
Médico recebe valor específico por cada tipo de procedimento.

### **Modelo Misto:**
```typescript
financialInfo: {
  paymentModel: 'mixed',
  fixedSalary: 15000, // R$ 15k base
  percentage: 30, // + 30% dos procedimentos
  procedureValues: [
    { tussCode: '10101012', value: 200, percentage: 50 } // Ou R$ 200 fixo, ou 50% do valor
  ]
}
```
Combina salário fixo + percentual + valores específicos.

---

## 🏢 MÉDICO EM MÚLTIPLAS CLÍNICAS

### **Exemplo: Dr. Carlos**
```typescript
clinics: [
  {
    clinicId: 'CLINIC001',
    clinicName: 'AmplieMed - Unidade Paulista',
    role: 'partner', // É SÓCIO
    startDate: '2020-01-01',
    consultationDuration: 30, // Consultas de 30 min
    room: 'Consultório 3',
  },
  {
    clinicId: 'CLINIC002',
    clinicName: 'AmplieMed - Unidade Moema',
    role: 'employee', // É FUNCIONÁRIO
    startDate: '2022-06-01',
    consultationDuration: 40, // Consultas de 40 min aqui
    room: 'Consultório 1',
  },
]
```

**Escala Semanal:**
```typescript
workSchedule: [
  {
    clinicId: 'CLINIC001',
    dayOfWeek: 1, // Segunda
    shifts: [
      { start: '08:00', end: '12:00', consultationDuration: 30 },
      { start: '14:00', end: '18:00', consultationDuration: 30 },
    ],
  },
  {
    clinicId: 'CLINIC001',
    dayOfWeek: 3, // Quarta
    shifts: [
      { start: '08:00', end: '12:00', consultationDuration: 30 },
    ],
  },
  {
    clinicId: 'CLINIC002',
    dayOfWeek: 2, // Terça em OUTRA CLÍNICA
    shifts: [
      { start: '14:00', end: '18:00', consultationDuration: 40 },
    ],
  },
]
```

---

## 🎯 METAS E KPIs

Cada médico tem metas mensais e acompanhamento em tempo real:

```typescript
performance: {
  goals: {
    monthlyConsultations: 120, // Meta: 120 consultas/mês
    monthlyRevenue: 50000, // Meta: R$ 50k/mês
    patientSatisfaction: 4.5, // Meta: 4.5 estrelas
  },
  current: {
    consultationsThisMonth: 98, // Atual: 98 consultas
    revenueThisMonth: 42350, // Atual: R$ 42.350
    averageSatisfaction: 4.7, // Atual: 4.7⭐
    averageConsultationTime: 28, // Tempo médio: 28 min
  },
}
```

**Indicadores Visuais:**
- **⭐ Excelente:** ≥ 90% das metas
- **✓ Bom:** 70-89% das metas
- **⚠ Atenção:** 50-69% das metas
- **🔴 Crítico:** < 50% das metas

**Projeção Automática:**
Sistema calcula projeção linear para fim do mês:
```
Consultas/dia = 98 consultas ÷ 12 dias = 8,17
Dias restantes = 19 dias
Projeção = 98 + (8,17 × 19) = 125 consultas
```

---

## 🔐 CERTIFICADO DIGITAL ICP-BRASIL INDIVIDUAL

Cada médico tem seu próprio certificado:

```typescript
digitalCertificate: {
  type: 'A1', // ou 'A3'
  issuer: 'Serasa Experian', // ou Certisign, Soluti, etc
  validUntil: '2026-12-31',
  serialNumber: 'A1-2024-123456',
}
```

**Uso:**
- Assinatura de receitas
- Assinatura de atestados
- Assinatura de laudos
- Geração de XML TISS
- Auditoria de prontuários

**Validação:**
Sistema verifica se certificado está válido antes de permitir assinatura.

---

## 📅 AGENDAMENTO INTEGRADO

### **Como funciona agora:**

1. **Recepcionista acessa "Agendar Consulta"**
2. **Seleciona a clínica**
3. **Sistema mostra apenas médicos que atendem naquela clínica**
4. **Seleciona o médico**
5. **Sistema filtra especialidades do médico**
6. **Seleciona a data**
7. **Sistema calcula horários disponíveis:**
   - Checa escala do médico naquele dia/clínica
   - Remove horários em folga/férias
   - Remove horários já agendados
   - Considera duração da consulta configurada

**Exemplo de horários disponíveis:**
```
Dr. Carlos na Paulista (Segunda-feira):
Manhã: 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
Tarde: 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30
```

---

## 💰 FATURAMENTO E HONORÁRIOS

### **Fluxo Completo:**

1. **Paciente realiza consulta**
2. **Sistema registra procedimentos TUSS**
3. **Ao finalizar:**
   - **Valor cobrado:** R$ 150 (consulta TUSS 10101012)
   - **Repasse ao médico:** `calculateDoctorHonorarium('DOC001', '10101012', 150)`
   - **Se Dr. Carlos (misto):** R$ 200 (valor fixo dele)
   - **Margem da clínica:** R$ 150 - R$ 200 = -R$ 50 (prejuízo no caso)
   - **Nota:** Clínica paga salário fixo de R$ 15k + honorários

4. **Relatório mensal do médico:**
   - Total de consultas: 98
   - Receita gerada para clínica: R$ 42.350
   - Honorários devidos: R$ 15.000 (fixo) + R$ 12.705 (30%) + R$ 8.000 (procedimentos) = **R$ 35.705**

---

## 🔍 CONTROLE DE ACESSO

### **Por Papel (UserRole):**

**Admin:**
- ✅ Visualiza todos os médicos
- ✅ Edita médicos
- ✅ Desativa médicos
- ✅ Vê performance de todos
- ✅ Acessa relatórios financeiros

**Médico:**
- ✅ Visualiza apenas seus próprios dados
- ✅ Edita apenas sua agenda
- ✅ Vê apenas suas consultas
- ❌ Não vê outros médicos
- ❌ Não vê financeiro de outros

**Recepcionista:**
- ✅ Visualiza médicos para agendamento
- ✅ Vê escalas
- ❌ Não vê honorários
- ❌ Não edita dados médicos

**Financeiro:**
- ✅ Vê relatórios de produtividade
- ✅ Vê honorários
- ✅ Gera relatórios
- ❌ Não edita agendas

---

## 🚀 COMO USAR O SISTEMA

### **1. Acessar Gestão de Médicos:**
```
Menu → Profissionais → Médicos
ou
URL: setCurrentModule('doctors')
```

### **2. Buscar médico:**
Digite nome, CRM ou e-mail na busca.

### **3. Filtrar por clínica:**
Selecione clínica no dropdown → Mostra apenas médicos daquela unidade.

### **4. Ver detalhes de um médico:**
Clique em "Detalhes" → Abre tela completa com todas as informações.

### **5. Verificar disponibilidade:**
```typescript
import { isDoctorAvailable } from '../data/doctorsDatabase';

const available = isDoctorAvailable(
  'DOC001', // Dr. Carlos
  'CLINIC001', // Paulista
  new Date('2026-01-13'), // Segunda-feira
  '09:00'
);
// Retorna: true (ele atende às segundas 8-12h e 14-18h)
```

### **6. Obter horários disponíveis:**
```typescript
import { getAvailableSlots } from '../data/doctorsDatabase';

const slots = getAvailableSlots(
  'DOC001',
  'CLINIC001',
  new Date('2026-01-13')
);
// Retorna: ['08:00', '08:30', '09:00', ..., '17:30']
```

### **7. Calcular honorário:**
```typescript
import { calculateDoctorHonorarium } from '../data/doctorsDatabase';

const honorarium = calculateDoctorHonorarium(
  'DOC002', // Dra. Ana (40% percentual)
  '10101012', // Consulta
  150.00 // Valor cobrado
);
// Retorna: 60.00 (40% de R$ 150)
```

---

## 📊 RELATÓRIOS DISPONÍVEIS

### **Dashboard Geral:**
- Total de médicos ativos
- Total de consultas do mês (soma de todos)
- Receita total gerada
- Satisfação média geral

### **Por Médico:**
- Consultas realizadas vs meta
- Receita gerada vs meta
- Satisfação vs meta
- Projeção fim do mês
- Status de performance

### **Por Clínica:**
- Médicos alocados
- Consultas por clínica
- Receita por clínica
- Ocupação por sala

---

## ✅ CHECKLIST DE FUNCIONALIDADES

### **Básico:**
- [x] Cadastro de médicos
- [x] Seleção de médico no agendamento
- [x] Vínculo consulta-médico
- [x] Documentos com médico correto

### **Completo:**
- [x] Agenda individualizada por médico
- [x] Relatórios e dashboards
- [x] Escalas e bloqueios
- [x] Controle de acesso por médico
- [x] Múltiplas especialidades
- [x] Certificado digital individual

### **Avançado - MULTI-CLÍNICA:**
- [x] Médicos em várias clínicas
- [x] Honorários por procedimento
- [x] Produtividade e metas
- [x] Modelos de pagamento (fixo/percentual/procedimento/misto)
- [x] Projeções automáticas
- [x] Folgas e férias
- [x] Papéis (proprietário/sócio/funcionário/voluntário)
- [x] Escalas diferentes por clínica
- [x] Duração de consulta por clínica

---

## 🎯 RESUMO

**O AmplieMed agora é um sistema COMPLETO multi-médico e multi-clínica!**

✅ **3 médicos cadastrados** com perfis completos  
✅ **3 clínicas** com horários e salas  
✅ **4 modelos de honorários** (fixo, percentual, procedimento, misto)  
✅ **Agenda inteligente** com verificação de disponibilidade  
✅ **Performance em tempo real** com metas e projeções  
✅ **Certificados digitais individuais** ICP-Brasil  
✅ **Gestão de folgas e férias**  
✅ **Controle de acesso granular**  
✅ **Dashboard completo** com KPIs  

**O sistema está pronto para uso em clínicas reais com múltiplos médicos!** 🚀
