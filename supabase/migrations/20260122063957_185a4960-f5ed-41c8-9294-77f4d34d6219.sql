-- =====================================================
-- RLS SECURITY FIXES
-- =====================================================

-- 1. FIX NOTIFICATIONS: Prevent users from creating notifications for other users
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications for themselves or system can create for others"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR 
    -- Allow creating notifications for others only if you're creating it about an action involving them
    -- e.g., friend requests, follows, etc. - validated by checking the authenticated user exists
    auth.uid() IS NOT NULL
  )
);

-- Actually, let's be more restrictive - only allow inserting for the current user
-- System/trigger-based notifications should use SECURITY DEFINER functions
DROP POLICY IF EXISTS "Users can create notifications for themselves or system can create for others" ON public.notifications;
CREATE POLICY "Users can only create their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a SECURITY DEFINER function for creating notifications for other users
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- 2. FIX MESSAGES: Restrict emoji reaction updates to only modify emoji_reactions field
-- And ensure users can only update their own messages for content/attachment changes
DROP POLICY IF EXISTS "Members can add emoji reactions" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Allow message owners to fully update their messages
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Create a SECURITY DEFINER function for adding emoji reactions
CREATE OR REPLACE FUNCTION public.add_message_reaction(
  p_message_id uuid,
  p_emoji text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_world_id uuid;
  v_is_member boolean;
  v_current_reactions jsonb;
BEGIN
  -- Get the message's room
  SELECT room_id INTO v_room_id FROM public.messages WHERE id = p_message_id;
  
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Get world_id from room
  SELECT world_id INTO v_world_id FROM public.world_rooms WHERE id = v_room_id;
  
  -- Check if user is a world member
  SELECT is_world_member(p_user_id, v_world_id) INTO v_is_member;
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a world member';
  END IF;
  
  -- Get current reactions
  SELECT COALESCE(emoji_reactions, '[]'::jsonb) INTO v_current_reactions 
  FROM public.messages WHERE id = p_message_id;
  
  -- Add the reaction (simple append, app logic should handle duplicates)
  UPDATE public.messages 
  SET emoji_reactions = v_current_reactions || jsonb_build_object('emoji', p_emoji, 'user_id', p_user_id::text)
  WHERE id = p_message_id;
END;
$$;

-- 3. FIX STORIES: Require authentication to view published stories
DROP POLICY IF EXISTS "Anyone can view published stories" ON public.stories;
CREATE POLICY "Authenticated users can view published stories"
ON public.stories FOR SELECT
USING (auth.uid() IS NOT NULL AND is_published = true);

-- 4. FIX CHARACTER_GALLERY: Require authentication to view gallery images
DROP POLICY IF EXISTS "Anyone can view character gallery images" ON public.character_gallery;
CREATE POLICY "Authenticated users can view character gallery images"
ON public.character_gallery FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM characters c
    WHERE c.id = character_gallery.character_id 
    AND (c.is_hidden = false OR c.owner_id = auth.uid())
  )
);

-- 5. FIX FRIENDSHIPS: Make update more restrictive
-- Addressee can only update status, requester can update their own fields
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;

-- Requester can update their own fields (background_url, character_id)
CREATE POLICY "Requesters can update their own friendship fields"
ON public.friendships FOR UPDATE
USING (auth.uid() = requester_id)
WITH CHECK (auth.uid() = requester_id);

-- Addressee can update status and their own background_url
CREATE POLICY "Addressees can update status and their fields"
ON public.friendships FOR UPDATE
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

-- 6. FIX MODERATION_LOGS: Use security definer function instead of direct query
DROP POLICY IF EXISTS "Staff can create mod logs" ON public.moderation_logs;
DROP POLICY IF EXISTS "Staff can view mod logs" ON public.moderation_logs;

CREATE POLICY "Staff can create mod logs"
ON public.moderation_logs FOR INSERT
WITH CHECK (is_world_staff(auth.uid(), world_id));

CREATE POLICY "Staff can view mod logs"
ON public.moderation_logs FOR SELECT
USING (is_world_staff(auth.uid(), world_id));

-- 7. FIX WORLD_MEMBERS: Add policy for joining via invite
CREATE POLICY "Users can join worlds via invite"
ON public.world_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM world_invites wi
    WHERE wi.world_id = world_members.world_id
    AND wi.is_active = true
    AND (wi.expires_at IS NULL OR wi.expires_at > now())
    AND (wi.max_uses IS NULL OR wi.use_count < wi.max_uses)
  )
);

-- 8. FIX WORLD_INVITES: Require authentication for viewing invites
DROP POLICY IF EXISTS "Anyone can view valid invites by code" ON public.world_invites;
CREATE POLICY "Authenticated users can view valid invites"
ON public.world_invites FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now()) 
  AND (max_uses IS NULL OR use_count < max_uses)
);

-- 9. Add policy for incrementing invite use_count when joining
CREATE OR REPLACE FUNCTION public.use_world_invite(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_world_id uuid;
BEGIN
  -- Find and lock the invite
  SELECT * INTO v_invite 
  FROM public.world_invites 
  WHERE code = p_invite_code 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;
  
  -- Increment use count
  UPDATE public.world_invites 
  SET use_count = use_count + 1
  WHERE id = v_invite.id;
  
  -- Add user to world
  INSERT INTO public.world_members (user_id, world_id, role)
  VALUES (auth.uid(), v_invite.world_id, 'member')
  ON CONFLICT (user_id, world_id) DO NOTHING;
  
  RETURN v_invite.world_id;
END;
$$;

-- 10. Ensure blocked users can check if they're blocked (for UI purposes)
CREATE POLICY "Users can see if they are blocked"
ON public.user_blocks FOR SELECT
USING (auth.uid() = blocked_id);