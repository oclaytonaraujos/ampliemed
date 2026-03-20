-- ══════════════════════════════════════════════════════════════════════════════
-- SETUP COMPLETO DO SISTEMA DE CADASTRO - AMPLIEMED
-- ══════════════════════════════════════════════════════════════════════════════
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 1: Garantir que o ENUM user_role existe com valores corretos
-- ──────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist', 'financial');
        RAISE NOTICE 'ENUM user_role criado com sucesso';
    ELSE
        RAISE NOTICE 'ENUM user_role já existe';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 2: Garantir que a tabela profiles existe e está correta
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'Tabela profiles não existe! Execute o schema completo primeiro.';
    ELSE
        RAISE NOTICE 'Tabela profiles encontrada';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 3: Verificar RLS
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE oid = 'public.profiles'::regclass;
    
    IF rls_enabled THEN
        RAISE NOTICE 'RLS está habilitado na tabela profiles';
    ELSE
        RAISE NOTICE 'RLS não está habilitado na tabela profiles';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 4: Remover trigger e função antigas (se existirem)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS handle_new_user();
    RAISE NOTICE 'Trigger e função antigas removidas (se existiam)';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 5: Criar função que cria perfil automaticamente ao criar usuário
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role_value user_role;
    user_name text;
    user_initials text;
BEGIN
    -- Log de início
    RAISE LOG 'handle_new_user INICIADO para user_id: %', NEW.id;
    
    -- Extrair e validar role do metadata
    BEGIN
        user_role_value := COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role,
            'doctor'::user_role
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao converter role, usando padrão doctor: %', SQLERRM;
        user_role_value := 'doctor'::user_role;
    END;
    
    -- Extrair nome
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Calcular iniciais
    user_initials := COALESCE(
        NEW.raw_user_meta_data->>'initials',
        UPPER(LEFT(user_name, 2))
    );
    
    -- Log de valores extraídos
    RAISE LOG 'Valores extraídos - nome: %, role: %, initials: %', user_name, user_role_value, user_initials;
    
    -- Inserir perfil na tabela profiles
    INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        specialty,
        crm,
        crm_uf,
        phone,
        initials,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        user_name,
        NEW.email,
        user_role_value,
        COALESCE(NEW.raw_user_meta_data->>'specialty', ''),
        COALESCE(NEW.raw_user_meta_data->>'crm', ''),
        COALESCE(NEW.raw_user_meta_data->>'crm_uf', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        user_initials,
        'active'::active_status,
        now(),
        now()
    );
    
    RAISE LOG 'Perfil criado com sucesso para user_id: %', NEW.id;
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ERRO em handle_new_user para %: % (SQLSTATE: %)', NEW.email, SQLERRM, SQLSTATE;
    RAISE WARNING 'Detalhes do erro: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Dar permissões corretas à função
DO $$
BEGIN
    ALTER FUNCTION handle_new_user() OWNER TO postgres;
    RAISE NOTICE 'Função handle_new_user criada com sucesso';
END $$;

COMMENT ON FUNCTION handle_new_user() IS 'Cria automaticamente o perfil na tabela profiles quando um novo usuário é criado em auth.users';

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 6: Criar trigger que executa a função
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION handle_new_user();
    
    RAISE NOTICE 'Trigger on_auth_user_created criado com sucesso';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 7: Configurar políticas RLS para permitir criação via trigger
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Habilitar RLS na tabela profiles (se ainda não estiver)
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Remover políticas antigas (se existirem)
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
    DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;

    -- Política 1: Permitir que qualquer um leia seu próprio perfil
    CREATE POLICY "Users can read own profile"
        ON public.profiles
        FOR SELECT
        USING (auth.uid() = id);

    -- Política 2: Permitir que qualquer um atualize seu próprio perfil
    CREATE POLICY "Users can update own profile"
        ON public.profiles
        FOR UPDATE
        USING (auth.uid() = id);

    -- Política 3: Permitir INSERT para service_role (usado pela trigger e Edge Function)
    CREATE POLICY "Enable insert for service role"
        ON public.profiles
        FOR INSERT
        TO service_role
        WITH CHECK (true);

    -- Política 4: Permitir INSERT durante autenticação (para a trigger funcionar)
    CREATE POLICY "Allow trigger to insert profiles"
        ON public.profiles
        FOR INSERT
        WITH CHECK (true);

    RAISE NOTICE 'Políticas RLS configuradas com sucesso';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 8: Garantir permissões corretas
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Dar permissões para o service_role
    GRANT ALL ON public.profiles TO service_role;
    GRANT USAGE ON SCHEMA public TO service_role;

    -- Dar permissões para authenticated users
    GRANT SELECT, UPDATE ON public.profiles TO authenticated;

    RAISE NOTICE 'Permissões configuradas com sucesso';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PASSO 9: Verificação final
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    enum_exists boolean;
    table_exists boolean;
    function_exists boolean;
    trigger_exists boolean;
    rls_enabled boolean;
    policy_count integer;
BEGIN
    -- Verificar ENUM
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) INTO enum_exists;
    
    -- Verificar tabela
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    
    -- Verificar função
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
    ) INTO function_exists;
    
    -- Verificar trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Verificar RLS
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE oid = 'public.profiles'::regclass;
    
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    -- Relatório final
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE 'VERIFICAÇÃO FINAL DO SETUP';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '✓ ENUM user_role existe: %', enum_exists;
    RAISE NOTICE '✓ Tabela profiles existe: %', table_exists;
    RAISE NOTICE '✓ Função handle_new_user existe: %', function_exists;
    RAISE NOTICE '✓ Trigger on_auth_user_created existe: %', trigger_exists;
    RAISE NOTICE '✓ RLS habilitado: %', rls_enabled;
    RAISE NOTICE '✓ Políticas RLS configuradas: % políticas', policy_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    IF enum_exists AND table_exists AND function_exists AND trigger_exists AND rls_enabled AND policy_count >= 4 THEN
        RAISE NOTICE '🎉 SETUP COMPLETO E VALIDADO COM SUCESSO!';
        RAISE NOTICE '✅ O sistema de cadastro está pronto para uso!';
    ELSE
        RAISE WARNING '⚠️ Alguns componentes falharam. Revise os logs acima.';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
