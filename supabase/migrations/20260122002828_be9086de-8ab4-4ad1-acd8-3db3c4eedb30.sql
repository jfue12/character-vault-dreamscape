-- Add ai_intensity column to worlds table for AI response intensity control
ALTER TABLE public.worlds 
ADD COLUMN IF NOT EXISTS ai_intensity TEXT DEFAULT 'medium' CHECK (ai_intensity IN ('low', 'medium', 'high'));