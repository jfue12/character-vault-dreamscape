import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  friend_id: string;
  friend_username: string | null;
  friend_character_name: string | null;
  friend_avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface ConversationListProps {
  onSelectConversation: (friendshipId: string, friendId: string) => void;
}

export const ConversationList = ({ onSelectConversation }: ConversationListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('dm-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
          },
          () => fetchConversations()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get accepted friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        requester_character:characters!friendships_requester_character_id_fkey(name, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error || !friendships) {
      setLoading(false);
      return;
    }

    // Build conversation list
    const convos: Conversation[] = await Promise.all(
      friendships.map(async (f) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const requesterChar = Array.isArray(f.requester_character) 
          ? f.requester_character[0] 
          : f.requester_character;

        // Get friend profile
        const { data: friendProfile } = await supabase
          .from('profiles')
          .select('username, active_character_id')
          .eq('id', friendId)
          .maybeSingle();

        // Get friend's active character if available
        let friendCharName = requesterChar?.name || null;
        let friendAvatarUrl = requesterChar?.avatar_url || null;

        if (friendProfile?.active_character_id) {
          const { data: activeChar } = await supabase
            .from('characters')
            .select('name, avatar_url')
            .eq('id', friendProfile.active_character_id)
            .maybeSingle();
          
          if (activeChar) {
            friendCharName = activeChar.name;
            friendAvatarUrl = activeChar.avatar_url;
          }
        }

        // Get latest message
        const { data: messages } = await supabase
          .from('direct_messages')
          .select('content, created_at, is_read, sender_id')
          .eq('friendship_id', f.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = messages?.[0];

        // Count unread
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('friendship_id', f.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          id: f.id,
          friend_id: friendId,
          friend_username: friendProfile?.username || null,
          friend_character_name: friendCharName,
          friend_avatar_url: friendAvatarUrl,
          last_message: lastMsg?.content || 'Start chatting!',
          last_message_at: lastMsg?.created_at || new Date().toISOString(),
          unread_count: count || 0,
        };
      })
    );

    // Sort by latest message
    convos.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    setConversations(convos);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Swipe right on Discovery to make friends!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((convo, index) => (
        <motion.button
          key={convo.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectConversation(convo.id, convo.friend_id)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
        >
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden">
              {convo.friend_avatar_url ? (
                <img 
                  src={convo.friend_avatar_url} 
                  alt={convo.friend_character_name || 'Friend'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {convo.friend_character_name?.[0] || convo.friend_username?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            {convo.unread_count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                {convo.unread_count}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground truncate">
                {convo.friend_character_name || convo.friend_username || 'Friend'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: false })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {convo.last_message}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
