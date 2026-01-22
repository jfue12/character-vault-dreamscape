-- The handle_new_user function is SECURITY DEFINER, which should bypass RLS.
-- However, the trigger context might be different. Let's create a completely open 
-- INSERT policy since profile creation should ONLY happen via the trigger.

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Allow profile creation for new auth users" ON public.profiles;

-- Create a permissive policy that allows inserts when:
-- 1. The id being inserted exists in auth.users (ensures it's a real user)
-- 2. OR the current_user is one of the internal service roles
CREATE POLICY "Allow system profile creation"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- Allow if current role is a service/internal role (triggers run as these)
  current_setting('role') IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role')
  OR
  -- Fallback: Allow if the profile ID matches an existing auth.users entry
  -- This ensures only real users can have profiles created
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id)
);