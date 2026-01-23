-- Profile customization columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Admin permissions: add configurable permissions to world_members
ALTER TABLE public.world_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"message_moderation": true, "member_management": true, "room_management": true}';

-- Invite-only mode for worlds
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS invite_only BOOLEAN DEFAULT false;