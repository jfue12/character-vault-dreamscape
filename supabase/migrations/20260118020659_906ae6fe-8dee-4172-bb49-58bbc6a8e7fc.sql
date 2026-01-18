-- Allow users to delete their own direct messages
CREATE POLICY "Users can delete their own DMs" 
ON public.direct_messages 
FOR DELETE 
USING (auth.uid() = sender_id);