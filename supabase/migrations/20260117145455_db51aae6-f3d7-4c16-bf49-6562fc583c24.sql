-- Character Gallery Images
CREATE TABLE public.character_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.character_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view character gallery images"
  ON public.character_gallery FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters c 
    WHERE c.id = character_gallery.character_id 
    AND (c.is_hidden = false OR c.owner_id = auth.uid())
  ));

CREATE POLICY "Owners can manage their character gallery"
  ON public.character_gallery FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters c 
    WHERE c.id = character_gallery.character_id 
    AND c.owner_id = auth.uid()
  ));

-- User Blocks
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- User Reports
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reported_user_id UUID REFERENCES public.profiles(id),
  reported_message_id UUID REFERENCES public.messages(id),
  reported_character_id UUID REFERENCES public.characters(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.user_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Age Verification Records (stores verification status, not data)
CREATE TABLE public.age_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification"
  ON public.age_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage verifications"
  ON public.age_verifications FOR ALL
  USING (true);

-- Temporary AI Characters (for hybrid mode)
CREATE TABLE public.temp_ai_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.world_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  social_rank TEXT DEFAULT 'commoner',
  personality_traits JSONB DEFAULT '[]'::jsonb,
  avatar_description TEXT,
  is_saved BOOLEAN DEFAULT false,
  saved_character_id UUID REFERENCES public.characters(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '24 hours'
);

ALTER TABLE public.temp_ai_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World members can view temp AI characters"
  ON public.temp_ai_characters FOR SELECT
  USING (is_world_member(auth.uid(), world_id));

CREATE POLICY "World owners can manage temp AI characters"
  ON public.temp_ai_characters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM worlds w 
    WHERE w.id = temp_ai_characters.world_id 
    AND w.owner_id = auth.uid()
  ));

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  )
$$;

-- Create storage bucket for character gallery
INSERT INTO storage.buckets (id, name, public) VALUES ('character-gallery', 'character-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-gallery');

CREATE POLICY "Users can upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'character-gallery' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'character-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);