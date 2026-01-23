-- Add muted_until column to world_members for mute functionality
ALTER TABLE public.world_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster mute lookups
CREATE INDEX IF NOT EXISTS idx_world_members_muted_until ON public.world_members(muted_until) WHERE muted_until IS NOT NULL;

-- Create function to check if user is muted
CREATE OR REPLACE FUNCTION public.is_user_muted(_user_id uuid, _world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE user_id = _user_id
    AND world_id = _world_id
    AND muted_until IS NOT NULL
    AND muted_until > now()
  )
$$;