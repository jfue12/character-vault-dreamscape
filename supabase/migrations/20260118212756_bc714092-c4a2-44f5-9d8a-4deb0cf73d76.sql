-- Fix DM update policy to allow recipients to mark messages as read
DROP POLICY IF EXISTS "Users can update their own DMs" ON public.direct_messages;

-- Allow users to update their own DMs (for editing) AND allow recipients to mark as read
CREATE POLICY "Users can update DMs in their conversations"
ON public.direct_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.id = direct_messages.friendship_id
    AND f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.id = direct_messages.friendship_id
    AND f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
);

-- Ensure users can delete conversations (both parties should be able to delete the friendship)
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.friendships;

CREATE POLICY "Users can delete friendships they're part of"
ON public.friendships
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Allow both parties to delete DMs in a conversation (not just the sender)
DROP POLICY IF EXISTS "Users can delete their own DMs" ON public.direct_messages;

CREATE POLICY "Users can delete DMs in their conversations"
ON public.direct_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.id = direct_messages.friendship_id
    AND f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
);