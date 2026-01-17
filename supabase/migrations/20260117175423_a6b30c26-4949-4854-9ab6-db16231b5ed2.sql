-- Add policy for users to leave worlds (delete their own membership)
CREATE POLICY "Users can leave worlds"
ON public.world_members
FOR DELETE
USING (auth.uid() = user_id);