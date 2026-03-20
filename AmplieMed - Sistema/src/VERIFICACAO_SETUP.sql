-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE VERIFICAÇÃO DO SETUP - AMPLIEMED
-- ══════════════════════════════════════════════════════════════════════════════
-- Execute este SQL DEPOIS de rodar SETUP_COMPLETO_CADASTRO.sql
-- Para validar que tudo está configurado corretamente
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Verificar ENUM user_role
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    enum_values text[];
BEGIN
    SELECT array_agg(enumlabel ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role';
    
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '1. VERIFICANDO ENUM user_role';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    IF enum_values IS NOT NULL THEN
        RAISE NOTICE '✅ ENUM user_role existe';
        RAISE NOTICE '   Valores: %', enum_values;
        
        IF 'admin' = ANY(enum_values) AND 
           'doctor' = ANY(enum_values) AND 
           'receptionist' = ANY(enum_values) AND 
           'financial' = ANY(enum_values) THEN
            RAISE NOTICE '✅ Todos os valores necessários estão presentes';
        ELSE
            RAISE WARNING '⚠️ ENUM está incompleto! Valores esperados: admin, doctor, receptionist, financial';
        END IF;
    ELSE
        RAISE WARNING '❌ ENUM user_role NÃO EXISTE!';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Verificar Tabela profiles
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    table_exists boolean;
    column_count integer;
    rls_enabled boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '2. VERIFICANDO TABELA profiles';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    -- Verificar existência
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ Tabela profiles existe';
        
        -- Contar colunas
        SELECT COUNT(*)
        INTO column_count
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles';
        
        RAISE NOTICE '   Colunas: %', column_count;
        
        -- Verificar RLS
        SELECT relrowsecurity
        INTO rls_enabled
        FROM pg_class
        WHERE oid = 'public.profiles'::regclass;
        
        IF rls_enabled THEN
            RAISE NOTICE '✅ RLS está habilitado';
        ELSE
            RAISE WARNING '⚠️ RLS NÃO está habilitado!';
        END IF;
    ELSE
        RAISE WARNING '❌ Tabela profiles NÃO EXISTE!';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Verificar Função handle_new_user
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    function_exists boolean;
    function_owner text;
    function_security text;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '3. VERIFICANDO FUNÇÃO handle_new_user()';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ Função handle_new_user existe';
        
        -- Pegar owner
        SELECT pg_get_userbyid(proowner)
        INTO function_owner
        FROM pg_proc
        WHERE proname = 'handle_new_user';
        
        RAISE NOTICE '   Owner: %', function_owner;
        
        -- Verificar SECURITY DEFINER
        SELECT CASE WHEN prosecdef THEN 'DEFINER' ELSE 'INVOKER' END
        INTO function_security
        FROM pg_proc
        WHERE proname = 'handle_new_user';
        
        IF function_security = 'DEFINER' THEN
            RAISE NOTICE '✅ SECURITY DEFINER configurado';
        ELSE
            RAISE WARNING '⚠️ SECURITY DEFINER NÃO configurado!';
        END IF;
    ELSE
        RAISE WARNING '❌ Função handle_new_user NÃO EXISTE!';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Verificar Trigger on_auth_user_created
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    trigger_exists boolean;
    trigger_table text;
    trigger_timing text;
    trigger_event text;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '4. VERIFICANDO TRIGGER on_auth_user_created';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger on_auth_user_created existe';
        
        -- Pegar detalhes
        SELECT 
            c.relname,
            CASE 
                WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
                WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
                ELSE 'AFTER'
            END,
            CASE
                WHEN t.tgtype & 4 = 4 THEN 'INSERT'
                WHEN t.tgtype & 8 = 8 THEN 'DELETE'
                WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
            END
        INTO trigger_table, trigger_timing, trigger_event
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE t.tgname = 'on_auth_user_created';
        
        RAISE NOTICE '   Tabela: %', trigger_table;
        RAISE NOTICE '   Timing: %', trigger_timing;
        RAISE NOTICE '   Event: %', trigger_event;
        
        IF trigger_table = 'users' AND trigger_timing = 'AFTER' AND trigger_event = 'INSERT' THEN
            RAISE NOTICE '✅ Trigger configurado corretamente';
        ELSE
            RAISE WARNING '⚠️ Configuração do trigger incorreta!';
        END IF;
    ELSE
        RAISE WARNING '❌ Trigger on_auth_user_created NÃO EXISTE!';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Verificar Políticas RLS
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    policy_count integer;
    policy_record record;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '5. VERIFICANDO POLÍTICAS RLS';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    SELECT COUNT(*)
    INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles';
    
    RAISE NOTICE 'Total de políticas: %', policy_count;
    RAISE NOTICE '';
    
    IF policy_count >= 4 THEN
        RAISE NOTICE '✅ Número adequado de políticas configuradas';
        
        FOR policy_record IN 
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'profiles'
            ORDER BY policyname
        LOOP
            RAISE NOTICE '   • % (%) - % / %', 
                policy_record.policyname, 
                policy_record.cmd,
                COALESCE(LEFT(policy_record.qual, 40), 'N/A'),
                COALESCE(LEFT(policy_record.with_check, 40), 'N/A');
        END LOOP;
    ELSE
        RAISE WARNING '⚠️ Menos de 4 políticas! Esperado: 4, Encontrado: %', policy_count;
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Verificar Permissões
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    service_role_perms text;
    authenticated_perms text;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '6. VERIFICANDO PERMISSÕES';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    -- Verificar service_role
    SELECT string_agg(privilege_type, ', ')
    INTO service_role_perms
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND grantee = 'service_role';
    
    IF service_role_perms IS NOT NULL THEN
        RAISE NOTICE '✅ service_role: %', service_role_perms;
    ELSE
        RAISE WARNING '⚠️ service_role sem permissões!';
    END IF;
    
    -- Verificar authenticated
    SELECT string_agg(privilege_type, ', ')
    INTO authenticated_perms
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND grantee = 'authenticated';
    
    IF authenticated_perms IS NOT NULL THEN
        RAISE NOTICE '✅ authenticated: %', authenticated_perms;
    ELSE
        RAISE WARNING '⚠️ authenticated sem permissões!';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Teste de Inserção na Tabela profiles (simulação)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    test_id uuid := gen_random_uuid();
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '7. TESTE DE INSERÇÃO SIMULADA';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    BEGIN
        -- Tentar inserir um registro de teste
        INSERT INTO public.profiles (id, name, email, role, status)
        VALUES (
            test_id,
            'Teste Setup',
            'teste.setup@verificacao.com',
            'admin'::user_role,
            'active'::active_status
        );
        
        RAISE NOTICE '✅ Inserção de teste SUCESSO';
        
        -- Limpar o teste
        DELETE FROM public.profiles WHERE id = test_id;
        RAISE NOTICE '✅ Limpeza concluída';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ ERRO ao inserir teste: %', SQLERRM;
        RAISE WARNING '   SQLSTATE: %', SQLSTATE;
    END;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- RELATÓRIO FINAL
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    enum_ok boolean;
    table_ok boolean;
    function_ok boolean;
    trigger_ok boolean;
    policies_ok boolean;
    all_ok boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE 'RELATÓRIO FINAL DE VERIFICAÇÃO';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    -- Verificar cada componente
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') INTO enum_ok;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') INTO table_ok;
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') INTO function_ok;
    SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') INTO trigger_ok;
    SELECT COUNT(*) >= 4 INTO policies_ok FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
    
    all_ok := enum_ok AND table_ok AND function_ok AND trigger_ok AND policies_ok;
    
    RAISE NOTICE '';
    RAISE NOTICE '┌─────────────────────────────────────────────────────┐';
    RAISE NOTICE '│ Componente                   │ Status              │';
    RAISE NOTICE '├─────────────────────────────────────────────────────┤';
    RAISE NOTICE '│ ENUM user_role               │ %                  │', CASE WHEN enum_ok THEN '✅ OK' ELSE '❌ FALTA' END;
    RAISE NOTICE '│ Tabela profiles              │ %                  │', CASE WHEN table_ok THEN '✅ OK' ELSE '❌ FALTA' END;
    RAISE NOTICE '│ Função handle_new_user       │ %                  │', CASE WHEN function_ok THEN '✅ OK' ELSE '❌ FALTA' END;
    RAISE NOTICE '│ Trigger on_auth_user_created │ %                  │', CASE WHEN trigger_ok THEN '✅ OK' ELSE '❌ FALTA' END;
    RAISE NOTICE '│ Políticas RLS (mín. 4)      │ %                  │', CASE WHEN policies_ok THEN '✅ OK' ELSE '❌ FALTA' END;
    RAISE NOTICE '└─────────────────────────────────────────────────────┘';
    RAISE NOTICE '';
    
    IF all_ok THEN
        RAISE NOTICE '🎉🎉🎉 TUDO CONFIGURADO CORRETAMENTE! 🎉🎉🎉';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Você pode prosseguir com os testes de cadastro!';
        RAISE NOTICE '✅ Consulte o arquivo GUIA_TESTE_CADASTRO.md';
    ELSE
        RAISE WARNING '⚠️⚠️⚠️ EXISTEM PROBLEMAS NA CONFIGURAÇÃO! ⚠️⚠️⚠️';
        RAISE WARNING '';
        RAISE WARNING '❌ Execute novamente o arquivo SETUP_COMPLETO_CADASTRO.sql';
        RAISE WARNING '❌ Ou corrija os itens marcados com ❌ acima';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
