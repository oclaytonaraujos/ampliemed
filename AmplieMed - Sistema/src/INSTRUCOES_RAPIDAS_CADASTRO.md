# 🚀 Instruções Rápidas - Correção do Cadastro

## ⚡ Solução Rápida (5 minutos)

### 1️⃣ Acesse o Supabase
Vá em: https://app.supabase.com → Seu Projeto → **SQL Editor**

### 2️⃣ Execute este SQL
Cole e execute (Ctrl/Cmd + Enter):

```sql
-- Atualizar trigger para incluir todos os campos
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
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3️⃣ Teste o Cadastro
1. Volte para o AmplieMed
2. Clique em "Não tem conta? Cadastre-se"
3. Preencha os dados e clique em "Criar conta"
4. ✅ Deve funcionar!

---

## 🔧 O Que Foi Corrigido?

### Antes (❌ Com Erro):
A trigger só salvava 8 campos, faltando `crm_uf` e `status`.

### Depois (✅ Funcionando):
A trigger agora salva **todos os 10 campos** necessários:
- ✅ `id`, `name`, `email`
- ✅ `role`, `specialty`, `crm`, `crm_uf`
- ✅ `phone`, `initials`, `status`

---

## ❓ Ainda com Problemas?

### Erro: "relation profiles does not exist"
**Solução:** Execute o schema completo em `/SUPABASE_SCHEMA.sql`

### Erro: "type user_role does not exist"
**Solução:** Execute isso no SQL Editor:
```sql
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist', 'financial');
CREATE TYPE active_status AS ENUM ('active', 'inactive');
```

### Erro: "duplicate key value violates unique constraint"
**Solução:** Este e-mail já está cadastrado. Use outro e-mail ou faça login.

---

## 📋 Perfis de Acesso Disponíveis

Ao criar uma conta, escolha um perfil:

| Perfil | Descrição | Campos Obrigatórios |
|--------|-----------|---------------------|
| **👨‍⚕️ Médico** | Acesso total ao prontuário, prescrições, atestados | Nome, Email, Senha, CRM, Especialidade |
| **👔 Administrador** | Acesso total ao sistema, configurações, relatórios | Nome, Email, Senha |
| **👩‍💼 Recepcionista** | Agendamentos, pacientes, fila de espera | Nome, Email, Senha |
| **💰 Financeiro** | Módulo financeiro, cobranças, relatórios | Nome, Email, Senha |

---

**Precisa de mais ajuda?** Veja `/CORRECAO_CADASTRO_USUARIOS.md` para instruções detalhadas.
