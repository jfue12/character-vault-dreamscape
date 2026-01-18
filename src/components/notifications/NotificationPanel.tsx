import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Scroll, MessageCircle, Shield, Check, Trash2, Users, Heart, Globe, Sparkles, MessageSquare } from 'lucide-react';
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

  const handleAcceptRoleplayProposal = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.friendship_id) return;

    setProcessingIds(prev => new Set(prev).add(notification.id));

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', notification.data.friendship_id);

    if (error) {
      toast({ title: 'Failed to accept proposal', variant: 'destructive' });
    } else {
      toast({ title: 'Story begins! Roleplay accepted.' });
      deleteNotification(notification.id);
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });
  };

  const handleDeclineRoleplayProposal = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.friendship_id) return;

    setProcessingIds(prev => new Set(prev).add(notification.id));

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', notification.data.friendship_id);

    if (error) {
      toast({ title: 'Failed to decline proposal', variant: 'destructive' });
    } else {
      toast({ title: 'Roleplay proposal declined' });
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
      case 'roleplay_proposal':
        // Friend requests are handled inline with accept/decline buttons
        if (notification.data?.friendship_id) {
          navigate(`/dm/${notification.data.friendship_id}`);
          onClose();
        }
        break;
      case 'friend_accepted':
        if (notification.data?.friendship_id) {
          navigate(`/dm/${notification.data.friendship_id}`);
          onClose();
        }
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
      case 'room_message':
        if (notification.data?.world_id && notification.data?.room_id) {
          navigate(`/worlds/${notification.data.world_id}/rooms/${notification.data.room_id}`);
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
      case 'roleplay_proposal':
      case 'friend_request':
        return <Scroll className="w-5 h-5 text-primary" />;
      case 'friend_accepted':
        return <Check className="w-5 h-5 text-green-500" />;
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
      case 'story_reaction':
      case 'post_like':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'post_comment':
        return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'room_message':
        return <MessageCircle className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationMessage = (notification: Notification): string => {
    const data = notification.data || {};
    const characterName = data.character_name || data.username || 'Someone';
    
    switch (notification.type) {
      case 'roleplay_proposal':
      case 'friend_request':
        return `${characterName} wants to start a story with you!`;
      case 'friend_accepted':
        return `${characterName} accepted your roleplay proposal!`;
      case 'dm':
        return `${characterName} sent you a message`;
      case 'follow':
        return `${characterName} started following you`;
      case 'world_join':
        return `${characterName} joined ${data.world_name || 'your world'}`;
      case 'world_invite':
        return `You've been invited to ${data.world_name || 'a world'}`;
      case 'story_reaction':
        return `${characterName} reacted to your story`;
      case 'post_like':
        return `${characterName} liked your post`;
      case 'post_comment':
        return `${characterName} commented on your post`;
      case 'room_message':
        return `${characterName} posted in ${data.room_name || 'a room'}`;
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
                    const isRoleplayProposal = notification.type === 'roleplay_proposal' || notification.type === 'friend_request';
                    const isProcessing = processingIds.has(notification.id);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 hover:bg-secondary/30 transition-colors cursor-pointer relative group ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
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
                            
                            {/* Show plot hook for roleplay proposals */}
                            {isRoleplayProposal && notification.data?.starter_message && (
                              <div className="mt-2">
                                <span className="text-xs text-primary/70">Plot Hook:</span>
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 italic">
                                  "{notification.data.starter_message}"
                                </p>
                              </div>
                            )}
                            
                            {/* Post preview for likes/comments */}
                            {(notification.type === 'post_like' || notification.type === 'post_comment') && (
                              <div className="mt-2 flex gap-2">
                                {/* Post thumbnail */}
                                {notification.data?.post_image_url && (
                                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                                    <img 
                                      src={notification.data.post_image_url} 
                                      alt="Post" 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  {/* Post snippet */}
                                  {notification.data?.post_snippet && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 bg-secondary/50 rounded px-2 py-1">
                                      {notification.data.post_snippet}
                                    </p>
                                  )}
                                  {/* Comment snippet for comments */}
                                  {notification.type === 'post_comment' && notification.data?.comment_snippet && (
                                    <div className="mt-1.5">
                                      <span className="text-xs text-primary/70">Comment:</span>
                                      <p className="text-xs text-foreground/80 line-clamp-2 italic mt-0.5">
                                        "{notification.data.comment_snippet}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                            </p>
                            
                            {/* Accept/Decline buttons for roleplay proposals */}
                            {isRoleplayProposal && notification.data?.friendship_id && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => handleDeclineRoleplayProposal(notification, e)}
                                  disabled={isProcessing}
                                  className="flex-1"
                                >
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => handleAcceptRoleplayProposal(notification, e)}
                                  disabled={isProcessing}
                                  className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Begin Story
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Delete button - not for roleplay proposals with pending action */}
                        {!isRoleplayProposal && (
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
