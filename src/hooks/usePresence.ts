import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineUser {
  odId: string;
  username: string;
  lastSeen: string;
}

export const usePresence = () => {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Map<string, OnlineUser>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.set(presence.odId, {
              odId: presence.odId,
              username: presence.username,
              lastSeen: new Date().toISOString()
            });
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            odId: user.id,
            username: profile?.username || 'User',
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.username]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return { onlineUsers, isUserOnline };
};
