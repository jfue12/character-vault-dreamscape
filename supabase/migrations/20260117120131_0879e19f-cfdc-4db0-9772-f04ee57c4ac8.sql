-- Add identity_tags column to characters for zodiac, etc.
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS identity_tags jsonb DEFAULT '{}'::jsonb;

-- Ensure all required columns exist
-- profiles already has followers_count, following_count from previous migration

-- Add stories_count to profiles for the stats bar
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stories_count integer DEFAULT 0;

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Create index for follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);