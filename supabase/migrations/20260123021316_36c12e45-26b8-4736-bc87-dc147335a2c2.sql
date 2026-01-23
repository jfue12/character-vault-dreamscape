-- Add name_color column to characters table for custom name color in chat
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS name_color TEXT DEFAULT NULL;