ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'friend_request'::text,
  'roleplay_proposal'::text,
  'friend_accepted'::text,
  'world_invite'::text,
  'world_join'::text,
  'room_message'::text,
  'dm'::text,
  'message'::text,
  'moderation'::text,
  'follow'::text,
  'post_like'::text,
  'post_comment'::text,
  'story_like'::text,
  'story_reaction'::text
]));