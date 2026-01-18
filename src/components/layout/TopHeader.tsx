import { UserPlus, Bell, MoreHorizontal, ChevronLeft, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

interface TopHeaderProps {
  title?: string;
  variant?: 'default' | 'worlds' | 'profile' | 'simple' | 'room';
  leftIcon?: 'grid' | 'avatar' | 'add-friend' | 'back' | 'none';
  rightIcon?: 'search' | 'notifications' | 'menu' | 'more' | 'none';
  onLeftAction?: () => void;
  onRightAction?: () => void;
  subtitle?: string;
  onTitleClick?: () => void;
  showVerified?: boolean;
  showActiveOC?: boolean;
}

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

export const TopHeader = ({
  title,
  variant = 'default',
  leftIcon = 'none',
  rightIcon = 'none',
  onLeftAction,
  onRightAction,
  subtitle,
  onTitleClick,
  showVerified = true,
  showActiveOC = false
}: TopHeaderProps) => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user && profile?.active_character_id) {
      fetchActiveCharacter();
    }
  }, [user, profile?.active_character_id]);

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
      fetchPendingFriendRequests();
      
      // Subscribe to notifications for real-time updates
      const notificationChannel = supabase
        .channel('notification-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchUnreadNotifications()
        )
        .subscribe();

      // Subscribe to friendships for pending request updates
      const friendshipChannel = supabase
        .channel('friendship-pending-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
          },
          () => fetchPendingFriendRequests()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notificationChannel);
        supabase.removeChannel(friendshipChannel);
      };
    }
  }, [user]);

  const fetchActiveCharacter = async () => {
    if (!profile?.active_character_id) return;
    
    const { data } = await supabase
      .from('characters')
      .select('id, name, avatar_url')
      .eq('id', profile.active_character_id)
      .single();
    
    if (data) {
      setActiveCharacter(data);
    }
  };

  const fetchUnreadNotifications = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);
    
    setUnreadNotifications(count || 0);
  };

  const fetchPendingFriendRequests = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
    
    setPendingFriendRequests(count || 0);
  };

  const renderLeftIcon = () => {
    switch (leftIcon) {
      case 'add-friend':
        return (
          <button 
            onClick={onLeftAction}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        );
      case 'back':
        return (
          <button 
            onClick={onLeftAction || (() => navigate(-1))}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        );
      case 'avatar':
        return (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
            {profile?.username?.[0]?.toUpperCase() || 'M'}
          </div>
        );
      default:
        return <div className="w-10" />;
    }
  };

  const renderRightIcon = () => {
    switch (rightIcon) {
      case 'notifications':
        const totalBadgeCount = unreadNotifications + pendingFriendRequests;
        return (
          <>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 -mr-2 text-foreground hover:text-primary transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {totalBadgeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              )}
            </button>
            <NotificationPanel 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </>
        );
      case 'more':
        return (
          <button 
            onClick={onRightAction}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        );
      default:
        return <div className="w-10" />;
    }
  };

  const renderTitle = () => {
    if (showActiveOC && activeCharacter) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-foreground">
            {activeCharacter.name}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              @{profile?.username || 'user'}
            </span>
            {showVerified && profile?.username && (
              <BadgeCheck className="w-3 h-3 text-primary fill-primary" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-foreground">
          {title || (profile?.username ? `@${profile.username}` : 'MASCOT')}
        </span>
        {showVerified && profile?.username && !title && (
          <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        {renderLeftIcon()}
        
        <button 
          onClick={onTitleClick}
          className="flex items-center gap-1.5"
          disabled={!onTitleClick}
        >
          {renderTitle()}
        </button>

        {renderRightIcon()}
      </div>
    </header>
  );
};
