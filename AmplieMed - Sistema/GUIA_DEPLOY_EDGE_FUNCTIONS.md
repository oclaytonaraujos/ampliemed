# 🚀 Guia de Deploy das Edge Functions

Este guia detalha como fazer o deploy das 3 Edge Functions necessárias para o sistema Clinic-First funcionar completamente.

---

## Opção 1: Deploy via Supabase Dashboard (Recomendado - Mais Rápido)

### Preparação - Copiar Código das Funções

#### 1️⃣ Função: auth/clinic-signup

**Via Supabase Dashboard:**

1. Acesse: https://app.supabase.com/project/suycrqtvipfzrkcmopua
2. Vá para: **Functions** (lado esquerdo)
3. Clique: **Create New Function**
4. Nome: `auth-clinic-signup`
5. Selecione: **Hello World** template
6. Cole o código abaixo:

```typescript
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clínicName, cnpj, email, password, ownerName, lgpdConsent } =
      await req.json();

    // Validações
    if (!clínicName || !cnpj || !email || !password || !lgpdConsent) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // 1. Create Auth User
    const { data: { user }, error: authError } =
      await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return new Response(JSON.stringify({ success: false, message: "Erro ao criar usuário de autenticação", error: authError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 2. Create Clinic Record
    const { data: clinic, error: clinicError } =
      await supabaseClient
        .from("clinics")
        .insert([
          {
            name: clínicName,
            cnpj: cnpj,
            email: email,
            owner_id: user?.id,
            status: "active",
          },
        ])
        .select()
        .single();

    if (clinicError) {
      return new Response(JSON.stringify({ success: false, message: "Erro ao criar clínica", error: clinicError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 3. Create Clinic Membership (Admin)
    const { error: membershipError } = await supabaseClient
      .from("clinic_memberships")
      .insert([
        {
          clinic_id: clinic.id,
          user_id: user?.id,
          role: "admin",
          active: true,
        },
      ]);

    if (membershipError) {
      return new Response(JSON.stringify({ success: false, message: "Erro ao criar membership", error: membershipError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 4. Create Audit Log
    await supabaseClient.from("audit_log").insert([
      {
        owner_id: user?.id,
        clinic_id: clinic.id,
        user_name: ownerName || email,
        action: "clinic_registered",
        module: "auth",
        description: `Clínica "${clínicName}" registrada`,
        status: "success",
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Clínica criada com sucesso",
        clinic,
        user: {
          id: user?.id,
          email: user?.email,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
```

---

#### 2️⃣ Função: auth/accept-clinic-invite

**Via Supabase Dashboard:**

1. Clique: **Create New Function** (novamente)
2. Nome: `auth-accept-clinic-invite`
3. Selecione: **Hello World** template
4. Cole o código:

```typescript
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, email, password, name, crm, specialty } = await req.json();

    if (!token || !email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Token, email e password são obrigatórios",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Validate Token
    const { data: inviteToken, error: tokenError } = await supabaseClient
      .from("clinic_invite_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !inviteToken) {
      return new Response(
        JSON.stringify({ success: false, message: "Token inválido ou expirado" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Check Expiry
    if (new Date(inviteToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: "Token expirado" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Create Auth User
    const { data: { user }, error: authError } =
      await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao criar usuário", error: authError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Create Clinic Membership
    const { error: membershipError } = await supabaseClient
      .from("clinic_memberships")
      .insert([
        {
          clinic_id: inviteToken.clinic_id,
          user_id: user?.id,
          role: inviteToken.role || "doctor",
          active: true,
        },
      ]);

    if (membershipError) {
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao criar membership", error: membershipError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Create Professional Record (if applicable)
    if (specialty || crm) {
      await supabaseClient.from("professionals").insert([
        {
          owner_id: inviteToken.created_by,
          user_id: user?.id,
          clinic_id: inviteToken.clinic_id,
          name: name || email,
          crm: crm || "",
          specialty: specialty || "",
          email: email,
          status: "active",
        },
      ]);
    }

    // 6. Mark Token as Used
    await supabaseClient
      .from("clinic_invite_tokens")
      .update({ used_at: new Date().toISOString(), used_by: user?.id })
      .eq("id", inviteToken.id);

    // 7. Create Audit Log
    await supabaseClient.from("audit_log").insert([
      {
        owner_id: user?.id,
        clinic_id: inviteToken.clinic_id,
        user_name: name || email,
        action: "invite_accepted",
        module: "auth",
        description: `Convite aceito por ${email}`,
        status: "success",
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Convite aceito com sucesso",
        user: { id: user?.id, email: user?.email },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

---

#### 3️⃣ Função: clinic/invite

**Via Supabase Dashboard:**

1. Clique: **Create New Function** (novamente)
2. Nome: `clinic-invite`
3. Selecione: **Hello World** template
4. Cole o código:

```typescript
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function generateToken() {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clinicId, invitedEmail, role, userId } = await req.json();

    if (!clinicId || !invitedEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "clinicId e invitedEmail são obrigatórios",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Verify User is Clinic Admin
    const { data: membership } = await supabaseClient
      .from("clinic_memberships")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "admin") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Apenas admins podem gerar convites",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 2. Generate Invite Token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 horas

    // 3. Create Invite Record
    const { data: invite, error: inviteError } = await supabaseClient
      .from("clinic_invite_tokens")
      .insert([
        {
          clinic_id: clinicId,
          token: token,
          invited_email: invitedEmail,
          role: role || "doctor",
          created_by: userId,
          expires_at: expiresAt.toISOString(),
          metadata: {
            created_at: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (inviteError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Erro ao gerar convite",
          error: inviteError.message,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Create Audit Log
    await supabaseClient.from("audit_log").insert([
      {
        owner_id: userId,
        clinic_id: clinicId,
        user_name: "Admin",
        action: "invite_generated",
        module: "clinic",
        description: `Convite gerado para ${invitedEmail}`,
        status: "success",
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Convite gerado com sucesso",
        token: invite.token,
        expiresAt: expiresAt.toISOString(),
        inviteLink: `${Deno.env.get("CLIENT_URL")}/accept-invite?token=${token}`,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

---

## ✅ Próximas Etapas Após Deploy

Após fazer o deploy das 3 funções no Supabase Dashboard:

1. **Testar as Edge Functions:**
   - No Supabase Dashboard, vá para cada função
   - Clique no botão **Test** 
   - Verifique se retornam 200 OK

2. **Testar o Fluxo Completo:**
   - Acesse: `http://localhost:5173/registrar-clinica`
   - Preencha o formulário de cadastro
   - Verifique se a clínica é criada no banco de dados

3. **Validar Dados:**
   - Supabase Dashboard → SQL Editor
   - Execute: `SELECT * FROM clinics;` (verá a clínica criada)
   - Execute: `SELECT * FROM clinic_memberships;` (verá o admin adicionado)

---

## 🆘 Troubleshooting

**Erro 401 - Unauthorized:**
- Significa que o SUPABASE_SERVICE_ROLE_KEY não está configurado
- Vá em: Supabase Dashboard → Project Settings → API
- Copie a "Service Role Key"
- Cada função precisa usar essa chave

**Erro 404 - Function Not Found:**
- Significa que a função não foi criada corretamente
- Verifique o nome exato da função
- Recrie-a se necessário

**Erro de Validação:**
- Verifique se enviou todos os campos obrigatórios
- Verifique o formato do JSON enviado

---

## 📍 URLs de Produção

Após o deploy, as funções estarão disponíveis em:

```
POST https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/auth-clinic-signup
POST https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/auth-accept-clinic-invite
POST https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/clinic-invite
```

O arquivo `src/utils/api.ts` já está configurado para usar essas URLs.

---

**Status:** ✅ Pronto para produção!
