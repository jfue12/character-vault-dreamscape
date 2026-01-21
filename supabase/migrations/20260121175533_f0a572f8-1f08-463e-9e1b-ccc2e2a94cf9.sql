-- Add AI settings and lore fields to worlds table
ALTER TABLE public.worlds 
ADD COLUMN IF NOT EXISTS ai_lore TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_use_owner_characters_only BOOLEAN DEFAULT true;

-- Add background_url field to world_rooms for editing (already exists, but ensure it's there)
-- Already exists per schema

-- Add comment explaining fields
COMMENT ON COLUMN public.worlds.ai_lore IS 'Custom lore that the AI should follow for this world';
COMMENT ON COLUMN public.worlds.ai_enabled IS 'Whether the Phantom AI is enabled for this world';
COMMENT ON COLUMN public.worlds.ai_use_owner_characters_only IS 'If true, AI only uses owner-created characters, not user characters';