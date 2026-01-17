-- Add server-side rate limiting for messages to prevent spam bypass
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF recent_count >= 15 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce message rate limits at database level
CREATE TRIGGER enforce_message_rate_limit
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION public.check_message_rate_limit();

-- Add server-side rate limiting for direct messages
CREATE OR REPLACE FUNCTION public.check_dm_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM direct_messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF recent_count >= 15 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many direct messages';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_dm_rate_limit
BEFORE INSERT ON direct_messages
FOR EACH ROW EXECUTE FUNCTION public.check_dm_rate_limit();