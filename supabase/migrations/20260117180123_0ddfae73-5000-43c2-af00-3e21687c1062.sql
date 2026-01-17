-- Create world_invites table for invite links
CREATE TABLE public.world_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_invites ENABLE ROW LEVEL SECURITY;

-- Staff can create invites
CREATE POLICY "Staff can create invites"
ON public.world_invites
FOR INSERT
WITH CHECK (is_world_staff(auth.uid(), world_id));

-- Staff can view their world's invites
CREATE POLICY "Staff can view world invites"
ON public.world_invites
FOR SELECT
USING (is_world_staff(auth.uid(), world_id));

-- Anyone can view valid invites by code (for joining)
CREATE POLICY "Anyone can view valid invites by code"
ON public.world_invites
FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR use_count < max_uses)
);

-- Staff can update their world's invites
CREATE POLICY "Staff can update invites"
ON public.world_invites
FOR UPDATE
USING (is_world_staff(auth.uid(), world_id));

-- Staff can delete their world's invites
CREATE POLICY "Staff can delete invites"
ON public.world_invites
FOR DELETE
USING (is_world_staff(auth.uid(), world_id));

-- Create index for faster code lookups
CREATE INDEX idx_world_invites_code ON public.world_invites(code);
CREATE INDEX idx_world_invites_world_id ON public.world_invites(world_id);