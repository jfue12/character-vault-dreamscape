-- Fix signup profile creation RLS: allow system trigger to insert into profiles
-- The signup flow relies on the on_auth_user_created trigger (SECURITY DEFINER) which runs without a JWT,
-- so auth.uid() is NULL and the previous INSERT policy blocks the insert.

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Only allow inserts from privileged DB roles (trigger / security definer)
CREATE POLICY "System can create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (current_user IN ('postgres', 'supabase_admin'));

-- (Optional safety) If a project ever needs client-side profile creation again,
-- re-add a separate policy auth.uid() = id, but for now we keep inserts system-only.