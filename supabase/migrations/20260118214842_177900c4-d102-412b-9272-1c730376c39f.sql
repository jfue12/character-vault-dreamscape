-- Add dm_background_url to friendships table for custom DM backgrounds
ALTER TABLE public.friendships
ADD COLUMN requester_background_url TEXT DEFAULT NULL,
ADD COLUMN addressee_background_url TEXT DEFAULT NULL;

-- Add world_reports table for reporting group chats
CREATE TABLE IF NOT EXISTS public.world_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on world_reports
ALTER TABLE public.world_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create world reports"
ON public.world_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own world reports"
ON public.world_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Add post-images storage bucket if not exists (for video support)
-- Note: Storage bucket creation is handled separately

-- Add nsfw_locked column to profiles to track if user has toggled NSFW (irreversible)
ALTER TABLE public.profiles
ADD COLUMN nsfw_unlocked BOOLEAN NOT NULL DEFAULT false;

-- Add bubble_side preference for admins/owners in world_members
ALTER TABLE public.world_members
ADD COLUMN bubble_side TEXT DEFAULT 'auto' CHECK (bubble_side IN ('auto', 'left', 'right'));

-- Enable realtime for world_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_reports;