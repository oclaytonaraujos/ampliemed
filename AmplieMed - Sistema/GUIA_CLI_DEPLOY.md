# 🚀 Deploy Edge Functions via Supabase CLI

## Passo 1: Gerar Access Token

### No Supabase Dashboard:

1. Acesse: https://app.supabase.com/project/suycrqtvipfzrkcmopua
2. Clique em: **Project Settings** (ícone de engrenagem no canto inferior esquerdo)
3. Vá para: **Access Tokens** (lado esquerdo)
4. Clique: **Generate New Token**
   - **Name**: `Deploy Functions`
   - **Scopes**: Selecione todos (ou pelo menos `functions`)
   - Clique: **Generate**
5. **COPIE o token** (aparece uma única vez!)

### Guarde esse token! Você vai usar nos próximos passos.

---

## Passo 2: Configurar o Token Localmente

### Opção A: Via Comando (Temporário - recomendado para teste)

```bash
cd "/workspaces/ampliemed/AmplieMed - Sistema"

# Configure o token como variável de ambiente
export SUPABASE_ACCESS_TOKEN="seu_token_aqui"

# Verifique se funcionou
npx supabase functions list --project-ref suycrqtvipfzrkcmopua
```

### Opção B: Via Login (Permanente)

```bash
cd "/workspaces/ampliemed/AmplieMed - Sistema"

# Login interativo
npx supabase login

# Quando pedir o token de acesso, cole o que você gerou
```

---

## Passo 3: Deploy das 3 Funções

### Comando para cada função:

```bash
cd "/workspaces/ampliemed/AmplieMed - Sistema"

# Deploy função 1
npx supabase functions deploy auth/clinic-signup --project-ref suycrqtvipfzrkcmopua

# Deploy função 2
npx supabase functions deploy auth/accept-clinic-invite --project-ref suycrqtvipfzrkcmopua

# Deploy função 3
npx supabase functions deploy clinic/invite --project-ref suycrqtvipfzrkcmopua
```

### Ou use este script para fazer tudo automaticamente:

```bash
cd "/workspaces/ampliemed/AmplieMed - Sistema"

# Configure o token
export SUPABASE_ACCESS_TOKEN="seu_token_aqui"

# Deploy todas as 3 funções
npx supabase functions deploy auth/clinic-signup --project-ref suycrqtvipfzrkcmopua && \
npx supabase functions deploy auth/accept-clinic-invite --project-ref suycrqtvipfzrkcmopua && \
npx supabase functions deploy clinic/invite --project-ref suycrqtvipfzrkcmopua

echo "✅ Deploy concluído!"
```

---

## Passo 4: Verificar o Deploy

### Listar funções deployadas:

```bash
cd "/workspaces/ampliemed/AmplieMed - Sistema"

npx supabase functions list --project-ref suycrqtvipfzrkcmopua
```

### Esperado ver:

```
auth-clinic-signup
auth-accept-clinic-invite  
clinic-invite
```

---

## Passo 5: Testar as Funções

### Via Supabase Dashboard:

1. Acesse: https://app.supabase.com/project/suycrqtvipfzrkcmopua
2. Vá para: **Functions** (lado esquerdo)
3. Para cada função:
   - Clique na função
   - Clique: **Test** (botão no topo)
   - Envie um payload JSON de teste
   - Verifique o response

### Via cURL (Terminal):

```bash
# Testar auth-clinic-signup
curl -X POST \
  'https://suycrqtvipfzrkcmopua.supabase.co/functions/v1/auth-clinic-signup' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "clínicName": "Clínica Teste",
    "cnpj": "12345678000190",
    "email": "admin@clinica.com",
    "password": "senha123!",
    "ownerName": "João Silva",
    "lgpdConsent": true
  }'
```

---

## 🆘 Troubleshooting

### Erro: "Access token not provided"

**Solução:**
```bash
export SUPABASE_ACCESS_TOKEN="seu_token_aqui"
```

### Erro: "Function not found"

**Solução:**
- Verifique se o arquivo `supabase/functions/auth/clinic-signup/index.ts` existe
- Verifique a estrutura de pastas

### Erro: "Permission denied"

**Solução:**
- Verifique se seu Access Token tem as permissões corretas
- Gere um novo token com escopo "functions"

---

## 📍 Comandos Úteis

```bash
# Ver ajuda
npx supabase functions --help

# Ver logs de uma função
npx supabase functions logs auth-clinic-signup --project-ref suycrqtvipfzrkcmopua

# Criar uma nova função
npx supabase functions new minha-funcao

# Deploy com verbosidade
npx supabase functions deploy auth/clinic-signup --project-ref suycrqtvipfzrkcmopua --debug
```

---

## ✅ Próximos Passos

1. ✅ Gerar Access Token
2. ✅ Rodar os 3 comandos de deploy
3. ✅ Testar as funções no Supabase Dashboard
4. ✅ Testar em http://localhost:5173/registrar-clinica
5. ✅ Verificar data nos Supabase (sql: `SELECT * FROM clinics;`)

**Status:** Pronto para deploy!

---

**Dúvidas?** Cada etapa leva menos de 2 minutos! 🚀
