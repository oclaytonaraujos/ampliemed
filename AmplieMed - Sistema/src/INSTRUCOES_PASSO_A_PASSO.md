# 📖 INSTRUÇÕES PASSO A PASSO - AMPLIEMED

## 🎯 OBJETIVO
Configurar completamente o sistema de cadastro de usuários do AmplieMed e resolver de vez o erro "Database error creating new user".

---

## ⏱️ TEMPO ESTIMADO
- Setup: 5 minutos
- Testes: 10 minutos
- **Total: 15 minutos**

---

## 📂 ARQUIVOS QUE VOCÊ PRECISA

Estes arquivos foram criados para você:

1. ✅ `/SETUP_COMPLETO_CADASTRO.sql` - SQL principal
2. ✅ `/VERIFICACAO_SETUP.sql` - Validação do setup
3. ✅ `/GUIA_TESTE_CADASTRO.md` - Testes detalhados
4. ✅ `/SOLUCAO_FINAL.md` - Documentação técnica
5. ✅ Este arquivo - Instruções passo a passo

---

## 🚀 PARTE 1: CONFIGURAÇÃO DO BANCO (5 minutos)

### PASSO 1.1: Acessar Supabase Dashboard

1. Abra seu navegador
2. Acesse: https://supabase.com
3. Faça login
4. Selecione o projeto **AmplieMed**

---

### PASSO 1.2: Abrir SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique no botão **"+ New query"** (ou Ctrl+N)
3. Uma aba em branco vai abrir

---

### PASSO 1.3: Executar Setup Principal

1. Abra o arquivo `/SETUP_COMPLETO_CADASTRO.sql` no seu editor de código
2. Copie **TODO O CONTEÚDO** (Ctrl+A, depois Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)
4. Clique no botão **"RUN"** (ou pressione Ctrl+Enter)
5. **AGUARDE** a execução completa (pode levar 10-20 segundos)

---

### PASSO 1.4: Verificar Resultado

Após a execução, role até o final dos logs e procure por:

```
🎉 SETUP COMPLETO E VALIDADO COM SUCESSO!
✅ O sistema de cadastro está pronto para uso!
```

**✅ Se você viu essa mensagem:** Perfeito! Prossiga para o Passo 1.5.

**❌ Se você NÃO viu ou houve erro:**
1. Copie TODA a mensagem de erro
2. Me envie para análise
3. **NÃO PROSSIGA** sem resolver

---

### PASSO 1.5: Validar Setup (Opcional mas Recomendado)

Para ter certeza absoluta:

1. Clique em **"+ New query"** novamente
2. Abra o arquivo `/VERIFICACAO_SETUP.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **"RUN"**

Você deve ver uma tabela como:

```
┌─────────────────────────────────────────────────────┐
│ Componente                   │ Status              │
├─────────────────────────────────────────────────────┤
│ ENUM user_role               │ ✅ OK               │
│ Tabela profiles              │ ✅ OK               │
│ Função handle_new_user       │ ✅ OK               │
│ Trigger on_auth_user_created │ ✅ OK               │
│ Políticas RLS (mín. 4)      │ ✅ OK               │
└─────────────────────────────────────────────────────┘

🎉🎉🎉 TUDO CONFIGURADO CORRETAMENTE! 🎉🎉🎉
```

**✅ Se todos os itens estão OK:** Excelente! Prossiga para a Parte 2.

**❌ Se algum item está com ❌:**
1. Execute novamente o SETUP_COMPLETO_CADASTRO.sql
2. Se o erro persistir, me envie os logs

---

## 🧪 PARTE 2: TESTES DO SISTEMA (10 minutos)

### PASSO 2.1: Acessar Aplicação

1. Abra a aplicação AmplieMed no navegador
2. Se estiver logado, faça **logout**
3. Você deve estar na tela de **Login**

---

### PASSO 2.2: Ir para Tela de Cadastro

1. Na tela de login, procure o link **"Criar conta"** ou **"Cadastrar"**
2. Clique nele
3. Você será redirecionado para a tela de cadastro

---

### PASSO 2.3: Teste 1 - Cadastro de Administrador

Preencha o formulário:

| Campo | Valor |
|-------|-------|
| **Nome completo** | João Silva Admin |
| **E-mail** | joao.admin@ampliemed.com.br |
| **Telefone** | (11) 98765-4321 |
| **Perfil de acesso** | Administrador |
| **Senha** | Admin@123456 |
| **Confirmar senha** | Admin@123456 |

**Ações:**
1. Preencha todos os campos conforme tabela acima
2. Clique em **"Criar conta"** ou **"Cadastrar"**
3. Aguarde o processamento

**Resultado esperado:**
- ✅ Mensagem de sucesso
- ✅ Você é automaticamente logado
- ✅ Redirecionado para o dashboard

**Se funcionou:** ⭐ SUCESSO! Continue com o Teste 2.

**Se deu erro:**
1. Abra o Console do navegador (F12)
2. Vá para a aba "Console"
3. Copie todas as mensagens de erro em vermelho
4. Me envie para análise

---

### PASSO 2.4: Teste 2 - Cadastro de Médico

1. Faça **logout** (se estiver logado)
2. Vá para a tela de cadastro novamente

Preencha:

| Campo | Valor |
|-------|-------|
| **Nome completo** | Dra. Maria Santos |
| **E-mail** | maria.santos@ampliemed.com.br |
| **Telefone** | (11) 91234-5678 |
| **Perfil de acesso** | Médico |
| **Especialidade** | Cardiologia |
| **CRM** | 123456 |
| **Senha** | Medico@123 |
| **Confirmar senha** | Medico@123 |

**Observação:** Os campos Especialidade e CRM devem **aparecer automaticamente** ao selecionar "Médico".

**Resultado esperado:**
- ✅ Campos Especialidade e CRM aparecem
- ✅ Cadastro realizado com sucesso
- ✅ Login automático

---

### PASSO 2.5: Teste 3 - Cadastro de Recepcionista

1. Faça logout
2. Vá para tela de cadastro

Preencha:

| Campo | Valor |
|-------|-------|
| **Nome completo** | Carlos Recepcionista |
| **E-mail** | carlos.recep@ampliemed.com.br |
| **Telefone** | (11) 95555-4444 |
| **Perfil de acesso** | Recepcionista |
| **Senha** | Recep@123 |
| **Confirmar senha** | Recep@123 |

**Observação:** Os campos Especialidade e CRM **NÃO devem aparecer**.

**Resultado esperado:**
- ✅ Apenas campos básicos visíveis
- ✅ Cadastro OK

---

### PASSO 2.6: Teste 4 - Cadastro de Financeiro

1. Faça logout
2. Vá para tela de cadastro

Preencha:

| Campo | Valor |
|-------|-------|
| **Nome completo** | Ana Financeiro |
| **E-mail** | ana.fin@ampliemed.com.br |
| **Telefone** | (11) 94444-3333 |
| **Perfil de acesso** | Financeiro |
| **Senha** | Financ@123 |
| **Confirmar senha** | Financ@123 |

**Resultado esperado:**
- ✅ Cadastro OK

---

## ✅ PARTE 3: VALIDAÇÃO NO BANCO (5 minutos)

### PASSO 3.1: Verificar Usuários Criados

1. Volte ao Supabase Dashboard
2. Vá em **SQL Editor**
3. Nova query

Cole e execute:

```sql
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE '%@ampliemed.com.br'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- ✅ 4 linhas (um usuário para cada teste)
- ✅ Emails corretos
- ✅ Roles corretos

---

### PASSO 3.2: Verificar Perfis Criados

Cole e execute:

```sql
SELECT 
    id,
    name,
    email,
    role,
    specialty,
    crm,
    status
FROM public.profiles
WHERE email LIKE '%@ampliemed.com.br'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- ✅ 4 linhas (um perfil para cada usuário)
- ✅ `role` correto para cada um
- ✅ `specialty` e `crm` preenchidos apenas para o médico
- ✅ Todos com `status = 'active'`

---

### PASSO 3.3: Verificar Correspondência

Cole e execute:

```sql
SELECT 
    u.email,
    p.name,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN '❌ SEM PERFIL'
        ELSE '✅ OK'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@ampliemed.com.br'
ORDER BY u.created_at DESC;
```

**Resultado esperado:**
- ✅ Todos com status "✅ OK"
- ✅ Nenhum "❌ SEM PERFIL"

---

## 🎉 RESULTADO FINAL

Se você completou TODAS as etapas acima com sucesso:

### ✅ O QUE ESTÁ FUNCIONANDO:

- ✅ Cadastro de novos usuários
- ✅ Validação de campos
- ✅ Criação automática de perfil via trigger
- ✅ Fallback manual se trigger falhar
- ✅ Login automático após cadastro
- ✅ Todos os 4 tipos de perfil (admin, doctor, receptionist, financial)
- ✅ Campos dinâmicos (especialidade/CRM para médicos)
- ✅ Segurança com RLS

### 🚀 PRÓXIMOS PASSOS:

1. ✅ Convide outros usuários para se cadastrarem
2. ✅ Comece a usar o sistema normalmente
3. ✅ Se tiver dúvidas, consulte `/SOLUCAO_FINAL.md`

---

## 🆘 SE ALGO DEU ERRADO

### Cenário 1: Erro no Setup SQL

**Sintoma:** Mensagens de erro ao executar SETUP_COMPLETO_CADASTRO.sql

**Solução:**
1. Copie a mensagem de erro COMPLETA
2. Envie para mim
3. Não tente modificar o SQL sem orientação

---

### Cenário 2: Cadastro Não Funciona

**Sintoma:** Erro ao tentar criar conta na aplicação

**Solução:**
1. Abra Console do navegador (F12)
2. Vá para aba "Network"
3. Tente fazer cadastro novamente
4. Procure requisição que falhou (em vermelho)
5. Clique nela e copie:
   - Request URL
   - Response (aba Response)
   - Headers (aba Headers)
6. Envie tudo para mim

---

### Cenário 3: Usuário Criado mas Sem Perfil

**Sintoma:** Registro em `auth.users` mas não em `profiles`

**Solução:**
1. Execute VERIFICACAO_SETUP.sql
2. Verifique se trigger está OK
3. Veja logs do Supabase em **Database > Logs**
4. Procure por warnings com "handle_new_user"
5. Copie e me envie

---

## 📞 CONTATO E SUPORTE

Ao me contatar, SEMPRE envie:

1. ✅ Qual passo você está (exemplo: "Passo 2.3")
2. ✅ Mensagem de erro COMPLETA (não resuma)
3. ✅ Logs do Console do navegador (F12)
4. ✅ Print da tela se relevante

Quanto mais informação, mais rápido consigo ajudar!

---

## 📊 CHECKLIST FINAL

Antes de considerar concluído, marque:

- [ ] Executei SETUP_COMPLETO_CADASTRO.sql com sucesso
- [ ] Vi mensagem "🎉 SETUP COMPLETO E VALIDADO COM SUCESSO!"
- [ ] Executei VERIFICACAO_SETUP.sql e todos os itens estão ✅
- [ ] Teste 1 (Admin) funcionou
- [ ] Teste 2 (Médico) funcionou
- [ ] Teste 3 (Recepcionista) funcionou
- [ ] Teste 4 (Financeiro) funcionou
- [ ] Verificação no banco mostrou 4 usuários
- [ ] Verificação no banco mostrou 4 perfis
- [ ] Todos os perfis têm correspondência com usuários
- [ ] Não há erros no Console do navegador

**Se TODOS os itens estão marcados:** 🎉 PARABÉNS! Seu sistema está 100% funcional!

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0  
**Tempo total estimado:** 15-20 minutos
