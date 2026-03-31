-- Allow authenticated users to see all profiles for the chat system
-- This is needed so users can find and message each other

-- First, check if RLS is enabled (it likely is)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policy if present (ignore error if not exists)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Allow all authenticated users to SELECT all profiles
-- This is safe because profiles only contain name, role, specialty etc.
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow users to UPDATE only their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow INSERT for service role (signup flow) 
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);
