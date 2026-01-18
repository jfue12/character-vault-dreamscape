-- Create function to notify on new direct messages
CREATE OR REPLACE FUNCTION public.notify_on_dm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  sender_username text;
  sender_character_name text;
  friendship_record record;
BEGIN
  -- Get the friendship to find the recipient
  SELECT * INTO friendship_record FROM friendships WHERE id = NEW.friendship_id;
  
  IF friendship_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only notify for accepted friendships
  IF friendship_record.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  
  -- Determine recipient (the other person in the friendship)
  IF friendship_record.requester_id = NEW.sender_id THEN
    recipient_id := friendship_record.addressee_id;
  ELSE
    recipient_id := friendship_record.requester_id;
  END IF;
  
  -- Get sender username
  SELECT username INTO sender_username FROM profiles WHERE id = NEW.sender_id;
  
  -- Get sender character name if available
  IF NEW.sender_character_id IS NOT NULL THEN
    SELECT name INTO sender_character_name FROM characters WHERE id = NEW.sender_character_id;
  END IF;
  
  -- Insert notification for recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    data
  ) VALUES (
    recipient_id,
    'dm',
    'New Message',
    COALESCE(sender_character_name, sender_username, 'Someone') || ' sent you a message',
    jsonb_build_object(
      'friendship_id', NEW.friendship_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'character_name', COALESCE(sender_character_name, sender_username),
      'username', sender_username
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for DM notifications
DROP TRIGGER IF EXISTS trigger_dm_notification ON direct_messages;
CREATE TRIGGER trigger_dm_notification
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_dm();

-- Create function to notify when friendship is accepted
CREATE OR REPLACE FUNCTION public.notify_on_friendship_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acceptor_username text;
  acceptor_character_name text;
BEGIN
  -- Only trigger when status changes to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get acceptor (addressee) info
    SELECT username INTO acceptor_username FROM profiles WHERE id = NEW.addressee_id;
    
    -- Insert notification for the requester
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      data
    ) VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Roleplay Accepted!',
      COALESCE(acceptor_username, 'Someone') || ' accepted your roleplay proposal!',
      jsonb_build_object(
        'friendship_id', NEW.id,
        'acceptor_id', NEW.addressee_id,
        'username', acceptor_username
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for friendship accepted notifications
DROP TRIGGER IF EXISTS trigger_friendship_accepted ON friendships;
CREATE TRIGGER trigger_friendship_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_friendship_accepted();