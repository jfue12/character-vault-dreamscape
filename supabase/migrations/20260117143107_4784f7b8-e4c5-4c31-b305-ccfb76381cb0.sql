-- Create AI memory store table for Phantom User relationship tracking
CREATE TABLE public.ai_memory_store (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  user_character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  ai_character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL DEFAULT 'neutral', -- friend, enemy, lover, rival, acquaintance, neutral
  trust_level INTEGER DEFAULT 0, -- -100 to 100
  memory_notes JSONB DEFAULT '[]'::jsonb, -- Array of key memories
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI characters table to track which characters are AI-controlled
CREATE TABLE public.ai_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  personality_traits JSONB DEFAULT '[]'::jsonb, -- e.g., ["aggressive", "promiscuous", "cowardly"]
  social_rank TEXT DEFAULT 'commoner', -- royalty, noble, commander, merchant, commoner, servant, outcast
  spawn_keywords TEXT[] DEFAULT '{}', -- e.g., ["guard", "guards", "soldier"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(character_id, world_id)
);

-- Create world events table for AI environmental narration
CREATE TABLE public.world_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.world_rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- world_event, lurker_action, ambient
  content TEXT NOT NULL,
  triggered_by UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add is_ai flag to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.ai_memory_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;

-- AI memory store policies
CREATE POLICY "World members can view AI memories" ON public.ai_memory_store
  FOR SELECT USING (is_world_member(auth.uid(), world_id));

CREATE POLICY "System can manage AI memories" ON public.ai_memory_store
  FOR ALL USING (true);

-- AI characters policies
CREATE POLICY "Anyone can view AI characters" ON public.ai_characters
  FOR SELECT USING (true);

CREATE POLICY "World owners can manage AI characters" ON public.ai_characters
  FOR ALL USING (EXISTS (
    SELECT 1 FROM worlds WHERE worlds.id = ai_characters.world_id AND worlds.owner_id = auth.uid()
  ));

-- World events policies
CREATE POLICY "World members can view events" ON public.world_events
  FOR SELECT USING (is_world_member(auth.uid(), world_id));

CREATE POLICY "System can create events" ON public.world_events
  FOR INSERT WITH CHECK (true);

-- Enable realtime for world events
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_events;

-- Create trigger for ai_memory_store updated_at
CREATE TRIGGER update_ai_memory_store_updated_at
  BEFORE UPDATE ON public.ai_memory_store
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();