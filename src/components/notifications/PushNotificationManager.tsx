import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = () => {
  const { user } = useAuth();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback((title: string, body: string, data?: { url?: string }) => {
    if (Notification.permission !== 'granted') return;
    if (document.hasFocus()) return; // Don't show if app is focused

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'app-notification'
    });

    notification.onclick = () => {
      window.focus();
      if (data?.url) {
        window.location.href = data.url;
      }
      notification.close();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    requestPermission();

    // Subscribe to notifications table for real-time push
    const channel = supabase
      .channel('push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as any;
          
          let url: string | undefined;
          
          // Determine URL based on notification type
          switch (notification.type) {
            case 'friend_request':
              url = '/hub';
              break;
            case 'dm':
              url = notification.data?.friendship_id ? `/dm/${notification.data.friendship_id}` : '/hub';
              break;
            case 'follow':
              url = notification.data?.follower_id ? `/user/${notification.data.follower_id}` : undefined;
              break;
            case 'world_join':
              url = notification.data?.world_id ? `/worlds/${notification.data.world_id}` : '/hub';
              break;
            case 'world_invite':
              url = notification.data?.world_id ? `/worlds/${notification.data.world_id}` : '/hub';
              break;
            default:
              url = undefined;
          }

          showNotification(notification.title, notification.body || '', { url });
        }
      )
      .subscribe();

    // Subscribe to direct messages for real-time push
    const dmChannel = supabase
      .channel('dm-push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Only notify if we're the recipient (not sender)
          if (message.sender_id === user.id) return;
          
          // Check if we're part of this friendship
          const { data: friendship } = await supabase
            .from('friendships')
            .select('id, requester_id, addressee_id')
            .eq('id', message.friendship_id)
            .single();
          
          if (!friendship) return;
          if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) return;
          
          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', message.sender_id)
            .single();
          
          showNotification(
            `New message from ${sender?.username || 'Someone'}`,
            message.content.substring(0, 100),
            { url: `/dm/${message.friendship_id}` }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(dmChannel);
    };
  }, [user, requestPermission, showNotification]);

  return { requestPermission, showNotification };
};

// Provider component to initialize push notifications globally
export const PushNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  usePushNotifications();
  return <>{children}</>;
};
