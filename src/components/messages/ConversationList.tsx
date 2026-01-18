import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Trash2, MoreHorizontal, Ban, Flag, Clock, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Conversation {
  id: string;
  friend_id: string;
  friend_username: string | null;
  friend_character_name: string | null;
  friend_avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: 'accepted' | 'pending';
  is_incoming: boolean;
}

interface ConversationListProps {
  onSelectConversation: (friendshipId: string, friendId?: string) => void;
}

export const ConversationList = ({ onSelectConversation }: ConversationListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to realtime updates for messages
      const dmChannel = supabase
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

      // Subscribe to realtime updates for new friendships/proposals
      const friendshipChannel = supabase
        .channel('friendship-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            // Refetch when a friendship involves the current user
            const newData = payload.new as any;
            const oldData = payload.old as any;
            if (
              newData?.requester_id === user.id || 
              newData?.addressee_id === user.id ||
              oldData?.requester_id === user.id ||
              oldData?.addressee_id === user.id
            ) {
              fetchConversations();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(dmChannel);
        supabase.removeChannel(friendshipChannel);
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get both accepted AND pending friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        starter_message,
        created_at,
        requester_character:characters!friendships_requester_character_id_fkey(name, avatar_url)
      `)
      .in('status', ['accepted', 'pending'])
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error || !friendships) {
      setLoading(false);
      return;
    }

    // Build conversation list
    const convos: Conversation[] = await Promise.all(
      friendships.map(async (f) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const isIncoming = f.addressee_id === user.id;
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

        // For pending, use starter_message; for accepted, get latest DM
        let lastMessage = f.starter_message || 'Start chatting!';
        let lastMessageAt = f.created_at;
        let unreadCount = 0;

        if (f.status === 'accepted') {
          // Get latest message
          const { data: messages } = await supabase
            .from('direct_messages')
            .select('content, created_at, is_read, sender_id')
            .eq('friendship_id', f.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsg = messages?.[0];
          if (lastMsg) {
            lastMessage = lastMsg.content;
            lastMessageAt = lastMsg.created_at;
          }

          // Count unread
          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('friendship_id', f.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          unreadCount = count || 0;
        }

        return {
          id: f.id,
          friend_id: friendId,
          friend_username: friendProfile?.username || null,
          friend_character_name: friendCharName,
          friend_avatar_url: friendAvatarUrl,
          last_message: lastMessage,
          last_message_at: lastMessageAt,
          unread_count: unreadCount,
          status: f.status as 'accepted' | 'pending',
          is_incoming: isIncoming,
        };
      })
    );

    // Sort by latest message/created_at
    convos.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    setConversations(convos);
    setLoading(false);
  };

  const handleDeleteConversation = async () => {
    if (!deleteTarget) return;
    
    // Delete all messages in this conversation
    await supabase
      .from('direct_messages')
      .delete()
      .eq('friendship_id', deleteTarget.id);
    
    // Delete the friendship
    await supabase
      .from('friendships')
      .delete()
      .eq('id', deleteTarget.id);
    
    setConversations(prev => prev.filter(c => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: 'Conversation deleted' });
  };

  const handleBlockUser = async (friendId: string) => {
    if (!user) return;
    
    await supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_id: friendId
    });
    
    toast({ title: 'User blocked' });
    fetchConversations();
  };

  const handleAcceptRequest = async (convoId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', convoId);

    if (error) {
      toast({ title: 'Failed to accept', variant: 'destructive' });
    } else {
      toast({ title: 'Story begins! Roleplay accepted.' });
      fetchConversations();
    }
  };

  const handleDeclineRequest = async (convoId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', convoId);

    if (error) {
      toast({ title: 'Failed to decline', variant: 'destructive' });
    } else {
      toast({ title: 'Proposal declined' });
      setConversations(prev => prev.filter(c => c.id !== convoId));
    }
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.friend_character_name?.toLowerCase().includes(query) ||
      c.friend_username?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

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
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="space-y-1.5">
        {filteredConversations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No conversations match your search</p>
        ) : (
          filteredConversations.map((convo, index) => (
            <motion.div
              key={convo.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="relative group"
            >
              <div
                onClick={() => convo.status === 'accepted' && onSelectConversation(convo.id, convo.friend_id)}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl bg-[#0a0a0a] hover:bg-[#111] border transition-all text-left ${
                  convo.status === 'pending' 
                    ? 'border-[#7C3AED]/40' 
                    : 'border-[#1a1a1a] hover:border-[#7C3AED]/30 cursor-pointer'
                }`}
              >
                {/* Large Square Thumbnail - Mascot Style */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden">
                    {convo.friend_avatar_url ? (
                      <img 
                        src={convo.friend_avatar_url} 
                        alt={convo.friend_character_name || 'Friend'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-purple-900 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {convo.friend_character_name?.[0] || convo.friend_username?.[0] || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Pending indicator */}
                  {convo.status === 'pending' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Bold Title + Username + Pending Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white text-base truncate">
                        {convo.friend_character_name || convo.friend_username || 'Friend'}
                      </span>
                      {convo.friend_username && convo.friend_character_name && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          @{convo.friend_username}
                        </span>
                      )}
                      {convo.status === 'pending' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full shrink-0">
                          {convo.is_incoming ? 'Incoming' : 'Sent'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: false })}
                    </span>
                  </div>
                  {/* Narrative Snippet - Italicized/Dimmed */}
                  <p className={`text-sm truncate mt-0.5 italic ${
                    convo.unread_count > 0 || convo.status === 'pending' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {convo.status === 'pending' ? `"${convo.last_message}"` : convo.last_message}
                  </p>
                  
                  {/* Accept/Decline buttons for incoming pending */}
                  {convo.status === 'pending' && convo.is_incoming && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeclineRequest(convo.id); }}
                        className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAcceptRequest(convo.id); }}
                        className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                    </div>
                  )}
                </div>

                {/* Purple Badge for Unread - Mascot Style */}
                {convo.status === 'accepted' && convo.unread_count > 0 && (
                  <div className="flex-shrink-0">
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="min-w-[24px] h-6 px-2 bg-[#7C3AED] rounded-full flex items-center justify-center text-xs font-bold text-white"
                    >
                      {convo.unread_count}
                    </motion.span>
                  </div>
                )}
              </div>
              
              {/* Context Menu - Only for accepted */}
              {convo.status === 'accepted' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card rounded-full hover:bg-secondary">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDeleteTarget(convo)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBlockUser(convo.friend_id)} className="text-destructive">
                      <Ban className="w-4 h-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: 'Report submitted' })}>
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages with {deleteTarget?.friend_character_name || deleteTarget?.friend_username}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
