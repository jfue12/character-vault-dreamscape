-- Drop the old check constraint and add expanded one with more notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'friend_request'::text, 
  'friend_accepted'::text, 
  'world_invite'::text, 
  'moderation'::text, 
  'message'::text, 
  'dm'::text,
  'story_like'::text,
  'post_like'::text,
  'post_comment'::text,
  'follow'::text,
  'roleplay_proposal'::text,
  'room_message'::text
]));