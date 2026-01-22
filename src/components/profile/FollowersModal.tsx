import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FollowerUser {
  id: string;
  username: string | null;
  avatar_url?: string | null;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

export const FollowersModal = ({ isOpen, onClose, userId, type }: FollowersModalProps) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    
    if (type === 'followers') {
      // Get users who follow this userId
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);
      
      if (data && data.length > 0) {
        const followerIds = data.map(f => f.follower_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', followerIds);
        
        // Get active character avatars
        const usersWithAvatars: FollowerUser[] = [];
        if (profiles) {
          for (const p of profiles) {
            const { data: charData } = await supabase
              .from('characters')
              .select('avatar_url')
              .eq('owner_id', p.id)
              .eq('is_hidden', false)
              .limit(1)
              .maybeSingle();
            
            usersWithAvatars.push({
              id: p.id,
              username: p.username,
              avatar_url: charData?.avatar_url || null
            });
          }
        }
        setUsers(usersWithAvatars);
      } else {
        setUsers([]);
      }
    } else {
      // Get users this userId follows
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (data && data.length > 0) {
        const followingIds = data.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', followingIds);
        
        const usersWithAvatars: FollowerUser[] = [];
        if (profiles) {
          for (const p of profiles) {
            const { data: charData } = await supabase
              .from('characters')
              .select('avatar_url')
              .eq('owner_id', p.id)
              .eq('is_hidden', false)
              .limit(1)
              .maybeSingle();
            
            usersWithAvatars.push({
              id: p.id,
              username: p.username,
              avatar_url: charData?.avatar_url || null
            });
          }
        }
        setUsers(usersWithAvatars);
      } else {
        setUsers([]);
      }
    }
    
    setLoading(false);
  };

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/user/${userId}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card border border-border rounded-xl w-full max-w-sm max-h-[60vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {type === 'followers' ? 'Followers' : 'Following'}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </div>
            ) : (
              <div className="p-2">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleUserClick(u.id)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/40 to-purple-900/40 flex items-center justify-center">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-foreground">
                          {(u.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      @{u.username || 'anonymous'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
