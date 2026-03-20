# 🔧 Correção do Erro de Cadastro de Usuários

## ❌ Problema Identificado

O erro ocorre porque a **trigger `handle_new_user`** no banco de dados Supabase está desatualizada e não está inserindo todos os campos necessários na tabela `profiles`.

**Mensagem de erro:**
```
Erro no banco de dados ao criar perfil: Database error creating new user. 
Verifique se o schema do banco está atualizado.
```

## 🎯 Causa Raiz

A trigger `handle_new_user` estava inserindo apenas 8 campos na tabela `profiles`:
- `id`, `name`, `email`, `role`, `specialty`, `crm`, `phone`, `initials`

Mas estava faltando:
- ❌ `crm_uf` - UF do CRM
- ❌ `status` - Status do usuário (active/inactive)
- ❌ `full_name` - Nome completo alternativo

## ✅ Solução

### Passo 1: Atualizar a Trigger no Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Cole o seguinte código SQL:

```sql
-- ═════════════════════════════════════════════════════════════════════════════
-- Atualização da Trigger handle_new_user
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role, specialty, crm, crm_uf, phone, initials, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'doctor'),
    COALESCE(NEW.raw_user_meta_data->>'specialty', ''),
    COALESCE(NEW.raw_user_meta_data->>'crm', ''),
    COALESCE(NEW.raw_user_meta_data->>'crm_uf', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'initials', UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))),
    COALESCE((NEW.raw_user_meta_data->>'status')::active_status, 'active')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block user creation
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  -- Re-raise to rollback the transaction
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar a trigger (caso precise)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

5. Clique em **Run** (ou pressione `Ctrl/Cmd + Enter`)
6. Verifique se a mensagem de sucesso aparece

### Passo 2: Verificar a Tabela Profiles

Certifique-se de que a tabela `profiles` existe com todos os campos necessários:

```sql
-- Verificar estrutura da tabela profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**Campos esperados:**
- `id` (uuid, NOT NULL)
- `name` (text, NOT NULL, default '')
- `email` (text, NOT NULL, default '')
- `role` (user_role enum, NOT NULL, default 'doctor')
- `specialty` (text, default '')
- `crm` (text, default '')
- `crm_uf` (text, default '')
- `phone` (text, default '')
- `initials` (text, default '')
- `avatar_url` (text, nullable)
- `status` (active_status enum, NOT NULL, default 'active')
- `last_login` (timestamp, nullable)
- `created_at` (timestamp, NOT NULL, default now())
- `updated_at` (timestamp, NOT NULL, default now())

### Passo 3: Verificar ENUMs

Verifique se os tipos ENUM estão criados:

```sql
-- Verificar ENUM user_role
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Deve retornar: admin, doctor, receptionist, financial

-- Verificar ENUM active_status
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'active_status'::regtype
ORDER BY enumsortorder;

-- Deve retornar: active, inactive
```

Se os ENUMs não existirem, crie-os:

```sql
-- Criar ENUMs (se não existirem)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist', 'financial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE active_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

### Passo 4: Testar o Cadastro

Agora tente criar um novo usuário no AmplieMed:

1. Acesse a tela de login
2. Clique em **"Não tem conta? Cadastre-se"**
3. Preencha todos os campos:
   - **Nome completo**
   - **E-mail**
   - **Telefone**
   - **Perfil de acesso** (Admin, Médico, Recepcionista ou Financeiro)
   - **Especialidade** (se for médico)
   - **CRM** (se for médico)
   - **Senha** (mínimo 6 caracteres)
   - **Confirmar senha**
4. Clique em **"Criar conta"**

✅ O cadastro deve ser concluído com sucesso e você será automaticamente logado!

## 🔍 Diagnóstico de Problemas

### Se ainda ocorrer erro, verifique:

1. **Logs do Supabase:**
   - Vá em **Database** → **Logs**
   - Procure por erros relacionados à trigger `handle_new_user`

2. **Permissões da tabela profiles:**
   ```sql
   -- Ver policies da tabela profiles
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

3. **Testar a trigger manualmente:**
   ```sql
   -- Inserir um usuário de teste
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
   VALUES ('teste@example.com', crypt('senha123', gen_salt('bf')), now());
   
   -- Verificar se o perfil foi criado
   SELECT * FROM profiles WHERE email = 'teste@example.com';
   ```

## 📋 Checklist de Verificação

- [ ] Trigger `handle_new_user` atualizada com todos os campos
- [ ] Tabela `profiles` existe com todos os campos necessários
- [ ] ENUMs `user_role` e `active_status` criados
- [ ] Trigger `on_auth_user_created` está ativa
- [ ] RLS (Row Level Security) configurado na tabela `profiles`
- [ ] Teste de cadastro realizado com sucesso

## 🎯 Schema Completo

Se preferir, você pode executar o schema completo disponível no arquivo `/SUPABASE_SCHEMA.sql`. Ele contém:
- Todos os ENUMs necessários
- Todas as tabelas (incluindo `profiles`)
- Todas as triggers (incluindo `handle_new_user`)
- Todas as views e índices
- RLS policies

**⚠️ ATENÇÃO:** Executar o schema completo irá recriar todas as tabelas. Faça backup antes!

## 📞 Suporte

Se o problema persistir:

1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do Supabase Dashboard
3. Verifique os logs da Edge Function no Supabase:
   - **Edge Functions** → **make-server-d4766610** → **Logs**

---

**Desenvolvido por:** AmplieMed Team  
**Última atualização:** 16/03/2026
