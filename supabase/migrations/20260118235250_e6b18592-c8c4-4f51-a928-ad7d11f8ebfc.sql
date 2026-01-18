-- Update post_like notification to include post preview data
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_liker_username text;
  v_liker_character_name text;
  v_post_content text;
  v_post_image_url text;
  v_post_character_id uuid;
  v_post_character_name text;
  v_post_character_avatar text;
BEGIN
  -- Get post details including content preview
  SELECT author_id, left(content, 100), image_url, character_id
  INTO v_author_id, v_post_content, v_post_image_url, v_post_character_id
  FROM posts
  WHERE id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker info
  SELECT username INTO v_liker_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get post character info if available
  IF v_post_character_id IS NOT NULL THEN
    SELECT name, avatar_url INTO v_post_character_name, v_post_character_avatar
    FROM characters
    WHERE id = v_post_character_id;
  END IF;

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
      'character_name', v_liker_username,
      'post_snippet', v_post_content,
      'post_image_url', v_post_image_url,
      'post_character_name', v_post_character_name,
      'post_character_avatar', v_post_character_avatar
    )
  );

  RETURN NEW;
END;
$$;

-- Update post_comment notification to include post and comment preview data
CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_commenter_username text;
  v_commenter_character_name text;
  v_commenter_character_avatar text;
  v_post_content text;
  v_post_image_url text;
  v_comment_content text;
BEGIN
  -- Get post details
  SELECT author_id, left(content, 100), image_url
  INTO v_author_id, v_post_content, v_post_image_url
  FROM posts
  WHERE id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter info
  SELECT username INTO v_commenter_username
  FROM profiles
  WHERE id = NEW.author_id;

  -- Get commenter character info if available
  IF NEW.character_id IS NOT NULL THEN
    SELECT name, avatar_url INTO v_commenter_character_name, v_commenter_character_avatar
    FROM characters
    WHERE id = NEW.character_id;
  END IF;

  -- Get comment snippet
  v_comment_content := left(NEW.content, 150);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'post_comment',
    'New comment',
    COALESCE(v_commenter_character_name, v_commenter_username, 'Someone') || ' commented on your post',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'actor_id', NEW.author_id,
      'username', v_commenter_username,
      'character_name', COALESCE(v_commenter_character_name, v_commenter_username),
      'character_avatar', v_commenter_character_avatar,
      'post_snippet', v_post_content,
      'post_image_url', v_post_image_url,
      'comment_snippet', v_comment_content
    )
  );

  RETURN NEW;
END;
$$;