import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Check, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Friend {
  friendshipId: string;
  friendId: string;
  username: string | null;
  avatarUrl: string | null;
  characterName: string | null;
  isAlreadyMember: boolean;
}

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldId: string;
  worldName: string;
}

export const InviteFriendsModal = ({ isOpen, onClose, worldId, worldName }: InviteFriendsModalProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
    }
  }, [isOpen, user, worldId]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    // Get accepted friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error || !friendships) {
      setLoading(false);
      return;
    }

    // Get friend IDs
    const friendIds = friendships.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', friendIds);

    // Get first character for each friend
    const { data: characters } = await supabase
      .from('characters')
      .select('owner_id, name, avatar_url')
      .in('owner_id', friendIds)
      .eq('is_hidden', false);

    const characterMap: Record<string, { name: string; avatar_url: string | null }> = {};
    characters?.forEach(c => {
      if (!characterMap[c.owner_id]) {
        characterMap[c.owner_id] = { name: c.name, avatar_url: c.avatar_url };
      }
    });

    // Check which friends are already members
    const { data: members } = await supabase
      .from('world_members')
      .select('user_id')
      .eq('world_id', worldId)
      .in('user_id', friendIds);

    const memberIds = new Set(members?.map(m => m.user_id) || []);

    const friendsList: Friend[] = friendships.map(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const p = profiles?.find(p => p.id === friendId);
      const char = characterMap[friendId];
      
      return {
        friendshipId: f.id,
        friendId,
        username: p?.username || null,
        avatarUrl: char?.avatar_url || null,
        characterName: char?.name || null,
        isAlreadyMember: memberIds.has(friendId)
      };
    });

    setFriends(friendsList);
    setLoading(false);
  };

  const handleInvite = async (friend: Friend) => {
    if (!user || !profile) return;

    setInvitingIds(prev => new Set([...prev, friend.friendId]));

    // Create a notification to invite them
    const { error } = await supabase.from('notifications').insert({
      user_id: friend.friendId,
      type: 'world_invite',
      title: 'World Invitation',
      body: `${profile.username || 'Someone'} invited you to join "${worldName}"`,
      data: { 
        world_id: worldId, 
        inviter_id: user.id,
        world_name: worldName
      }
    });

    if (error) {
      toast({ title: 'Failed to send invite', variant: 'destructive' });
    } else {
      toast({ title: 'Invite sent!', description: `${friend.username} has been invited` });
    }

    setInvitingIds(prev => {
      const next = new Set(prev);
      next.delete(friend.friendId);
      return next;
    });
  };

  const filteredFriends = friends.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.username?.toLowerCase().includes(q) ||
      f.characterName?.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border border-border rounded-xl z-50 shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Friends to World
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="max-h-80 overflow-y-auto p-4 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}

              {!loading && filteredFriends.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  {friends.length === 0 
                    ? 'No friends yet. Connect with users first!' 
                    : 'No friends match your search'}
                </p>
              )}

              {!loading && filteredFriends.map((friend) => (
                <div
                  key={friend.friendId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {(friend.username || friend.characterName || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      @{friend.username || 'unknown'}
                    </p>
                    {friend.characterName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {friend.characterName}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  {friend.isAlreadyMember ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" />
                      Member
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleInvite(friend)}
                      disabled={invitingIds.has(friend.friendId)}
                      className="gap-1"
                    >
                      {invitingIds.has(friend.friendId) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      Invite
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
