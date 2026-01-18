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
            case 'roleplay_proposal':
              url = notification.data?.friendship_id ? `/dm/${notification.data.friendship_id}` : '/messages';
              break;
            case 'dm':
              url = notification.data?.friendship_id ? `/dm/${notification.data.friendship_id}` : '/messages';
              break;
            case 'follow':
              url = notification.data?.follower_id ? `/user/${notification.data.follower_id}` : undefined;
              break;
            case 'world_join':
              url = notification.data?.world_id ? `/worlds/${notification.data.world_id}` : '/';
              break;
            case 'world_invite':
              url = notification.data?.world_id ? `/worlds/${notification.data.world_id}` : '/';
              break;
            default:
              url = '/';
          }

          showNotification(notification.title, notification.body || '', { url });
        }
      )
      .subscribe();

    // Subscribe to new friendship requests (roleplay proposals)
    const friendshipChannel = supabase
      .channel('friendship-push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships'
        },
        async (payload) => {
          const friendship = payload.new as any;
          
          // Only notify if we're the addressee (receiving the request)
          if (friendship.addressee_id !== user.id) return;
          
          // Get requester info
          const { data: requester } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', friendship.requester_id)
            .maybeSingle();
          
          // Get character name if available
          let characterName = requester?.username || 'Someone';
          if (friendship.requester_character_id) {
            const { data: char } = await supabase
              .from('characters')
              .select('name')
              .eq('id', friendship.requester_character_id)
              .maybeSingle();
            if (char) characterName = char.name;
          }
          
          showNotification(
            'New Roleplay Proposal',
            `${characterName} wants to start a story with you!`,
            { url: `/dm/${friendship.id}` }
          );
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
            .maybeSingle();
          
          if (!friendship) return;
          if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) return;
          
          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', message.sender_id)
            .maybeSingle();
          
          showNotification(
            `New message from ${sender?.username || 'Someone'}`,
            message.content.substring(0, 100),
            { url: `/dm/${message.friendship_id}` }
          );
        }
      )
      .subscribe();

    // Subscribe to friendship status updates (accepted requests)
    const friendshipUpdateChannel = supabase
      .channel('friendship-update-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships'
        },
        async (payload) => {
          const friendship = payload.new as any;
          const oldFriendship = payload.old as any;
          
          // Only notify if status changed to accepted and we're the requester
          if (oldFriendship.status !== 'pending' || friendship.status !== 'accepted') return;
          if (friendship.requester_id !== user.id) return;
          
          // Get addressee info
          const { data: addressee } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', friendship.addressee_id)
            .maybeSingle();
          
          showNotification(
            'Roleplay Accepted!',
            `${addressee?.username || 'Someone'} accepted your roleplay proposal!`,
            { url: `/dm/${friendship.id}` }
          );
        }
      )
      .subscribe();

    // Subscribe to group chat messages (world rooms)
    const groupChatChannel = supabase
      .channel('group-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Don't notify for own messages or AI messages
          if (message.sender_id === user.id || message.is_ai) return;
          
          // Check if user is a member of this room's world
          const { data: room } = await supabase
            .from('world_rooms')
            .select('id, name, world_id')
            .eq('id', message.room_id)
            .maybeSingle();
          
          if (!room) return;
          
          const { data: membership } = await supabase
            .from('world_members')
            .select('id')
            .eq('world_id', room.world_id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!membership) return;
          
          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', message.sender_id)
            .maybeSingle();
          
          showNotification(
            `New message in ${room.name}`,
            `${sender?.username || 'Someone'}: ${message.content.substring(0, 80)}`,
            { url: `/worlds/${room.world_id}/rooms/${room.id}` }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(friendshipChannel);
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(friendshipUpdateChannel);
      supabase.removeChannel(groupChatChannel);
    };
  }, [user, requestPermission, showNotification]);

  return { requestPermission, showNotification };
};

// Provider component to initialize push notifications globally
export const PushNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  usePushNotifications();
  return <>{children}</>;
};
