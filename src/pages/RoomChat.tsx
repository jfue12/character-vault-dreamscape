import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RoomScroller } from '@/components/chat/RoomScroller';
import { PersonaSwitcher } from '@/components/chat/PersonaSwitcher';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { SystemMessage } from '@/components/chat/SystemMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { motion, AnimatePresence } from 'framer-motion';

interface Room {
  id: string;
  name: string;
  background_url: string | null;
  is_staff_only: boolean;
  world_id: string;
}

interface World {
  id: string;
  name: string;
}

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  sender_id: string;
  character_id: string | null;
  created_at: string;
  attachment_url: string | null;
  emoji_reactions: Record<string, string[]> | null;
  character?: Character;
}

interface SystemMsg {
  id: string;
  message_type: string;
  username: string | null;
  duration: string | null;
  created_at: string;
}

interface TypingUser {
  name: string;
  avatar: string | null;
  odId: string;
}

export default function RoomChat() {
  const { worldId, roomId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [world, setWorld] = useState<World | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMsg[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoomScroller, setShowRoomScroller] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);

  // Get current character
  const currentCharacter = characters.find(c => c.id === selectedCharacterId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && worldId) {
      fetchWorldData();
      fetchUserCharacters();
    }
  }, [user, worldId]);

  useEffect(() => {
    if (roomId && rooms.length > 0) {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        setCurrentRoom(room);
        fetchMessages(roomId);
        fetchSystemMessages(roomId);
        
        const cleanup = subscribeToRoom(roomId);
        return cleanup;
      }
    }
  }, [roomId, rooms]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, systemMessages]);

  // Send join system message when entering
  useEffect(() => {
    if (currentRoom && user && currentCharacter) {
      sendSystemMessage('join');
    }
    
    return () => {
      if (currentRoom && user && currentCharacter) {
        sendSystemMessage('leave');
      }
    };
  }, [currentRoom?.id, currentCharacter?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchWorldData = async () => {
    if (!worldId) return;

    const { data: worldData, error: worldError } = await supabase
      .from('worlds')
      .select('id, name')
      .eq('id', worldId)
      .single();

    if (worldError) {
      toast({ title: 'Error', description: 'World not found', variant: 'destructive' });
      navigate('/worlds');
      return;
    }

    setWorld(worldData);

    const { data: roomsData, error: roomsError } = await supabase
      .from('world_rooms')
      .select('*')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true });

    if (!roomsError && roomsData) {
      setRooms(roomsData);
      if (!roomId && roomsData.length > 0) {
        navigate(`/worlds/${worldId}/rooms/${roomsData[0].id}`, { replace: true });
      }
    }

    setLoading(false);
  };

  const fetchUserCharacters = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('characters')
      .select('id, name, avatar_url')
      .eq('owner_id', user.id)
      .eq('is_hidden', false);

    if (!error && data) {
      setCharacters(data);
      if (data.length > 0) {
        setSelectedCharacterId(data[0].id);
      }
    }
  };

  const fetchMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      const characterIds = [...new Set(data.filter(m => m.character_id).map(m => m.character_id as string))];
      let characterMap: Record<string, Character> = {};
      
      if (characterIds.length > 0) {
        const { data: charData } = await supabase
          .from('characters')
          .select('id, name, avatar_url')
          .in('id', characterIds);
        
        if (charData) {
          characterMap = Object.fromEntries(charData.map(c => [c.id, c]));
        }
      }

      const messagesWithChars = data.map(m => ({
        ...m,
        type: m.type as 'dialogue' | 'thought' | 'narrator',
        emoji_reactions: m.emoji_reactions as Record<string, string[]> | null,
        character: m.character_id ? characterMap[m.character_id] : undefined
      }));

      setMessages(messagesWithChars);
    }
  };

  const fetchSystemMessages = async (roomId: string) => {
    const { data } = await supabase
      .from('system_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setSystemMessages(data);
    }
  };

  const subscribeToRoom = (roomId: string) => {
    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          let character: Character | undefined;
          if (newMessage.character_id) {
            const { data } = await supabase
              .from('characters')
              .select('id, name, avatar_url')
              .eq('id', newMessage.character_id)
              .single();
            if (data) character = data;
          }

          setMessages(prev => [...prev, { 
            ...newMessage, 
            character,
            emoji_reactions: newMessage.emoji_reactions || {}
          }]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages(prev => prev.map(m => 
            m.id === updated.id 
              ? { ...m, emoji_reactions: updated.emoji_reactions || {} }
              : m
          ));
        }
      )
      .subscribe();

    // Subscribe to system messages
    const systemChannel = supabase
      .channel(`room-system-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setSystemMessages(prev => [...prev, payload.new as SystemMsg]);
        }
      )
      .subscribe();

    // Subscribe to presence for typing indicators
    const presenceChannel = supabase.channel(`room-presence-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.isTyping && presence.odId !== selectedCharacterId) {
              typing.push({
                name: presence.characterName,
                avatar: presence.characterAvatar,
                odId: presence.odId
              });
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentCharacter) {
          await presenceChannel.track({
            odId: currentCharacter.id,
            characterName: currentCharacter.name,
            characterAvatar: currentCharacter.avatar_url,
            isTyping: false
          });
        }
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(systemChannel);
      supabase.removeChannel(presenceChannel);
    };
  };

  const handleTypingChange = useCallback(async (isTyping: boolean) => {
    if (!roomId || !currentCharacter) return;
    
    const channel = supabase.channel(`room-presence-${roomId}`);
    await channel.track({
      odId: currentCharacter.id,
      characterName: currentCharacter.name,
      characterAvatar: currentCharacter.avatar_url,
      isTyping
    });
  }, [roomId, currentCharacter]);

  const sendSystemMessage = async (type: string) => {
    if (!currentRoom || !user || !currentCharacter) return;

    await supabase.from('system_messages').insert({
      room_id: currentRoom.id,
      message_type: type,
      user_id: user.id,
      username: currentCharacter.name
    });
  };

  const handleSendMessage = async (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => {
    if (!user || !currentRoom || !selectedCharacterId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        room_id: currentRoom.id,
        sender_id: user.id,
        character_id: selectedCharacterId,
        content,
        type,
        attachment_url: attachmentUrl || null,
        emoji_reactions: {}
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = { ...(message.emoji_reactions || {}) };
    const users = reactions[emoji] || [];
    
    if (users.includes(user.id)) {
      reactions[emoji] = users.filter(id => id !== user.id);
    } else {
      reactions[emoji] = [...users, user.id];
    }

    await supabase
      .from('messages')
      .update({ emoji_reactions: reactions })
      .eq('id', messageId);
  };

  const handleRoomChange = (roomId: string) => {
    navigate(`/worlds/${worldId}/rooms/${roomId}`);
  };

  // Merge and sort messages with system messages
  const allMessages = [
    ...messages.map(m => ({ ...m, isSystem: false })),
    ...systemMessages.map(s => ({ 
      ...s, 
      isSystem: true,
      created_at: s.created_at 
    }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background */}
      {currentRoom?.background_url && (
        <div 
          className="fixed inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: `url(${currentRoom.background_url})` }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button 
            onClick={() => navigate(`/worlds/${worldId}`)} 
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="font-semibold text-foreground">{world?.name}</h1>
            <button 
              className="flex items-center gap-1 text-xs text-muted-foreground"
              onClick={() => setShowRoomScroller(!showRoomScroller)}
            >
              {currentRoom?.name}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <button 
            onClick={() => setShowMemberList(!showMemberList)}
            className="p-2 -mr-2"
          >
            <Users className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* Collapsible Room Scroller */}
      <AnimatePresence>
        {showRoomScroller && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-40 bg-background/80 backdrop-blur-sm border-b border-border overflow-hidden"
          >
            <div className="py-2">
              <RoomScroller
                rooms={rooms}
                selectedId={currentRoom?.id || null}
                onSelect={handleRoomChange}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <main className="flex-1 pb-44 px-4 overflow-y-auto relative z-10 pt-4">
        <div className="max-w-lg mx-auto space-y-2">
          {allMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-muted-foreground">No messages yet. Start the roleplay!</p>
            </motion.div>
          ) : (
            allMessages.map((item) => {
              if ('isSystem' in item && item.isSystem) {
                const sysMsg = item as SystemMsg & { isSystem: boolean };
                return (
                  <SystemMessage
                    key={`sys-${sysMsg.id}`}
                    type={sysMsg.message_type as any}
                    username={sysMsg.username || 'Unknown'}
                    timestamp={sysMsg.created_at}
                    duration={sysMsg.duration || undefined}
                  />
                );
              }
              
              const msg = item as Message & { isSystem: boolean };
              return (
                <ChatBubble
                  key={msg.id}
                  messageId={msg.id}
                  characterName={msg.character?.name || 'Unknown'}
                  characterAvatar={msg.character?.avatar_url || null}
                  content={msg.content}
                  type={msg.type}
                  isOwnMessage={msg.sender_id === user?.id}
                  timestamp={msg.created_at}
                  attachmentUrl={msg.attachment_url}
                  emojiReactions={msg.emoji_reactions || {}}
                  onReact={handleReaction}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Typing Indicator */}
      <div className="fixed bottom-36 left-0 right-0 z-40">
        <div className="max-w-lg mx-auto">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        {/* Persona Switcher */}
        <div className="border-b border-border">
          <PersonaSwitcher
            characters={characters}
            selectedId={selectedCharacterId}
            onSelect={setSelectedCharacterId}
          />
        </div>
        
        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          onTypingChange={handleTypingChange}
          disabled={!selectedCharacterId}
          roomId={currentRoom?.id || ''}
        />
      </div>
    </div>
  );
}