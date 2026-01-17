-- Create worlds table
CREATE TABLE public.worlds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    rules TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_nsfw BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create world_rooms table
CREATE TABLE public.world_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    background_url TEXT,
    is_staff_only BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create world_members table
CREATE TABLE public.world_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    is_banned BOOLEAN NOT NULL DEFAULT false,
    timeout_until TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(world_id, user_id)
);

-- Create moderation_logs table (placeholder for now)
CREATE TABLE public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
    moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worlds
CREATE POLICY "Anyone can view public worlds"
ON public.worlds FOR SELECT
USING (is_public = true);

CREATE POLICY "Members can view their worlds"
ON public.worlds FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.world_members 
        WHERE world_members.world_id = worlds.id 
        AND world_members.user_id = auth.uid()
        AND world_members.is_banned = false
    )
);

CREATE POLICY "Users can create worlds"
ON public.worlds FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their worlds"
ON public.worlds FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their worlds"
ON public.worlds FOR DELETE
USING (auth.uid() = owner_id);

-- RLS Policies for world_rooms
CREATE POLICY "Members can view non-staff rooms"
ON public.world_rooms FOR SELECT
USING (
    is_staff_only = false AND
    EXISTS (
        SELECT 1 FROM public.world_members 
        WHERE world_members.world_id = world_rooms.world_id 
        AND world_members.user_id = auth.uid()
        AND world_members.is_banned = false
    )
);

CREATE POLICY "Staff can view all rooms"
ON public.world_rooms FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.world_members 
        WHERE world_members.world_id = world_rooms.world_id 
        AND world_members.user_id = auth.uid()
        AND world_members.role IN ('owner', 'admin')
        AND world_members.is_banned = false
    )
);

CREATE POLICY "Owners can manage rooms"
ON public.world_rooms FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.worlds 
        WHERE worlds.id = world_rooms.world_id 
        AND worlds.owner_id = auth.uid()
    )
);

-- RLS Policies for world_members
CREATE POLICY "Members can view world members"
ON public.world_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.world_members wm
        WHERE wm.world_id = world_members.world_id 
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can join public worlds"
ON public.world_members FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    role = 'member' AND
    EXISTS (
        SELECT 1 FROM public.worlds 
        WHERE worlds.id = world_members.world_id 
        AND worlds.is_public = true
    )
);

CREATE POLICY "Owners can manage members"
ON public.world_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.worlds 
        WHERE worlds.id = world_members.world_id 
        AND worlds.owner_id = auth.uid()
    )
);

CREATE POLICY "Admins can update members"
ON public.world_members FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.world_members wm
        WHERE wm.world_id = world_members.world_id 
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
);

-- RLS Policies for moderation_logs
CREATE POLICY "Staff can view mod logs"
ON public.moderation_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.world_members 
        WHERE world_members.world_id = moderation_logs.world_id 
        AND world_members.user_id = auth.uid()
        AND world_members.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Staff can create mod logs"
ON public.moderation_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.world_members 
        WHERE world_members.world_id = moderation_logs.world_id 
        AND world_members.user_id = auth.uid()
        AND world_members.role IN ('owner', 'admin')
    )
);

-- Add storage bucket for world images
INSERT INTO storage.buckets (id, name, public)
VALUES ('world-images', 'world-images', true);

-- Storage policies for world images
CREATE POLICY "Anyone can view world images"
ON storage.objects FOR SELECT
USING (bucket_id = 'world-images');

CREATE POLICY "Authenticated users can upload world images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'world-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own world images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'world-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own world images"
ON storage.objects FOR DELETE
USING (bucket_id = 'world-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at
CREATE TRIGGER update_worlds_updated_at
BEFORE UPDATE ON public.worlds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_world_rooms_updated_at
BEFORE UPDATE ON public.world_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();