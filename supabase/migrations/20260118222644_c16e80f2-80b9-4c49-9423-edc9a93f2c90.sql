-- Allow world members to view AI characters used in their worlds
-- This ensures everyone can see AI character names in chat, even if hidden
CREATE POLICY "World members can view AI characters in their worlds"
ON public.characters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_characters ac
    JOIN world_members wm ON wm.world_id = ac.world_id
    WHERE ac.character_id = characters.id
    AND wm.user_id = auth.uid()
    AND wm.is_banned = false
  )
);