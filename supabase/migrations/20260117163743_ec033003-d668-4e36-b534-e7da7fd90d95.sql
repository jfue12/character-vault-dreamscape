-- Add bubble_alignment column to characters table for controlling which side messages appear on
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS bubble_alignment text DEFAULT 'auto';

-- Add comment to explain the column
COMMENT ON COLUMN public.characters.bubble_alignment IS 'Controls chat bubble position: auto (right for own), left, right';