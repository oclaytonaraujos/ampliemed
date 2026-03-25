#!/usr/bin/env node
/**
 * Deploy Edge Functions via Supabase API
 * 
 * Este script faz o deploy das 3 funções sem precisar do CLI
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://suycrqtvipfzrkcmopua.supabase.co';
const SUPABASE_PROJECT_ID = 'suycrqtvipfzrkcmopua';

// Você precisa gerar um token de acesso
// Vá em: Supabase Dashboard → Project Settings → Access Tokens → Generate New Token
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ ERROR: SUPABASE_ACCESS_TOKEN não está configurado');
  console.error('');
  console.error('Como configurar:');
  console.error('1. Acesse: https://app.supabase.com/project/' + SUPABASE_PROJECT_ID);
  console.error('2. Vá para: Project Settings → Access Tokens');
  console.error('3. Clique: Generate New Token');
  console.error('4. Copie o token e execute:');
  console.error('   export SUPABASE_ACCESS_TOKEN="seu_token_aqui"');
  console.error('5. Execute novamente: node deploy-functions.js');
  process.exit(1);
}

const BASE_URL = `${SUPABASE_URL}/functions/v1`;

const functions = [
  {
    name: 'auth-clinic-signup',
    path: '/auth/clinic-signup',
    description: 'Registra nova clínica e cria usuário admin',
  },
  {
    name: 'auth-accept-clinic-invite',
    path: '/auth/accept-clinic-invite',
    description: 'Profissional aceita convite de clínica',
  },
  {
    name: 'clinic-invite',
    path: '/clinic/invite',
    description: 'Admin gera tokens de convite para profissionais',
  },
];

async function deployFunction(functionName, functionPath) {
  try {
    console.log(`\n📦 Deployando função: ${functionName}...`);
    
    // Construir URL da função
    const functionUrl = `${SUPABASE_URL}/api/v1/functions/${functionName}`;
    
    // Ler código da função local
    const functionFile = path.join(
      __dirname,
      `./supabase/functions${functionPath}/index.ts`
    );
    
    if (!fs.existsSync(functionFile)) {
      console.error(`❌ Arquivo não encontrado: ${functionFile}`);
      return false;
    }
    
    const code = fs.readFileSync(functionFile, 'utf8');
    
    // Fazer request para deploy
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: functionName,
        name: functionName,
        verify_jwt: false,
        imports: [
          'https://esm.sh/@supabase/supabase-js@2.38.4',
        ],
        code: code,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Erro ao fazer deploy: ${response.status}`);
      console.error(error);
      return false;
    }
    
    console.log(`✅ ${functionName} deployado com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao fazer deploy de ${functionName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando deploy das Edge Functions...\n');
  console.log(`Projeto: ${SUPABASE_PROJECT_ID}`);
  console.log(`URL: ${SUPABASE_URL}\n`);
  
  let successCount = 0;
  
  for (const fn of functions) {
    const success = await deployFunction(fn.name, fn.path);
    if (success) successCount++;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Resultado: ${successCount}/${functions.length} funções deployadas com sucesso`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (successCount === functions.length) {
    console.log('✅ Todas as funções foram deployadas com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Teste as funções no Supabase Dashboard');
    console.log('2. Acesse http://localhost:5173/registrar-clinica');
    console.log('3. Preencha e submeta o formulário');
    return 0;
  } else {
    console.log('❌ Algumas funções falharam no deploy');
    return 1;
  }
}

main().then(process.exit).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
