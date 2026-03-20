# 🧪 GUIA COMPLETO DE TESTE E VALIDAÇÃO DO CADASTRO

## 📋 PRÉ-REQUISITOS

Antes de começar, você DEVE executar o SQL completo:

### ✅ Passo 1: Executar o Setup no Supabase

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá em **SQL Editor**
3. Abra o arquivo `/SETUP_COMPLETO_CADASTRO.sql`
4. Cole **TODO O CONTEÚDO** no editor SQL
5. Clique em **Run** (ou Ctrl+Enter)
6. Aguarde a execução completa

### 📊 Verificar Logs do Setup

Após executar, você deve ver mensagens como:

```
NOTICE: ENUM user_role criado com sucesso
NOTICE: Tabela profiles encontrada
NOTICE: Trigger e função antigas removidas
NOTICE: Função handle_new_user criada com sucesso
NOTICE: Trigger on_auth_user_created criado com sucesso
NOTICE: Políticas RLS configuradas com sucesso
NOTICE: Permissões configuradas com sucesso
NOTICE: ══════════════════════════════════════════════════════════
NOTICE: VERIFICAÇÃO FINAL DO SETUP
NOTICE: ══════════════════════════════════════════════════════════
NOTICE: ✓ ENUM user_role existe: true
NOTICE: ✓ Tabela profiles existe: true
NOTICE: ✓ Função handle_new_user existe: true
NOTICE: ✓ Trigger on_auth_user_created existe: true
NOTICE: ✓ RLS habilitado: true
NOTICE: ✓ Políticas RLS configuradas: 4 políticas
NOTICE: ══════════════════════════════════════════════════════════
NOTICE: 🎉 SETUP COMPLETO E VALIDADO COM SUCESSO!
NOTICE: ✅ O sistema de cadastro está pronto para uso!
NOTICE: ══════════════════════════════════════════════════════════
```

### ⚠️ Se der erro

Se algum item falhar, copie a mensagem de erro completa e me envie. Não prossiga para os testes sem que todos os checks estejam ✅.

---

## 🧪 TESTES DO SISTEMA DE CADASTRO

### Teste 1: Cadastro de Administrador

1. **Acesse a tela de cadastro** no seu app
2. **Preencha os campos:**
   - **Nome completo:** João Silva Administrador
   - **E-mail:** admin.teste@ampliemed.com
   - **Telefone:** (11) 98765-4321
   - **Perfil de acesso:** Administrador
   - **Senha:** Admin@123456
   - **Confirmar senha:** Admin@123456

3. **Clique em "Criar conta"**

4. **Resultado esperado:**
   - ✅ Mensagem de sucesso
   - ✅ Login automático
   - ✅ Redirecionamento para o dashboard

### Teste 2: Cadastro de Médico (com CRM)

1. **Faça logout** (se estiver logado)
2. **Acesse a tela de cadastro**
3. **Preencha os campos:**
   - **Nome completo:** Dra. Maria Santos
   - **E-mail:** maria.santos@ampliemed.com
   - **Telefone:** (11) 91234-5678
   - **Perfil de acesso:** Médico
   - **Especialidade:** Cardiologia
   - **CRM:** 123456
   - **Senha:** Medico@123456
   - **Confirmar senha:** Medico@123456

4. **Clique em "Criar conta"**

5. **Resultado esperado:**
   - ✅ Campos de Especialidade e CRM aparecem ao selecionar "Médico"
   - ✅ Cadastro realizado com sucesso
   - ✅ Login automático

### Teste 3: Cadastro de Recepcionista

1. **Faça logout**
2. **Acesse a tela de cadastro**
3. **Preencha:**
   - **Nome:** Carlos Recepcionista
   - **E-mail:** carlos.recep@ampliemed.com
   - **Telefone:** (11) 95555-4444
   - **Perfil:** Recepcionista
   - **Senha:** Recep@123456
   - **Confirmar senha:** Recep@123456

4. **Resultado esperado:**
   - ✅ Campos de Especialidade/CRM NÃO aparecem
   - ✅ Cadastro OK

### Teste 4: Cadastro de Financeiro

1. **Faça logout**
2. **Preencha:**
   - **Nome:** Ana Financeiro
   - **E-mail:** ana.fin@ampliemed.com
   - **Perfil:** Financeiro
   - **Senha:** Financ@123456

3. **Resultado esperado:**
   - ✅ Cadastro OK

---

## 🔍 VALIDAÇÃO NO BANCO DE DADOS

### Verificar Usuários Criados

Execute no SQL Editor:

```sql
-- Ver usuários em auth.users
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'role' as role
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado:** Todos os 4 usuários de teste devem aparecer aqui.

### Verificar Perfis Criados

```sql
-- Ver perfis na tabela profiles
SELECT 
    id,
    name,
    email,
    role,
    specialty,
    crm,
    phone,
    status,
    created_at
FROM public.profiles
ORDER BY created_at DESC;
```

**Resultado esperado:** 
- ✅ 4 registros (um para cada teste)
- ✅ Todos com `status = 'active'`
- ✅ `role` correto para cada um
- ✅ `specialty` e `crm` preenchidos apenas para o médico

### Verificar Correspondência

```sql
-- Verificar que todos os usuários têm perfil
SELECT 
    u.id,
    u.email as email_auth,
    p.email as email_profile,
    p.name,
    p.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@ampliemed.com'
ORDER BY u.created_at DESC;
```

**Resultado esperado:**
- ✅ Nenhum perfil NULL
- ✅ E-mails correspondentes

---

## 🐛 TROUBLESHOOTING

### Erro: "Database error creating new user"

**Causa:** A trigger está falhando.

**Solução:**
1. Verifique os logs do Supabase em **Database > Logs**
2. Procure por mensagens de WARNING com "handle_new_user"
3. Execute novamente o SQL de setup
4. Verifique se o ENUM `user_role` tem os valores corretos:

```sql
SELECT enumlabel 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role';
```

Deve retornar:
- admin
- doctor
- receptionist
- financial

### Erro: "Este e-mail já está cadastrado"

**Causa:** O e-mail já foi usado em um teste anterior.

**Solução:**
1. Use um e-mail diferente, OU
2. Delete o usuário existente:

```sql
-- Ver usuários
SELECT id, email FROM auth.users WHERE email = 'email@teste.com';

-- Deletar (substitua o ID)
DELETE FROM public.profiles WHERE id = 'UUID-DO-USUARIO';
-- Nota: auth.users será deletado automaticamente por CASCADE
```

### Erro: "Não foi possível fazer login após cadastro"

**Causa:** Perfil foi criado mas há problema com os metadados.

**Solução:**
1. Verifique se o perfil existe:
```sql
SELECT * FROM public.profiles WHERE email = 'email@teste.com';
```

2. Se não existe, execute a Edge Function manualmente ou crie via SQL:
```sql
INSERT INTO public.profiles (id, name, email, role, status)
SELECT id, 
       raw_user_meta_data->>'name', 
       email, 
       'admin'::user_role,
       'active'::active_status
FROM auth.users 
WHERE email = 'email@teste.com';
```

### Edge Function não está sendo chamada

**Verificar logs:**
1. Abra o **Console do navegador** (F12)
2. Vá para a aba **Network**
3. Tente fazer o cadastro
4. Procure pela requisição para `/functions/v1/make-server-d4766610/auth/signup`
5. Veja o status code e a resposta

**Se a requisição falhar com 404:**
- A Edge Function não está deployada
- Verifique se o arquivo `/supabase/functions/server/index.tsx` foi salvo

**Se falhar com 500:**
- Veja a resposta JSON para entender o erro
- Verifique os logs da Edge Function em **Edge Functions > Logs**

---

## 📝 CHECKLIST FINAL

Antes de considerar o sistema pronto, verifique:

- [ ] Setup SQL executado com sucesso
- [ ] ENUM `user_role` criado
- [ ] Função `handle_new_user()` existe
- [ ] Trigger `on_auth_user_created` existe
- [ ] 4 políticas RLS configuradas
- [ ] Cadastro de Admin funciona
- [ ] Cadastro de Médico funciona (com especialidade/CRM)
- [ ] Cadastro de Recepcionista funciona
- [ ] Cadastro de Financeiro funciona
- [ ] Todos os perfis aparecem em `public.profiles`
- [ ] Login após cadastro funciona automaticamente
- [ ] Não há mensagens de erro no console

## ✅ PRÓXIMOS PASSOS

Se todos os testes passarem:

1. ✅ O sistema está 100% funcional
2. ✅ Você pode começar a usar o AmplieMed em produção
3. ✅ Convide outros usuários para se cadastrarem

Se algum teste falhar, copie os logs de erro e me envie para análise.
