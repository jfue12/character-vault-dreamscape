-- Drop overly permissive policies and replace with proper ones
DROP POLICY IF EXISTS "System can manage AI memories" ON public.ai_memory_store;
DROP POLICY IF EXISTS "System can create events" ON public.world_events;

-- AI memory store - only accessible via service role (edge functions)
-- Keep the select policy for members, but remove the ALL policy
-- The edge function will use service role to manage memories

-- World events - members can view, edge function creates via service role
-- The insert policy needs to be restricted to authenticated users in context
CREATE POLICY "Authenticated can create events for their world" ON public.world_events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    is_world_member(auth.uid(), world_id)
  );