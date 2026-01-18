import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, UserPlus, MessageCircle, Shield, Check, Trash2, Users, Heart, Globe, ThumbsUp, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel = ({ isOpen, onClose }: NotificationPanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && isOpen) {
      fetchNotifications();
      
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isOpen]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data.map(n => ({
        ...n,
        data: n.data as Record<string, any> | null
      })));
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAcceptFriendRequest = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.friendship_id) return;

    setProcessingIds(prev => new Set(prev).add(notification.id));

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', notification.data.friendship_id);

    if (error) {
      toast({ title: 'Failed to accept request', variant: 'destructive' });
    } else {
      toast({ title: 'Friend request accepted!' });
      deleteNotification(notification.id);
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });
  };

  const handleDeclineFriendRequest = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.friendship_id) return;

    setProcessingIds(prev => new Set(prev).add(notification.id));

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', notification.data.friendship_id);

    if (error) {
      toast({ title: 'Failed to decline request', variant: 'destructive' });
    } else {
      toast({ title: 'Friend request declined' });
      deleteNotification(notification.id);
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    switch (notification.type) {
      case 'friend_request':
        // Friend requests are handled inline with accept/decline buttons
        break;
      case 'dm':
        if (notification.data?.friendship_id) {
          navigate(`/dm/${notification.data.friendship_id}`);
          onClose();
        }
        break;
      case 'world_invite':
      case 'world_join':
        if (notification.data?.world_id) {
          navigate(`/worlds/${notification.data.world_id}`);
          onClose();
        }
        break;
      case 'moderation':
        if (notification.data?.world_id) {
          navigate(`/worlds/${notification.data.world_id}`);
          onClose();
        }
        break;
      case 'follow':
        if (notification.data?.follower_id) {
          navigate(`/user/${notification.data.follower_id}`);
          onClose();
        }
        break;
      case 'post_like':
      case 'post_comment':
        if (notification.data?.post_id) {
          navigate(`/post/${notification.data.post_id}`);
          onClose();
        }
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-primary" />;
      case 'dm':
        return <MessageCircle className="w-5 h-5 text-primary" />;
      case 'moderation':
        return <Shield className="w-5 h-5 text-destructive" />;
      case 'follow':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'world_join':
        return <Globe className="w-5 h-5 text-primary" />;
      case 'world_invite':
        return <Users className="w-5 h-5 text-primary" />;
      case 'post_like':
        return <ThumbsUp className="w-5 h-5 text-primary" />;
      case 'post_comment':
        return <MessageSquare className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationMessage = (notification: Notification): string => {
    const data = notification.data || {};
    const username = data.username || data.character_name || 'Someone';
    
    switch (notification.type) {
      case 'friend_request':
        return `${username} sent you a friend request!`;
      case 'dm':
        return `${username} sent you a message`;
      case 'follow':
        return `${username} followed you!`;
      case 'world_join':
        return `${username} joined your world "${data.world_name || 'your world'}"`;
      case 'world_invite':
        return `You've been invited to join "${data.world_name || 'a world'}"`;
      case 'post_like':
        return `${username} liked your post`;
      case 'post_comment':
        return `${username} commented on your post`;
      case 'moderation':
        return notification.body || 'Moderation action taken';
      default:
        return notification.body || notification.title;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const isFriendRequest = notification.type === 'friend_request';
                    const isProcessing = processingIds.has(notification.id);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 hover:bg-secondary/30 transition-colors cursor-pointer relative group ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => !isFriendRequest && handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {getNotificationMessage(notification)}
                              </p>
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            
                            {/* Show starter message for friend requests */}
                            {isFriendRequest && notification.data?.starter_message && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 italic">
                                "{notification.data.starter_message}"
                              </p>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                            </p>
                            
                            {/* Accept/Decline buttons for friend requests */}
                            {isFriendRequest && notification.data?.friendship_id && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => handleDeclineFriendRequest(notification, e)}
                                  disabled={isProcessing}
                                  className="flex-1"
                                >
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => handleAcceptFriendRequest(notification, e)}
                                  disabled={isProcessing}
                                  className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Accept
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Delete button - not for friend requests with pending action */}
                        {!isFriendRequest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="absolute top-4 right-4 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
