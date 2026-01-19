-- 1. Add Lore, Background, and Avatar columns to chatrooms
ALTER TABLE public.world_rooms 
ADD COLUMN IF NOT EXISTS room_lore TEXT,
ADD COLUMN IF NOT EXISTS background_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Security: Allow Owners and Admins to Delete Rooms
-- This ensures only staff can use the 'Delete' feature you're adding
CREATE POLICY "Owners and admins can delete rooms" 
ON public.world_rooms 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.world_members 
    WHERE world_members.world_id = world_rooms.world_id 
    AND world_members.user_id = auth.uid() 
    AND world_members.role IN ('owner', 'admin')
  )
);

-- 3. Security: Allow Owners and Admins to Update Room Settings
-- This covers changing the Lore, Background, and Avatar
CREATE POLICY "Owners and admins can update rooms" 
ON public.world_rooms 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.world_members 
    WHERE world_members.world_id = world_rooms.world_id 
    AND world_members.user_id = auth.uid() 
    AND world_members.role IN ('owner', 'admin')
  )
);
