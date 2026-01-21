-- Add is_deceased flag to temp_ai_characters for NPC death mechanics
ALTER TABLE public.temp_ai_characters 
ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN NOT NULL DEFAULT false;

-- Also update the characters table for deceased NPCs
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient filtering of deceased NPCs
CREATE INDEX IF NOT EXISTS idx_characters_is_deceased ON public.characters(is_deceased);
CREATE INDEX IF NOT EXISTS idx_temp_ai_is_deceased ON public.temp_ai_characters(is_deceased);

-- Update RLS policies to require authentication for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update RLS policies to require authentication for posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Authenticated users can view posts" 
ON public.posts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update RLS policies for post_likes
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view post likes" 
ON public.post_likes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update RLS policies for post_comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Authenticated users can view comments" 
ON public.post_comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update RLS policies for character_relationships
DROP POLICY IF EXISTS "Anyone can view character relationships" ON public.character_relationships;
CREATE POLICY "Authenticated users can view character relationships" 
ON public.character_relationships 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update characters visibility to require auth and hide owner_id
DROP POLICY IF EXISTS "Users can view non-hidden characters" ON public.characters;
CREATE POLICY "Authenticated users can view non-hidden characters" 
ON public.characters 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_hidden = false);

-- Add comment for documentation
COMMENT ON COLUMN public.temp_ai_characters.is_deceased IS 'True if this NPC has been killed in roleplay and should not respond unless revived';
COMMENT ON COLUMN public.characters.is_deceased IS 'True if this character has been killed in roleplay';