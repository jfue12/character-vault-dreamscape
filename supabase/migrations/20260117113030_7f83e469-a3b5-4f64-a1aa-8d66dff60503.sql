-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view their worlds" ON public.worlds;
DROP POLICY IF EXISTS "Members can view non-staff rooms" ON public.world_rooms;
DROP POLICY IF EXISTS "Staff can view all rooms" ON public.world_rooms;
DROP POLICY IF EXISTS "Members can view world members" ON public.world_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.world_members;

-- Create a security definer function to check world membership
CREATE OR REPLACE FUNCTION public.is_world_member(_user_id uuid, _world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.world_members
    WHERE user_id = _user_id
      AND world_id = _world_id
      AND is_banned = false
  )
$$;

-- Create a security definer function to check if user is staff (owner or admin)
CREATE OR REPLACE FUNCTION public.is_world_staff(_user_id uuid, _world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.world_members
    WHERE user_id = _user_id
      AND world_id = _world_id
      AND role IN ('owner', 'admin')
      AND is_banned = false
  )
$$;

-- Create a security definer function to get user's role in a world
CREATE OR REPLACE FUNCTION public.get_world_role(_user_id uuid, _world_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.world_members
  WHERE user_id = _user_id
    AND world_id = _world_id
    AND is_banned = false
  LIMIT 1
$$;

-- Recreate worlds policies using the helper functions
CREATE POLICY "Members can view their worlds"
ON public.worlds FOR SELECT
USING (public.is_world_member(auth.uid(), id));

-- Recreate world_rooms policies using the helper functions
CREATE POLICY "Members can view non-staff rooms"
ON public.world_rooms FOR SELECT
USING (
  is_staff_only = false 
  AND public.is_world_member(auth.uid(), world_id)
);

CREATE POLICY "Staff can view all rooms"
ON public.world_rooms FOR SELECT
USING (public.is_world_staff(auth.uid(), world_id));

-- Recreate world_members policies using the helper functions
CREATE POLICY "Members can view world members"
ON public.world_members FOR SELECT
USING (public.is_world_member(auth.uid(), world_id));

CREATE POLICY "Admins can update members"
ON public.world_members FOR UPDATE
USING (public.is_world_staff(auth.uid(), world_id));