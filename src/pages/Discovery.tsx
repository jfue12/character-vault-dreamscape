import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, PanInfo, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, MessageCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { FriendRequestModal } from '@/components/discovery/FriendRequestModal';
import { useToast } from '@/hooks/use-toast';

interface DiscoveryUser {
  id: string;
  username: string | null;
  bio: string | null;
  banner_url: string | null;
  accent_color: string | null;
  active_character: {
    id: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
    pronouns: string | null;
    identity_tags?: { sexuality?: string; rp_style?: string } | null;
  } | null;
}

export default function Discovery() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<DiscoveryUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [friendRequestTarget, setFriendRequestTarget] = useState<DiscoveryUser | null>(null);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDiscoveryUsers();
    }
  }, [user]);

  const fetchDiscoveryUsers = async () => {
    if (!user) return;
    setLoadingUsers(true);

    // Get users we've already interacted with (friends/pending)
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const excludeIds = new Set([user.id]);
    friendships?.forEach(f => {
      excludeIds.add(f.requester_id);
      excludeIds.add(f.addressee_id);
    });

    // Get blocked users
    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('blocked_id, blocker_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    blocks?.forEach(b => {
      excludeIds.add(b.blocked_id);
      excludeIds.add(b.blocker_id);
    });

    // Fetch random users with their active characters
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        bio,
        banner_url,
        accent_color,
        active_character_id
      `)
      .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
      .not('username', 'is', null)
      .limit(50);

    if (error) {
      console.error('Error fetching users:', error);
      setLoadingUsers(false);
      return;
    }

    // Fetch active characters for each user
    const usersWithCharacters: DiscoveryUser[] = [];
    for (const p of profiles || []) {
      let activeChar = null;
      if (p.active_character_id) {
        const { data: char } = await supabase
          .from('characters')
          .select('id, name, avatar_url, bio, pronouns, identity_tags')
          .eq('id', p.active_character_id)
          .maybeSingle();
        if (char) {
          activeChar = {
            id: char.id,
            name: char.name,
            avatar_url: char.avatar_url,
            bio: char.bio,
            pronouns: char.pronouns,
            identity_tags: char.identity_tags as { sexuality?: string; rp_style?: string } | null
          };
        }
      }

      // Only include users who have an avatar (character or banner)
      if (activeChar?.avatar_url || p.banner_url) {
        usersWithCharacters.push({
          id: p.id,
          username: p.username,
          bio: p.bio,
          banner_url: p.banner_url,
          accent_color: p.accent_color,
          active_character: activeChar
        });
      }
    }

    // Shuffle array
    const shuffled = usersWithCharacters.sort(() => Math.random() - 0.5);
    setUsers(shuffled);
    setCurrentIndex(0);
    setLoadingUsers(false);
  };

  const handleSwipeLeft = () => {
    if (currentIndex >= users.length) return;
    const currentUser = users[currentIndex];
    setSwipedIds(prev => new Set(prev).add(currentUser.id));
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeRight = (targetUser: DiscoveryUser) => {
    setSwipedIds(prev => new Set(prev).add(targetUser.id));
    setFriendRequestTarget(targetUser);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];

  if (loading) {
    return (
      <AppLayout title="Discover">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Discover People"
      headerLeftIcon="back"
      headerRightIcon="none"
    >
      <div className="max-w-lg mx-auto px-4 pb-24">
        {loadingUsers ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 || currentIndex >= users.length ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {users.length === 0 ? 'No users to discover right now' : 'You\'ve seen everyone!'}
            </p>
            <button
              onClick={fetchDiscoveryUsers}
              className="text-primary hover:underline font-medium"
            >
              Refresh
            </button>
          </motion.div>
        ) : (
          <div className="relative h-[70vh] max-h-[600px]">
            {/* Card Stack */}
            <AnimatePresence>
              {nextUser && (
                <SwipeCard
                  key={nextUser.id}
                  user={nextUser}
                  onSwipeLeft={() => {}}
                  onSwipeRight={() => {}}
                  onViewProfile={() => {}}
                  isTop={false}
                />
              )}
              {currentUser && (
                <SwipeCard
                  key={currentUser.id}
                  user={currentUser}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={() => handleSwipeRight(currentUser)}
                  onViewProfile={() => handleViewProfile(currentUser.id)}
                  isTop={true}
                />
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6">
              <button
                onClick={handleSwipeLeft}
                className="w-14 h-14 rounded-full bg-card border-2 border-destructive flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <X className="w-7 h-7 text-destructive" />
              </button>
              <button
                onClick={() => handleViewProfile(currentUser?.id || '')}
                className="w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <MessageCircle className="w-6 h-6 text-primary" />
              </button>
              <button
                onClick={() => currentUser && handleSwipeRight(currentUser)}
                className="w-14 h-14 rounded-full bg-card border-2 border-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Heart className="w-7 h-7 text-green-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {friendRequestTarget && (
        <FriendRequestModal
          open={!!friendRequestTarget}
          onOpenChange={(open) => {
            if (!open) {
              setFriendRequestTarget(null);
              setCurrentIndex(prev => prev + 1);
            }
          }}
          targetCharacter={friendRequestTarget.active_character ? {
            id: friendRequestTarget.active_character.id,
            name: friendRequestTarget.active_character.name,
            avatar_url: friendRequestTarget.active_character.avatar_url,
            owner_id: friendRequestTarget.id,
            profiles: { username: friendRequestTarget.username }
          } : null}
          onSuccess={() => {
            setFriendRequestTarget(null);
            setCurrentIndex(prev => prev + 1);
          }}
        />
      )}
    </AppLayout>
  );
}

// Swipe Card Component
interface SwipeCardProps {
  user: DiscoveryUser;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onViewProfile: () => void;
  isTop: boolean;
}

function SwipeCard({ user, onSwipeLeft, onSwipeRight, onViewProfile, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  const displayName = user.active_character?.name || user.username || 'Unknown';
  const displayAvatar = user.active_character?.avatar_url || user.banner_url;
  const displayBio = user.active_character?.bio || user.bio;
  const identityTags = user.active_character?.identity_tags;
  const identityLine = [
    user.active_character?.pronouns,
    identityTags?.sexuality,
    identityTags?.rp_style,
  ].filter(Boolean).join(' | ');

  return (
    <motion.div
      className="absolute w-full h-full"
      style={{ x, rotate, opacity }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      initial={!isTop ? { scale: 0.95, y: 10 } : false}
      animate={isTop ? { scale: 1, y: 0 } : { scale: 0.95, y: 10 }}
      onClick={isTop ? onViewProfile : undefined}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-card border border-border shadow-xl">
        {/* Background Image */}
        {displayAvatar ? (
          <img 
            src={displayAvatar} 
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-900/50 flex items-center justify-center">
            <span className="text-8xl font-display font-bold text-primary/60">
              {displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Like/Nope Indicators */}
        <motion.div
          className="absolute top-10 right-10 px-6 py-2 border-4 border-green-500 rounded-lg"
          style={{ opacity: likeOpacity, rotate: -20 }}
        >
          <span className="text-3xl font-bold text-green-500">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-10 left-10 px-6 py-2 border-4 border-red-500 rounded-lg"
          style={{ opacity: nopeOpacity, rotate: 20 }}
        >
          <span className="text-3xl font-bold text-red-500">NOPE</span>
        </motion.div>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <h2 className="text-3xl font-display font-bold text-white">
            {displayName}
          </h2>
          <p className="text-sm text-white/70">
            @{user.username || 'anonymous'}
          </p>
          
          {identityLine && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary font-medium">
                {identityLine}
              </span>
            </div>
          )}
          
          {displayBio && (
            <p className="text-sm text-white/80 line-clamp-3">
              {displayBio}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
