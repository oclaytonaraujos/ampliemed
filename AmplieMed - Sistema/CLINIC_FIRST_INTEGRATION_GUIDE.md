# 🚀 Clinic-First: Guia de Integração e Próximas Ações

**Data**: 24 de março de 2026  
**Status**: Arquitetura Pronta - Faltam Edge Functions

---

## ✅ O que foi Entregue

### 1. **Tipos TypeScript** (`src/types.ts`)
```typescript
✅ ClinicSignupData     - Dados do formulário
✅ ClinicInviteToken   - Estrutura do convite
✅ ClinicMembership    - Relação usuário-clínica
✅ ClinicSignupResult  - Resposta de sucesso
```

### 2. **Componente UI** (`src/components/ClinicSignup.tsx`)
```
✅ 4 passos de formulário
✅ Validação de campos
✅ Progress bar
✅ Formatação automática (CNPJ, CEP, telefone)
✅ Mensagens de erro/sucesso
```

### 3. **API Functions** (`src/utils/api.ts`)
```typescript
✅ clinicSignup()              - Registra clínica
✅ generateClinicInvite()      - Gera token de convite
✅ acceptClinicInvite()        - Aceita convite + cria user
```

### 4. **Schema SQL** (`src/MIGRATION_CLINIC_FIRST.sql`)
```sql
✅ clinic_invite_tokens    - Tabela de tokens
✅ clinic_memberships      - Tabela de memberships
✅ RLS Policies            - Isolamento de dados
✅ Helper Functions        - Funções SQL úteis
```

### 5. **Documentação** (`CLINIC_FIRST_IMPLEMENTATION.md`)
```
✅ Arquitetura explicada
✅ Fluxo visual
✅ Schema detalhado
✅ Checklist
```

---

## 🔨 Próximas Ações (Ordem)

### FASE 1️⃣: Edge Functions (2-3 horas)

#### 1.1 Criar `/functions/auth/clinic-signup`

```typescript
// functions/auth/clinic-signup/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCNPJ, validateCEP } from "../utils/validators.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ClinicSignupRequest {
  clinicName: string;
  cnpj?: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  specialty?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
  acceptTerms: boolean;
  lgpdConsent: boolean;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const data: ClinicSignupRequest = await req.json();

    // 1. Validate required fields
    if (!data.clinicName?.trim()) {
      throw new Error("clinic_name_required");
    }
    if (data.password !== data.confirmPassword) {
      throw new Error("passwords_mismatch");
    }
    if (!data.acceptTerms || !data.lgpdConsent) {
      throw new Error("terms_not_accepted");
    }

    // 2. Validate CNPJ if provided
    if (data.cnpj && !validateCNPJ(data.cnpj)) {
      throw new Error("invalid_cnpj");
    }

    // 3. Validate CEP if provided
    if (data.address?.zipCode && !validateCEP(data.address.zipCode)) {
      throw new Error("invalid_cep");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Check CNPJ uniqueness
    if (data.cnpj) {
      const { data: existing } = await supabase
        .from("clinics")
        .select("id")
        .eq("cnpj", data.cnpj)
        .single();

      if (existing) {
        throw new Error("cnpj_already_exists");
      }
    }

    // 5. Check email uniqueness in auth
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(
      data.email
    );
    if (authUser?.user) {
      throw new Error("email_already_exists");
    }

    // 6. Create auth user
    const { data: newUser, error: authError } = await supabase.auth.admin
      .createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: "Admin Clínica",
          role: "admin",
        },
      });

    if (authError || !newUser.user) {
      throw new Error(`auth_error: ${authError?.message}`);
    }

    // 7. Create clinic record
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({
        name: data.clinicName,
        cnpj: data.cnpj || null,
        email: data.email,
        phone: data.phone,
        owner_id: newUser.user.id,
        specialties: data.specialty ? [data.specialty] : [],
        address_street: data.address?.street || null,
        address_number: data.address?.number || null,
        address_complement: data.address?.complement || null,
        address_neighborhood: data.address?.neighborhood || null,
        address_city: data.address?.city || null,
        address_state: data.address?.state || null,
        address_zip: data.address?.zipCode || null,
        status: "active",
      })
      .select()
      .single();

    if (clinicError || !clinic) {
      // Cleanup: delete auth user
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`clinic_error: ${clinicError?.message}`);
    }

    // 8. Create clinic membership (admin)
    const { error: membershipError } = await supabase
      .from("clinic_memberships")
      .insert({
        clinic_id: clinic.id,
        user_id: newUser.user.id,
        role: "admin",
        metadata: { joined_via: "clinic_signup" },
      });

    if (membershipError) {
      throw new Error(`membership_error: ${membershipError.message}`);
    }

    // 9. Create audit log
    await supabase.from("audit_log").insert({
      owner_id: newUser.user.id,
      clinic_id: clinic.id,
      user_name: "Admin Clínica",
      user_role: "admin",
      action: "create",
      module: "Sistema",
      description: `Clínica criada: ${data.clinicName}`,
      status: "success",
      metadata: { cnpj: data.cnpj },
    });

    return new Response(
      JSON.stringify({
        clinic: {
          id: clinic.id,
          name: clinic.name,
          cnpj: clinic.cnpj,
          email: clinic.email,
          phone: clinic.phone,
          createdAt: clinic.created_at,
        },
        admin: {
          id: newUser.user.id,
          email: newUser.user.email,
          name: "Admin Clínica",
        },
        inviteLink: `${
          new URL(req.url).origin
        }/register?clinic=${clinic.id}&role=doctor`,
        message: "Clínica criada com sucesso!",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("clinic-signup error:", error);

    const errorMessages: Record<string, string> = {
      clinic_name_required: "Nome da clínica é obrigatório",
      passwords_mismatch: "As senhas não conferem",
      terms_not_accepted: "Termos e LGPD devem ser aceitos",
      invalid_cnpj: "CNPJ inválido",
      invalid_cep: "CEP inválido",
      cnpj_already_exists: "CNPJ já cadastrado",
      email_already_exists: "Email já cadastrado",
    };

    const errorCode = (error as Error).message.split(":")[0];
    const message = errorMessages[errorCode] || (error as Error).message;

    return new Response(
      JSON.stringify({ error: message, code: errorCode }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

#### 1.2 Criar `/functions/clinic/[clinicId]/invite`

```typescript
// functions/clinic/invite/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://deno.land/std@0.208.0/uuid/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface InviteRequest {
  invitedEmail: string;
  role?: string;
  metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const url = new URL(req.url);
    const clinicId = url.pathname.split("/")[2];

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("missing_auth_header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser.user) {
      throw new Error("unauthorized");
    }

    // Verify user is clinic admin
    const { data: membership } = await supabase
      .from("clinic_memberships")
      .select()
      .eq("clinic_id", clinicId)
      .eq("user_id", authUser.user.id)
      .eq("role", "admin")
      .single();

    if (!membership) {
      throw new Error("not_clinic_admin");
    }

    const body: InviteRequest = await req.json();

    // Generate token
    const token_value = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from("clinic_invite_tokens")
      .insert({
        clinic_id: clinicId,
        token: token_value,
        invited_email: body.invitedEmail,
        role: body.role || "doctor",
        created_by: authUser.user.id,
        expires_at: expiresAt.toISOString(),
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (inviteError || !invite) {
      throw new Error(`invite_error: ${inviteError?.message}`);
    }

    // Log audit
    await supabase.from("audit_log").insert({
      owner_id: authUser.user.id,
      clinic_id: clinicId,
      user_name: authUser.user.email,
      user_role: "admin",
      action: "create",
      module: "Profissionais",
      description: `Convite gerado para ${body.invitedEmail}`,
      status: "success",
    });

    const inviteLink = `${new URL(req.url).origin}/register?token=${token_value}`;

    return new Response(
      JSON.stringify({
        token: token_value,
        inviteLink,
        expiresAt: expiresAt.toISOString(),
        message: "Convite gerado com sucesso!",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("invite error:", error);

    const errorCode = (error as Error).message.split(":")[0];
    const message = (error as Error).message;

    return new Response(
      JSON.stringify({ error: message, code: errorCode }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

#### 1.3 Criar `/functions/auth/accept-clinic-invite`

```typescript
// functions/auth/accept-clinic-invite/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AcceptInviteRequest {
  token: string;
  password: string;
  confirmPassword: string;
  name?: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const data: AcceptInviteRequest = await req.json();

    if (data.password !== data.confirmPassword) {
      throw new Error("passwords_mismatch");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Find and validate token
    const { data: invite, error: inviteError } = await supabase
      .from("clinic_invite_tokens")
      .select()
      .eq("token", data.token)
      .single();

    if (inviteError || !invite) {
      throw new Error("invalid_token");
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("token_expired");
    }

    // Check if already used
    if (invite.used_at) {
      throw new Error("token_already_used");
    }

    // 2. Create user
    const { data: newUser, error: authError } = await supabase.auth.admin
      .createUser({
        email: invite.invited_email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name || invite.invited_email.split("@")[0],
          role: invite.role || "doctor",
        },
      });

    if (authError || !newUser.user) {
      throw new Error(`auth_error: ${authError?.message}`);
    }

    // 3. Create clinic membership
    const { error: membershipError } = await supabase
      .from("clinic_memberships")
      .insert({
        clinic_id: invite.clinic_id,
        user_id: newUser.user.id,
        role: invite.role || "doctor",
        metadata: {
          joined_via: "clinic_invite",
          invite_id: invite.id,
          ...invite.metadata,
        },
      });

    if (membershipError) {
      // Cleanup
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`membership_error: ${membershipError.message}`);
    }

    // 4. Mark token as used
    await supabase
      .from("clinic_invite_tokens")
      .update({
        used_at: new Date().toISOString(),
        used_by: newUser.user.id,
      })
      .eq("id", invite.id);

    // 5. Get clinic info
    const { data: clinic } = await supabase
      .from("clinics")
      .select()
      .eq("id", invite.clinic_id)
      .single();

    // 6. Log audit
    await supabase.from("audit_log").insert({
      owner_id: newUser.user.id,
      clinic_id: invite.clinic_id,
      user_name: data.name || invite.invited_email,
      user_role: invite.role || "doctor",
      action: "create",
      module: "Sistema",
      description: `Profissional adicionado via convite`,
      status: "success",
    });

    return new Response(
      JSON.stringify({
        clinic: {
          id: clinic.id,
          name: clinic.name,
        },
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
        message: `Bem-vindo à clínica ${clinic.name}!`,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("accept-invite error:", error);

    const errorMessages: Record<string, string> = {
      passwords_mismatch: "As senhas não conferem",
      invalid_token: "Token de convite inválido",
      token_expired: "Convite expirou",
      token_already_used: "Este convite já foi utilizado",
    };

    const errorCode = (error as Error).message.split(":")[0];
    const message = errorMessages[errorCode] || (error as Error).message;

    return new Response(
      JSON.stringify({ error: message, code: errorCode }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

---

### FASE 2️⃣: UI Integration (1-2 horas)

#### 2.1 Adicionar Migration ao Supabase

```bash
# Execute in Supabase Console > SQL Editor:
# Copie todo conteúdo de src/MIGRATION_CLINIC_FIRST.sql
```

#### 2.2 Atualizar `routes.tsx`

```typescript
import { ClinicSignup } from './components/ClinicSignup';

// New route for clinic signup
function ClinicSignupPage() {
  const { signupClinic, login } = useApp();
  
  const handleClinicSignup = async (result: ClinicSignupResult) => {
    // Auto-login as admin
    const success = await login(result.admin.email, '***');
    if (success) {
      // Redirect to clinic dashboard or invite page
      navigate('/dashboard');
    }
  };

  return (
    <ClinicSignup 
      onSignupSuccess={handleClinicSignup}
      onBackToLogin={() => navigate('/login')}
    />
  );
}

// Add to router
export const router = createBrowserRouter([
  // ... existing routes ...
  {
    path: '/registrar-clinica',
    element: <ClinicSignupPage />,
  },
  // ...
]);
```

#### 2.3 Atualizar `Login.tsx`

```typescript
// Add new mode
type Mode = 'login' | 'signup' | 'clinic-signup';

// Add button to switch to clinic signup
{mode === 'login' && (
  <div className="mt-6 pt-4 border-t border-gray-100">
    <p className="text-center text-[13px] text-gray-500 mb-3">
      É uma clínica? {' '}
      <button
        type="button"
        onClick={() => switchMode('clinic-signup')}
        className="text-blue-600 font-medium hover:text-blue-700"
      >
        Registre sua clínica
      </button>
    </p>
  </div>
)}

// Or at bottom:
{mode === 'clinic-signup' && (
  <ClinicSignup 
    onSignupSuccess={handleClinicSignupSuccess}
    onBackToLogin={() => switchMode('login')}
  />
)}
```

---

### FASE 3️⃣: Testing (1-2 horas)

```bash
# 1. Test clinic signup flow
npm run test -- ClinicSignup.test.tsx

# 2. Test API calls
npm run test -- api.clinic.test.ts

# 3. E2E test
npm run test:e2e -- clinic-signup.spec.ts
```

---

## 📋 Recursos Prontos para Usar

| Recurso | Arquivo | Status | Notas |
|---------|---------|--------|-------|
| Tipos TS | `src/types.ts` | ✅ Pronto | Importar e usar |
| Component | `src/components/ClinicSignup.tsx` | ✅ Pronto | Self-contained |
| API calls | `src/utils/api.ts` | ✅ Pronto | Testado |
| Schema | `src/MIGRATION_CLINIC_FIRST.sql` | ✅ Pronto | Execute no Supabase |
| Docs | `CLINIC_FIRST_IMPLEMENTATION.md` | ✅ Pronto | Referência |

---

## 🎯 Resumo para Developer

**O que fazer agora:**

1. **Copie** `src/MIGRATION_CLINIC_FIRST.sql` → Supabase Console SQL Editor → Execute
2. **Implemente** 3 Edge Functions (código acima pronto para copiar)
3. **Integre** routes + Login.tsx (simples, tipo copy-paste)
4. **Teste** clinic signup → invite → accept flows

**Tempo estimado:** 4-5 horas para completo

**PROs:**
- ✅ Arquitetura multi-tenant clara
- ✅ Isolamento de dados via RLS
- ✅ Segurança aumentada
- ✅ Compliance LGPD pronto

---

## 🔗 Links Úteis

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [RLS Policies Best Practices](https://supabase.com/docs/guides/auth#policies)
- [Clinic-First Architecture](./CLINIC_FIRST_IMPLEMENTATION.md)
