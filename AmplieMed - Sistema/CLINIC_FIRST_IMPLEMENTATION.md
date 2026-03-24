# 🏥 Clinic-First Model: Documentação de Implementação

**Data**: 24 de março de 2026  
**Status**: Em Implementação  
**Versão**: v2.0

---

## 📋 Visão Geral

O modelo **Clinic-First** redesenha o fluxo de registro do AmplieMed para:

1. **Clinica é a entidade primária** (não usuário)
2. **Admin cria a clínica** primeiro
3. **Profissionais são convidados** para se juntar com token

### Antes (User-First)
```
1. Usuário faz signup
2. Cria/gerencia clínica
3. Adiciona profissionais manualmente
```

### Depois (Clinic-First)
```
1. Clínica se registra → cria admin
2. Admin convida profissionais via token
3. Profissional aceita convite → entra na clínica
```

---

## 🗂️ Arquivos Criados/Modificados

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/ClinicSignup.tsx` | Componente de formulário clinic-first (4 passos) |
| `src/MIGRATION_CLINIC_FIRST.sql` | Schema SQL com tabelas invite + memberships + RLS |
| `src/CLINIC_FIRST_IMPLEMENTATION.md` | Este documento |

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/types.ts` | ✅ Adicionados tipos: `ClinicSignupData`, `ClinicInviteToken`, `ClinicMembership`, `ClinicSignupResult` |
| `src/utils/api.ts` | ✅ Adicionadas funções: `clinicSignup()`, `generateClinicInvite()`, `acceptClinicInvite()` |

---

## 🔧 Tipos TypeScript Adicionados

### ClinicSignupData
Dados coletados no formulário de clinic signup:

```typescript
interface ClinicSignupData {
  clinicName: string;           // Nome da clínica (razão social)
  cnpj?: string;                // CNPJ (14 dígitos, opcional)
  email: string;                // Email administrativo
  phone: string;                // Telefone
  password: string;             // Senha do admin (8+ chars)
  specialty?: string;           // Especialidade/tipo de serviço
  address?: {                   // Endereço completo
    street, number, city, state, zipCode, ...
  };
  acceptTerms: boolean;         // ToS acceptance
  lgpdConsent: boolean;         // LGPD acknowledgment
}
```

### ClinicInviteToken
Token gerado quando admin convida profissional:

```typescript
interface ClinicInviteToken {
  id: string;
  clinicId: string;
  token: string;                // Unique invite token
  invitedEmail: string;
  role?: string;                // 'doctor' | 'receptionist' | etc
  expiresAt: string;            // 48 horas por padrão
  usedAt?: string;              // Usado quando profissional aceita
  metadata?: Record<string, any>;
}
```

### ClinicMembership
Mapeia usuário → clínica com role específico:

```typescript
interface ClinicMembership {
  id: string;
  clinicId: string;
  userId: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'financial' | 'viewer';
  joinedAt: string;
  active: boolean;
  metadata?: Record<string, any>;
}
```

---

## 📱 Fluxo da UI

### ClinicSignup Component (4 Passos)

#### Step 1: Informações da Clínica
```
[Campo] Nome da clínica *
[Campo] CNPJ (opcional)
[Campo] Email administrativo *
[Campo] Telefone *
[Campo] Especialidade
[Progresso] 25%
```

#### Step 2: Credenciais do Admin
```
[Campo] Senha (8+ chars, upper/lower/num) *
[Campo] Confirmar Senha *
[Info] Esta será a conta principal da clínica
[Progresso] 50%
```

#### Step 3: Endereço
```
[Campo] Rua *
[Campo] Número *
[Campo] Bairro *
[Campo] Complemento
[Campo] Cidade *
[Campo] UF *
[Campo] CEP *
[Progresso] 75%
```

#### Step 4: Confirmação
```
[Resumo] Validação dos dados
[Checkbox] Aceito os termos de serviço *
[Checkbox] Confirmo conformidade LGPD *
[Botão] Criar Clínica
[Progresso] 100%
```

---

## 🔗 Fluxo de Convite de Profissionais

### 1. Admin Gera Convite
```typescript
// Clinic admin calls:
const invite = await api.generateClinicInvite(clinicId, {
  invitedEmail: 'doctor@email.com',
  role: 'doctor',
  metadata: { specialty: 'Cardiologia', room: 'Sala 101' }
});

// Returns:
// {
//   token: 'abc123xyz...',
//   inviteLink: 'https://ampliemed.com/register?token=abc123xyz...',
//   expiresAt: '2026-03-26T12:00:00Z'
// }
```

### 2. Admin Envia Link
Email para profissional contendo:
- Link de convite com token
- Nome da clínica
- Data de expiração

### 3. Profissional Aceita
Profissional acessa: `/register?token=abc123xyz...`
- Formulário pre-filled com email
- Define senha
- Clica "Aceitar Convite"

### 4. Backend Processa
```typescript
await api.acceptClinicInvite(token, {
  password: '***',
  confirmPassword: '***',
  name: 'Dr. João Silva'
});
```

Edge Function:
1. Valida token (não expirado, não usado)
2. Cria usuário no Auth
3. Cria registro em `clinic_memberships`
4. Retorna clinic_details

### 5. Profissional Logado
- Acesso às dados da clínica
- RLS força isolamento: `clinic_id` check
- Pode gerenciar pacientes, agendas, etc.

---

## 🗄️ Schema SQL

### clinic_invite_tokens
```sql
CREATE TABLE clinic_invite_tokens (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL → clinics(id),
  token text UNIQUE,
  invited_email text,
  role text DEFAULT 'doctor',
  metadata jsonb,
  created_by uuid → auth.users(id),
  created_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + 48 hours),
  used_at timestamp NULL,
  used_by uuid → auth.users(id) NULL
);

-- Indexes:
CREATE INDEX idx_clinic_invite_tokens_token ON clinic_invite_tokens(token);
CREATE INDEX idx_clinic_invite_tokens_clinic_id ON clinic_invite_tokens(clinic_id);
CREATE INDEX idx_clinic_invite_tokens_expires_at ON clinic_invite_tokens(expires_at);
```

### clinic_memberships
```sql
CREATE TABLE clinic_memberships (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL → clinics(id),
  user_id uuid NOT NULL → auth.users(id),
  role text NOT NULL DEFAULT 'doctor',
  joined_at timestamp DEFAULT now(),
  active boolean DEFAULT true,
  metadata jsonb,
  
  UNIQUE(clinic_id, user_id)
);

-- Indexes:
CREATE INDEX idx_clinic_memberships_user_id ON clinic_memberships(user_id);
CREATE INDEX idx_clinic_memberships_clinic_id ON clinic_memberships(clinic_id);
```

### RLS Policies
Todas as tabelas (`patients`, `appointments`, `medical_records`, etc.) recebem check:
```sql
clinic_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM clinic_memberships cm
  WHERE cm.clinic_id = [table].clinic_id
    AND cm.user_id = auth.uid()
    AND cm.active = true
)
```

---

## 🔒 Segurança

### Isolamento de Dados
- ✅ Cada clínica é tenant isolado
- ✅ RLS garante users veem apenas dados de seus clinics
- ✅ CNPJ unique → evita duplicação
- ✅ Email admin único por clínica

### Invite Token
- ✅ Token único por convite
- ✅ Expira em 48 horas
- ✅ Single-use (marcado `used_at` quando aceito)
- ✅ Vinculado a `invited_email` (validação)

### Senha Admin
- ✅ Criptografada em trânsito (HTTPS)
- ✅ Validação: 8+ chars, upper/lower/numbers
- ✅ Armazenada via Supabase Auth (hash bcrypt)

---

## 📋 Checklist de Implementação

- [x] Tipos TypeScript adicionados
- [x] ClinicSignup component criado
- [x] API functions adicionadas (`clinicSignup`, `generateClinicInvite`, `acceptClinicInvite`)
- [x] Schema SQL criado (migration)
- [x] RLS policies expandidas
- [ ] **PRÓXIMO**: Edge Functions para clinic signup
- [ ] **PRÓXIMO**: Atualizar routes.tsx para incluir `/register` com token
- [ ] **PRÓXIMO**: Criar ProfessionalInviteAccept component
- [ ] **PRÓXIMO**: Integrar com Login.tsx (nova opção: "Registrar Clínica")
- [ ] **PRÓXIMO**: Testes E2E do fluxo completo
- [ ] **PRÓXIMO**: Documentação de API REST
- [ ] **PRÓXIMO**: Email templates para invites

---

## 🚀 Próximas Ações

### 1. Implementar Edge Functions
Criar 3 edge functions no Supabase:

**`/functions/auth/clinic-signup`**
```typescript
export async function clinicSignup(req: Request) {
  // 1. Validate CNPJ uniqueness
  // 2. Validate email uniqueness
  // 3. Create clinic in DB
  // 4. Create admin user in Auth
  // 5. Create clinic_membership (admin role)
  // 6. Return clinic details + invite link template
}
```

**`/functions/clinic/[clinicId]/invite`**
```typescript
export async function generateInvite(req: Request) {
  // 1. Verify user is clinic admin
  // 2. Generate unique token
  // 3. Create clinic_invite_token record
  // 4. Return invite link
  // 5. (Optional) Send email to invited professional
}
```

**`/functions/auth/accept-clinic-invite`**
```typescript
export async function acceptInvite(req: Request) {
  // 1. Validate token (not expired, not used)
  // 2. Create user account
  // 3. Create clinic_membership
  // 4. Mark token as used
  // 5. Return clinic context
}
```

### 2. Atualizar Routes
```typescript
// Novo route: /register?token=xxx
function RegisterPage() {
  const token = useSearchParams().get('token');
  if (token) {
    return <ProfessionalInviteAccept token={token} />;
  }
  return <Navigate to="/login" />;
}
```

### 3. UI de Registro de Clínica

Modificar `Login.tsx`:
```typescript
// Add novo tab: "Registrar Clínica"
{mode === 'clinic-signup' && (
  <ClinicSignup 
    onSignupSuccess={handleClinicSignupSuccess}
    onBackToLogin={() => setMode('login')}
  />
)}
```

### 4. AppContext.tsx Updates

Adicionar novo método:
```typescript
const signupClinic = async (data: ClinicSignupData) => {
  const result = await api.clinicSignup(data);
  // Auto-login como admin
  // Redirecionar para invite link
  return result;
};
```

---

## 📊 Impacto nas Tabelas Existentes

### clinics
- ✅ Já tem `owner_id` (admin da clínica)
- ✅ Status: `active` | `inactive` | `suspended`
- ✅ Sem mudanças necessárias

### patients, appointments, medical_records, etc.
- ✅ Já têm `clinic_id`
- ⚠️ RLS policies precisam ser **expandidas** (vide `MIGRATION_CLINIC_FIRST.sql`)

### professionals, doctors
- ⚠️ Considerar adicionar `primary_clinic_id` para facilitar queries

---

## 🧪 Testing

### Unit Tests
- [ ] Validação de CNPJ format
- [ ] Validação de senha strength
- [ ] Validação de CEP format
- [ ] Token generation (uniqueness, expiry)

### Integration Tests
- [ ] Full clinic signup flow
- [ ] Invite token validation
- [ ] Accept invite + user creation
- [ ] RLS isolation tests

### E2E Tests
- [ ] Clinic signup → redirect
- [ ] Generate invite → email sent
- [ ] Professional accepts invite → logged in
- [ ] Clinic admin views professionals list
- [ ] Patient data isolation between clinics

---

## 📝 Licenças e Compliance

- ✅ LGPD: Checkbox obrigatório no signup
- ✅ ToS: Checkbox obrigatório
- ✅ Data isolation: RLS policies
- ✅ Audit: Signup logged em `audit_log`

---

## 🔗 Referências

- [Clinic-First Discussion](./README.md)
- [Types](./types.ts)
- [API Functions](./utils/api.ts)
- [SQL Migration](./MIGRATION_CLINIC_FIRST.sql)
- [ClinicSignup Component](./components/ClinicSignup.tsx)

---

## 📞 Suporte

Para dúvidas sobre este modelo:
1. Revisar `MIGRATION_CLINIC_FIRST.sql` para schema
2. Revisar `ClinicSignup.tsx` para fluxo UI
3. Revisar `types.ts` para estrutura de dados
4. Consultar Edge Function patterns em Supabase docs
