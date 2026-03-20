# SOLUÇÃO DETALHADA - ERROS DO SISTEMA AMPLIEMED

## 1. ✅ AUTO-PREENCHIMENTO NA AGENDA (CORRIGIDO)

### Problema
Quando o médico era selecionado, especialidade, sala e outras informações não eram preenchidas automaticamente.

### Solução Implementada
Arquivo: `src/components/ScheduleManagementWithPayment.tsx` (linha ~1400)

**Antes:**
```tsx
onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, doctorName: e.target.value })}
```

**Depois:**
```tsx
onChange={(e) => {
  const selectedDoctorName = e.target.value;
  const doctor = professionals.find(p => p.name === selectedDoctorName);
  setNewAppointmentForm({
    ...newAppointmentForm,
    doctorName: selectedDoctorName,
    specialty: doctor?.specialty || '',
    room: doctor?.room || '',
  });
}}
```

### O que faz
- Busca o profissional selecionado em `professionals[]`
- Auto-preenche `specialty` com a especialidade do cadastro
- Auto-preenche `room` com a sala do cadastro
- Funciona para qualquer profissional (não só médicos)

---

## 2. CADASTRO DE PROFISSIONAL COM ERRO

### Problema Identificado
A validação está muito rigorosa. Quando o usuário cria um novo profissional, há vários validadores:

**Validadores no handleSave():**
- ✅ Nome obrigatório
- ✅ Especialidade obrigatória
- ✅ CRM obrigatório (apenas para médicos)
- ✅ CPF válido (verificação de dígitos)
- ✅ Senha obrigatória (apenas ao criar)
- ✅ Senha com mínimo 6 caracteres
- ✅ Email obrigatório (apenas ao criar)

**Possível causa raiz:**
```javascript
const { data, error } = await getSupabase().auth.signUp({
  email: form.email,
  password: form.password!,
});

if (error) {
  toastError('Erro ao criar usuário', { description: error.message });
  return; // ← FALHA AQUI se houver erro de autenticação do Supabase
}
```

### Solução Recomendada

1. **Adicionar validação de email duplicado:**
```tsx
const viewEmailsDatabase = professionals.map(p => p.email);
if (viewEmailsDatabase.includes(form.email)) {
  toastError('Este e-mail já está cadastrado');
  setErrors({ ...errors, email: 'E-mail duplicado' });
  return;
}
```

2. **Melhorar feedback de erro:**
```tsx
if (error) {
  let mensagem = error.message;
  if (mensagem.includes('already registered')) {
    mensagem = 'Este e-mail já está cadastrado no sistema';
  } else if (mensagem.includes('password')) {
    mensagem = 'A senha não atende aos critérios de segurança';
  }
  toastError('Erro ao registrar profissional', { description: mensagem });
  return;
}
```

3. **Salvamento sem dependência de Supabase Auth (alternativa):**
```tsx
// Opção 1: Registrar localmente no AppContext primeiro
const newProf = addProfessional({ ...form, id: crypto.randomUUID() });

// Opção 2: Tentar criar no Supabase depois
try {
  await getSupabase().auth.signUp({...});
} catch (err) {
  // Se falhar, o profissional já está no sistema
  toastWarning('Profissional adicionado mas sem conta Supabase');
}
```

---

## 3. CADASTRO DE USUÁRIO NÃO FUNCIONA

### Estrutura do Problema
Existem **dois fluxos de signup** que podem estar em conflito:

### A) Via Login.tsx → App (AppProvider) → AppContext.signup()
```
Login.tsx (mode='signup')
  ↓
  onSignup callback (da App)
  ↓
  AppContext.signup()
  ↓
  api.signup() [Edge Function]
  ↓
  Supabase Auth
```

### B) Via ProfessionalManagement.tsx → getSupabase().auth.signUp()
```
ProfessionalManagement.tsx
  ↓
  getSupabase().auth.signUp() [direto no Supabase]
  ↓
  Falha pois usa signUp sem service_role
```

### O Erro Real
Na linha do `api.ts`:
```typescript
const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d4766610`;
```

Para funcionar, **precisa de uma Edge Function deployada** em:
- `https://[PROJECT_ID].supabase.co/functions/v1/make-server-d4766610`

Sem a Edge Function, o signup falha com erro de rede.

### Soluções Possíveis

#### Solução 1: Deploy da Edge Function (RECOMENDADO)
No Supabase Console, crie uma função em `functions/auth/signup`:
```typescript
// functions/auth/signup/index.ts
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { email, password, name, role, specialty, crm, phone } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email, password,
    email_confirm: true,
    user_metadata: { name, role, specialty, crm, phone }
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: corsHeaders
    });
  }

  return new Response(JSON.stringify(data), {
    headers: corsHeaders
  });
};
```

#### Solução 2: Unificar Signup no AppContext (MAIS SEGURO)
```tsx
// AppContext.tsx
const signup = async (data) => {
  const supabase = getSupabase();
  
  // 1. Criar profissional localmente PRIMEIRO
  const newProf = addProfessional({
    ...data,
    id: crypto.randomUUID(),
    crm: data.crm || '',
    crmUf: '',
    specialty: data.specialty || '',
    status: 'active',
    clinics: [],
    digitalCertificate: 'none',
    certificateExpiry: '',
  });
  
  // 2. Tentar criar no Supabase (não-essencial)
  try {
    await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
  } catch (err) {
    // Profissional criado mesmo se auth falhar
    console.warn('[Auth] Signup falhou, mas profissional foi criado', err);
  }
  
  return true;
};
```

#### Solução 3: Login Simplificado (SEM Supabase Auth)
Se Supabase Auth não estiver funcionando, implementar autenticação local:
```tsx
// Use localStorage + senha com hash
const users = JSON.parse(localStorage.getItem('users') || '[]');
const hash = await hashPassword(password); // bcrypt JS
users.push({ email, hash, ...userData });
localStorage.setItem('users', JSON.stringify(users));
```

---

## 4. MÓDULO FINANCEIRO COM PROBLEMAS

### Estrutura Encontrada
O módulo financeiro tem 7 abas e **depende fortemente da sincronização com a agenda**.

### Problema 1: Dados não sincronizando

**Em ScheduleManagementWithPayment.tsx:**
```typescript
// Quando registra pagamento:
const updatedPayments = [p, ...financialPayments];
setFinancialPayments(updatedPayments);
await syncPayments(updatedPayments); // ← Pode falhar silenciosamente
```

**Solução:**
```typescript
const handleRegisterPaymentOnly = () => {
  const p: FinancialPayment = { /* ... */ };
  setFinancialPayments(prev => [p, ...prev]);
  
  // Feedback visual
  toastSuccess('Pagamento registrado em financeiro');
  
  // Sincronização (não-bloqueante)
  syncPayments([p, ...financialPayments])
    .catch(err => console.error('[Sync] Erro ao sincronizar:', err));
};
```

### Problema 2: Cálculos de comissão incorretos

Na FinancialModule.tsx:
```typescript
const commissionData = financialPayments.reduce((acc, payment) => {
  const doctor = patients.find(p => p.name === payment.patient); // ← ERRADO
  // Deveria buscar em appointments e professionals
});
```

**Solução:**
```typescript
const consultations = appointments.filter(a => a.doctorName === doctorName);
const totalAmount = consultations
  .filter(a => a.paymentStatus === 'pago')
  .reduce((sum, a) => sum + (a.consultationValue || 0), 0);

const commission = totalAmount * (professional.revenuePercentage || 30) / 100;
```

### Problema 3: Status não refletem realidade

**Solução:**
```typescript
// Atualizar status baseado em data
const calculatePaymentStatus = (dueDate: string, status: string): string => {
  if (status === 'pago') return 'pago';
  if (new Date(dueDate) < new Date()) return 'vencido';
  return 'pendente';
};
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [x] Auto-preenchimento de especialidade/sala na agenda
- [ ] Validação de email duplicado no cadastro de profissional
- [ ] Melhor feedback de erro para signup
- [ ] Deploy de Edge Function ou refactor de autenticação
- [ ] Sincronização de pagamentos com financeiro
- [ ] Correção de cálculos de comissão
- [ ] Atualização de status de pagamento

---

## COMO TESTAR

### 1. Auto-preenchimento
1. Ir para Agenda
2. Criar nova consulta
3. Selecionar um médico
4. ✅ Especialidade e sala devem ser preenchidas automaticamente

### 2. Cadastro de Profissional
1. Ir para Profissionais → Novo Profissional
2. Preencher: Nome, Especialidade, Email, Senha
3. ✅ Deve criar sem erro

### 3. Cadastro de Usuário
1. Na tela de Login → "Criar conta"
2. Preencher: Nome, Email, Senha
3. ✅ Deve criar sem erro

### 4. Financeiro
1. Agendar consulta
2. Ir para Agenda e registrar pagamento
3. Ir para Financeiro → Pagamentos
4. ✅ Pagamento deve aparecer na lista

---

## REFERÊNCIAS

- AppContext.tsx: Linhas 1076-1117 (signup)
- ScheduleManagementWithPayment.tsx: Linhas ~1400 (seletor de médico)
- ProfessionalManagement.tsx: Linhas 126-157 (handleSave)
- api.ts: Linhas 80-90 (signup)
