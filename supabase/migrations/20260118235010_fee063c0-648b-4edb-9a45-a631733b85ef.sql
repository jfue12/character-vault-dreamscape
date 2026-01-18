-- Notifications: friend/roleplay proposal
CREATE OR REPLACE FUNCTION public.notify_on_friendship_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_username text;
  requester_character_name text;
BEGIN
  -- Only for pending requests
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT username INTO requester_username
  FROM profiles
  WHERE id = NEW.requester_id;

  IF NEW.requester_character_id IS NOT NULL THEN
    SELECT name INTO requester_character_name
    FROM characters
    WHERE id = NEW.requester_character_id;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.addressee_id,
    'roleplay_proposal',
    'New Roleplay Proposal',
    COALESCE(requester_character_name, requester_username, 'Someone') || ' wants to start a story with you',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'requester_id', NEW.requester_id,
      'requester_character_id', NEW.requester_character_id,
      'starter_message', NEW.starter_message,
      'username', requester_username,
      'character_name', COALESCE(requester_character_name, requester_username)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_friendship_request_notification ON friendships;
CREATE TRIGGER trigger_friendship_request_notification
AFTER INSERT ON friendships
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_friendship_request();


-- Notifications: group chat message to all world members
CREATE OR REPLACE FUNCTION public.notify_on_room_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_world_id uuid;
  v_room_name text;
  v_sender_username text;
  v_sender_character_name text;
  v_sender_label text;
BEGIN
  -- No notifications for AI messages
  IF COALESCE(NEW.is_ai, false) = true THEN
    RETURN NEW;
  END IF;

  SELECT world_id, name INTO v_world_id, v_room_name
  FROM world_rooms
  WHERE id = NEW.room_id;

  IF v_world_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_sender_username
  FROM profiles
  WHERE id = NEW.sender_id;

  IF NEW.character_id IS NOT NULL THEN
    SELECT name INTO v_sender_character_name
    FROM characters
    WHERE id = NEW.character_id;
  END IF;

  v_sender_label := COALESCE(v_sender_character_name, v_sender_username, 'Someone');

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    wm.user_id,
    'room_message',
    'New message in ' || COALESCE(v_room_name, 'a room'),
    v_sender_label || ': ' || left(COALESCE(NEW.content, ''), 120),
    jsonb_build_object(
      'world_id', v_world_id,
      'room_id', NEW.room_id,
      'room_name', v_room_name,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'username', v_sender_username,
      'character_name', v_sender_label
    )
  FROM world_members wm
  WHERE wm.world_id = v_world_id
    AND wm.user_id <> NEW.sender_id
    AND COALESCE(wm.is_banned, false) = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_room_message_notification ON messages;
CREATE TRIGGER trigger_room_message_notification
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_room_message();


-- Notifications: follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_username text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_follower_username
  FROM profiles
  WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.following_id,
    'follow',
    'New follower',
    COALESCE(v_follower_username, 'Someone') || ' started following you',
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'username', v_follower_username,
      'character_name', v_follower_username
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_follow_notification ON follows;
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow();


-- Notifications: post like
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_liker_username text;
BEGIN
  SELECT author_id INTO v_author_id
  FROM posts
  WHERE id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_liker_username
  FROM profiles
  WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'post_like',
    'New like',
    COALESCE(v_liker_username, 'Someone') || ' liked your post',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'actor_id', NEW.user_id,
      'username', v_liker_username,
      'character_name', v_liker_username
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_post_like_notification ON post_likes;
CREATE TRIGGER trigger_post_like_notification
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_post_like();


-- Notifications: post comment
CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_commenter_username text;
BEGIN
  SELECT author_id INTO v_author_id
  FROM posts
  WHERE id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_commenter_username
  FROM profiles
  WHERE id = NEW.author_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'post_comment',
    'New comment',
    COALESCE(v_commenter_username, 'Someone') || ' commented on your post',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'actor_id', NEW.author_id,
      'username', v_commenter_username,
      'character_name', v_commenter_username
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_post_comment_notification ON post_comments;
CREATE TRIGGER trigger_post_comment_notification
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_post_comment();