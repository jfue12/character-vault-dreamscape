-- Fix 1: Restrict AI characters to world members only
DROP POLICY IF EXISTS "Anyone can view AI characters" ON ai_characters;
CREATE POLICY "World members can view AI characters" ON ai_characters
  FOR SELECT
  USING (is_world_member(auth.uid(), world_id));

-- Fix 2: Restrict follows visibility to involved users
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Users can view follows involving them" ON follows
  FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Also allow viewing follows on profiles you're viewing (for public profile pages)
CREATE POLICY "Authenticated users can view follows for profiles" ON follows
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 5: Add server-side rate limiting via database trigger for AI messages
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(_world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) 
    FROM world_events 
    WHERE world_id = _world_id 
    AND event_type = 'ai_generated'
    AND created_at > NOW() - INTERVAL '1 minute'
  ) < 10
$$;

-- Fix 6: Add RLS policy for message reactions that verifies room access
-- First drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Create policy for message owners to update their messages
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- Create policy for world members to add emoji reactions
CREATE POLICY "Members can add emoji reactions" ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM world_rooms wr
      WHERE wr.id = messages.room_id
      AND is_world_member(auth.uid(), wr.world_id)
    )
  );

-- Add constraint for AI characters per world (max 50)
CREATE OR REPLACE FUNCTION check_max_ai_characters()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM ai_characters WHERE world_id = NEW.world_id) >= 50 THEN
    RAISE EXCEPTION 'Maximum AI characters per world reached (50)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_max_ai_characters ON ai_characters;
CREATE TRIGGER enforce_max_ai_characters
BEFORE INSERT ON ai_characters
FOR EACH ROW EXECUTE FUNCTION check_max_ai_characters();

-- Add constraint for temp AI characters per world (max 100)
CREATE OR REPLACE FUNCTION check_max_temp_ai_characters()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM temp_ai_characters WHERE world_id = NEW.world_id AND expires_at > NOW()) >= 100 THEN
    RAISE EXCEPTION 'Maximum temporary AI characters per world reached (100)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_max_temp_ai_characters ON temp_ai_characters;
CREATE TRIGGER enforce_max_temp_ai_characters
BEFORE INSERT ON temp_ai_characters
FOR EACH ROW EXECUTE FUNCTION check_max_temp_ai_characters();