# ❌ ERRO: Failed to fetch - Servidor Indisponível

## 🔍 DIAGNÓSTICO

O erro **"Failed to fetch"** acontece porque o **Edge Function (servidor backend) não está deployado** no Supabase.

### Stack Atual:
- ✅ **Frontend**: React rodando localmente
- ✅ **Banco de dados**: PostgreSQL no Supabase (configurado)
- ✅ **Trigger**: `handle_new_user` criada e funcionando
- ❌ **Edge Function**: `/supabase/functions/server/index.tsx` NÃO deployado

### O que está acontecendo:
1. Usuário preenche formulário de cadastro
2. Frontend chama `api.signup()` em `/utils/api.ts`
3. `api.signup()` faz `POST` para:
   ```
   https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/make-server-d4766610/auth/signup
   ```
4. **❌ ERRO**: Edge Function não existe no Supabase → retorna "Failed to fetch"

---

## 🚀 SOLUÇÃO: Deploy do Edge Function

### Opção 1: Deploy via Supabase CLI (Recomendado)

1. **Instale o Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Faça login no Supabase**:
   ```bash
   supabase login
   ```

3. **Link o projeto**:
   ```bash
   supabase link --project-ref suycrqtvipfzrkcmopua
   ```

4. **Deploy da função**:
   ```bash
   supabase functions deploy make-server-d4766610
   ```

5. **Configure as secrets (environment variables)**:
   ```bash
   # Já configuradas automaticamente pelo Figma Make:
   # - SUPABASE_URL
   # - SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   ```

---

### Opção 2: Deploy Manual via Dashboard

1. Abra **Supabase Dashboard** → Seu projeto
2. Vá em **Edge Functions** (menu lateral esquerdo)
3. Clique em **Create Function**
4. **Nome**: `make-server-d4766610`
5. Cole TODO o conteúdo de `/supabase/functions/server/index.tsx`
6. Clique em **Deploy**
7. Aguarde o deploy completar (pode levar 1-2 minutos)

---

### Opção 3: Verificar se já está deployado

Execute no terminal (ou abra no navegador):
```bash
curl https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/make-server-d4766610/health
```

**Resultado esperado:**
```json
{"status":"ok","timestamp":"2026-03-16T..."}
```

**Se retornar erro 404** → Edge Function NÃO está deployado

---

## 📋 CHECKLIST PÓS-DEPLOY

Após o deploy, teste o cadastro:

### 1️⃣ Teste Health Check
```bash
curl https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/make-server-d4766610/health
```

### 2️⃣ Teste Cadastro
No navegador:
1. Abra o console (F12)
2. Vá para a tela de cadastro
3. Preencha os dados:
   - Nome: Teste Setup
   - Email: teste@ampliemed.com
   - Telefone: (11) 99999-9999
   - Perfil: Administrador
   - Senha: Teste@123456
   - Confirmar: Teste@123456
4. Clique em "Criar conta"

### 3️⃣ Resultado Esperado

**✅ SUCESSO:**
- Console mostra: `[API] POST https://...auth/signup`
- Console mostra: `✨ [Signup] Starting registration...`
- Console mostra: `✅ [Signup] Profile created successfully`
- Você é redirecionado para o dashboard
- Está logado como "Teste Setup"

**❌ ERRO:**
- Se ainda aparecer "Failed to fetch": Edge Function não foi deployado corretamente
- Se aparecer outro erro: Verifique os logs no Supabase Dashboard → Edge Functions → Logs

---

## 🔎 VERIFICAR LOGS NO SUPABASE

1. Supabase Dashboard → **Edge Functions**
2. Clique em `make-server-d4766610`
3. Vá para aba **Logs**
4. Procure por logs começando com:
   - `✨ [Signup] Starting registration...`
   - `✅ [Signup] Profile created successfully`
   - `❌ [Signup] Auth creation failed...`

---

## 🐛 DEBUG AVANÇADO

Se após o deploy ainda houver problemas:

### 1. Verificar se a função está rodando
```bash
supabase functions list
```

### 2. Testar localmente (opcional)
```bash
supabase functions serve make-server-d4766610
```

### 3. Ver logs em tempo real
```bash
supabase functions logs make-server-d4766610 --tail
```

---

## 📝 RESUMO

**CAUSA DO ERRO:**
- Edge Function `/supabase/functions/server/index.tsx` não está deployado

**SOLUÇÃO:**
- Deploy via Supabase CLI: `supabase functions deploy make-server-d4766610`
- OU deploy manual via Dashboard

**APÓS O DEPLOY:**
- Teste o health check
- Teste o cadastro de usuário
- Verifique os logs

---

## ✅ STATUS FINAL ESPERADO

```
✅ Trigger handle_new_user criada
✅ ENUM user_role configurado
✅ Tabela profiles configurada
✅ Políticas RLS configuradas
✅ Edge Function deployada
✅ Cadastro funcionando
```

---

**Última atualização:** 16/03/2026
