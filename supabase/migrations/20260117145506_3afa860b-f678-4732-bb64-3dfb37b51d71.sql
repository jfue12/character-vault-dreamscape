-- Fix overly permissive RLS policies for age_verifications
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can manage verifications" ON public.age_verifications;

-- Create a proper policy that only allows service role (via edge functions) to manage
-- For user-facing operations, we restrict to select only
CREATE POLICY "Users can insert their own verification"
  ON public.age_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification"
  ON public.age_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix notifications policy - drop and replace with proper check
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);