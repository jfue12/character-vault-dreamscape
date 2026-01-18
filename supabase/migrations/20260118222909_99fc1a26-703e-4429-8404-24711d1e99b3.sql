-- Allow world members to view characters that are used in messages within their worlds
-- This ensures everyone can see AI character names in chat, even if hidden
CREATE POLICY "World members can view characters used in world messages"
ON public.characters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN world_rooms wr ON wr.id = m.room_id
    JOIN world_members wm ON wm.world_id = wr.world_id
    WHERE m.character_id = characters.id
    AND wm.user_id = auth.uid()
    AND wm.is_banned = false
  )
);