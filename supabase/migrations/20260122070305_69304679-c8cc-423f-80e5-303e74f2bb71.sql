-- Add background_url column to characters table for OC background images
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS background_url TEXT;

-- Add background_url column to posts table for post background images
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS background_url TEXT;