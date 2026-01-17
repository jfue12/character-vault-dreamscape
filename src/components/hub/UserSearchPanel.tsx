import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FriendRequestModal } from '@/components/discovery/FriendRequestModal';

interface SearchUser {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  character_name: string | null;
}

interface UserSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSearchPanel = ({ isOpen, onClose }: UserSearchPanelProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendRequestTarget, setFriendRequestTarget] = useState<{ id: string; username: string } | null>(null);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const searchUsers = async () => {
    if (!user) return;
    setLoading(true);

    // Search profiles by username
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, bio')
      .neq('id', user.id)
      .ilike('username', `%${searchQuery}%`)
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      setLoading(false);
      return;
    }

    // Get first character for each user as their avatar
    const userIds = profiles?.map(p => p.id) || [];
    
    let characterMap: Record<string, { avatar_url: string | null; name: string }> = {};
    if (userIds.length > 0) {
      const { data: characters } = await supabase
        .from('characters')
        .select('owner_id, avatar_url, name')
        .in('owner_id', userIds)
        .eq('is_hidden', false);

      if (characters) {
        // Get first character for each user
        characters.forEach(c => {
          if (!characterMap[c.owner_id]) {
            characterMap[c.owner_id] = { avatar_url: c.avatar_url, name: c.name };
          }
        });
      }
    }

    // Check friendship statuses
    const statuses: Record<string, string> = {};
    for (const p of profiles || []) {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${p.id}),and(requester_id.eq.${p.id},addressee_id.eq.${user.id})`)
        .maybeSingle();
      
      if (friendship) {
        statuses[p.id] = friendship.status;
      }
    }
    setFriendshipStatuses(statuses);

    const searchResults: SearchUser[] = (profiles || []).map(p => ({
      id: p.id,
      username: p.username,
      bio: p.bio,
      avatar_url: characterMap[p.id]?.avatar_url || null,
      character_name: characterMap[p.id]?.name || null
    }));

    setResults(searchResults);
    setLoading(false);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
    onClose();
  };

  const handleSendRequest = (userId: string, username: string) => {
    setFriendRequestTarget({ id: userId, username });
  };

  const handleMessage = async (userId: string) => {
    if (!user) return;

    const { data: friendship } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (friendship) {
      navigate(`/dm/${friendship.id}`);
      onClose();
    } else {
      toast({ title: 'Not connected', description: 'Send a friend request first' });
    }
  };

  const getFriendshipStatus = (userId: string) => friendshipStatuses[userId] || null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-xl p-4 mb-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Find Users
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}

              {!loading && searchQuery.length >= 2 && results.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No users found
                </p>
              )}

              {!loading && results.map((u) => {
                const status = getFriendshipStatus(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {/* Avatar */}
                    <button 
                      onClick={() => handleViewProfile(u.id)}
                      className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                          {(u.username || u.character_name || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <button 
                      onClick={() => handleViewProfile(u.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-medium text-foreground truncate">
                        @{u.username || 'unknown'}
                      </p>
                      {u.character_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          Playing as {u.character_name}
                        </p>
                      )}
                    </button>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {status === 'accepted' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMessage(u.id)}
                          className="gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      ) : status === 'pending' ? (
                        <Button size="sm" variant="outline" disabled className="text-xs">
                          Pending
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendRequest(u.id, u.username || 'User')}
                          className="gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {searchQuery.length < 2 && results.length === 0 && !loading && (
              <p className="text-center text-muted-foreground text-sm py-4">
                Type at least 2 characters to search
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Request Modal */}
      {friendRequestTarget && (
        <FriendRequestModal
          open={!!friendRequestTarget}
          onOpenChange={(open) => !open && setFriendRequestTarget(null)}
          targetCharacter={{
            id: friendRequestTarget.id,
            owner_id: friendRequestTarget.id,
            name: friendRequestTarget.username,
            avatar_url: null,
            profiles: { username: friendRequestTarget.username }
          }}
          onSuccess={() => {
            setFriendRequestTarget(null);
            searchUsers(); // Refresh to update status
          }}
        />
      )}
    </>
  );
};
