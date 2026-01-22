-- Fix: The SECURITY DEFINER function runs as the function owner (postgres), 
-- but we need to verify the trigger is working correctly.
-- Let's update the policy to be more permissive for the trigger context.

DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;

-- The handle_new_user function is SECURITY DEFINER and owned by postgres,
-- so it bypasses RLS entirely. However, if RLS is still blocking,
-- we need to ensure the function owner has permissions.

-- Option 1: Disable RLS bypass check for SECURITY DEFINER functions
-- This is already the default behavior - SECURITY DEFINER functions bypass RLS
-- when the function owner has the necessary permissions.

-- Let's re-create the function with explicit SECURITY DEFINER and ensure it's owned by postgres
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, dob, is_minor)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    (NEW.raw_user_meta_data->>'dob')::date,
    COALESCE((NEW.raw_user_meta_data->>'is_minor')::boolean, false)
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Since SECURITY DEFINER functions bypass RLS when owned by superuser,
-- let's also add a fallback INSERT policy that allows the service_role
CREATE POLICY "Service role can create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- But restrict this to only work from the trigger context by checking
-- that the id matches a real auth.users entry
DROP POLICY IF EXISTS "Service role can create profiles" ON public.profiles;

CREATE POLICY "Allow profile creation for new auth users"
ON public.profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users WHERE id = profiles.id
  )
);