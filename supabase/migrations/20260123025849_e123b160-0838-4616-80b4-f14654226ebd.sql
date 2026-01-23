-- Add display_order column for character reordering
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set initial display order based on created_at for existing characters
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at DESC) as row_num
  FROM public.characters
)
UPDATE public.characters c
SET display_order = o.row_num
FROM ordered o
WHERE c.id = o.id;