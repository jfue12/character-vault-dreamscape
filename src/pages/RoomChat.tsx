import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Users, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RoomScroller } from '@/components/chat/RoomScroller';
import { PersonaSwitcher } from '@/components/chat/PersonaSwitcher';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { SystemMessage } from '@/components/chat/SystemMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
// AI typing indicator disabled
import { ChatMemberList } from '@/components/chat/ChatMemberList';
import { InviteFriendsModal } from '@/components/chat/InviteFriendsModal';
import { ChatSettingsPanel } from '@/components/chat/ChatSettingsPanel';
import { usePhantomAI } from '@/hooks/usePhantomAI';
import { useSpamDetection } from '@/hooks/useSpamDetection';
import { motion, AnimatePresence } from 'framer-motion';

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
  world_id: string;
}

interface World {
  id: string;
  name: string;
  owner_id: string;
}

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  bubble_color: string | null;
  text_color: string | null;
  bubble_alignment: string | null;
}

interface Message {
  id: string;
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  sender_id: string;
  character_id: string | null;
  created_at: string;
  is_ai?: boolean;
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

interface ChatMember {
  userId: string;
  username: string;
  characterName: string;
  characterAvatar: string | null;
  role: 'owner' | 'admin' | 'member';
  isOnline?: boolean;
}

interface WorldMember {
  user_id: string;
  role: string;
  profiles: { username: string | null } | null;
  active_character: { name: string; avatar_url: string | null } | null;
}

export default function RoomChat() {
  const { worldId, roomId } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
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
  const [showSettings, setShowSettings] = useState(false);
  const [hasAI, setHasAI] = useState(false);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  // Get current character
  const currentCharacter = characters.find(c => c.id === selectedCharacterId);

  // Phantom AI hook
  const { triggerPhantomAI } = usePhantomAI(worldId || '', roomId || '');
  
  // Spam detection hook
  const { validateMessage } = useSpamDetection(worldId || '', user?.id || '');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && worldId) {
      fetchWorldData();
      fetchUserCharacters();
      checkAICharacters();
    }
  }, [user, worldId]);

  // Phantom AI is always enabled - it can dynamically spawn NPCs
  const checkAICharacters = async () => {
    // Always enable AI - it can spawn dynamic NPCs even without pre-configured characters
    setHasAI(true);
  };

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

  // NO JOIN/LEAVE MESSAGES ON ROOM ENTRY - Only on world join/leave
  // Presence is tracked silently for typing indicators only

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchWorldData = async () => {
    if (!worldId) return;

    const { data: worldData, error: worldError } = await supabase
      .from('worlds')
      .select('id, name, owner_id')
      .eq('id', worldId)
      .single();

    if (worldError) {
      toast({ title: 'Error', description: 'World not found', variant: 'destructive' });
      navigate('/worlds');
      return;
    }

    setWorld(worldData);

    // Check user's role in this world
    if (user) {
      const { data: memberData } = await supabase
        .from('world_members')
        .select('role')
        .eq('world_id', worldId)
        .eq('user_id', user.id)
        .single();
      
      if (memberData) {
        setUserRole(memberData.role as 'owner' | 'admin' | 'member');
      }
    }

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

    // Fetch world members
    fetchWorldMembers();

    setLoading(false);
  };

  const fetchWorldMembers = async () => {
    if (!worldId) return;

    const { data } = await supabase
      .from('world_members')
      .select(`
        user_id,
        role,
        profiles(username),
        active_character:characters!world_members_active_character_id_fkey(name, avatar_url)
      `)
      .eq('world_id', worldId)
      .eq('is_banned', false);

    if (data) {
      const processedMembers: ChatMember[] = data.map((m: any) => ({
        userId: m.user_id,
        username: m.profiles?.username || 'Unknown',
        characterName: m.active_character?.name || m.profiles?.username || 'Unknown',
        characterAvatar: m.active_character?.avatar_url || null,
        role: m.role as 'owner' | 'admin' | 'member',
        isOnline: onlineUsers.has(m.user_id)
      }));
      setMembers(processedMembers);
    }
  };

  const fetchUserCharacters = async () => {
    if (!user) return;

    // First get user's saved active character
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_character_id')
      .eq('id', user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('characters')
      .select('id, name, avatar_url, bubble_color, text_color, bubble_alignment')
      .eq('owner_id', user.id)
      .eq('is_hidden', false);

    if (!error && data) {
      setCharacters(data);
      // Use saved active character if it exists and is in the list, otherwise default to first
      const savedCharId = profile?.active_character_id;
      if (savedCharId && data.some(c => c.id === savedCharId)) {
        setSelectedCharacterId(savedCharId);
      } else if (data.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(data[0].id);
      }
    }
  };

  // Save character selection to profile
  const handleCharacterSelect = async (characterId: string | null) => {
    setSelectedCharacterId(characterId);
    if (user && characterId) {
      await supabase
        .from('profiles')
        .update({ active_character_id: characterId })
        .eq('id', user.id);
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
          .select('id, name, avatar_url, bubble_color, text_color, bubble_alignment')
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
              .select('id, name, avatar_url, bubble_color, text_color, bubble_alignment')
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
            // Only show others who are typing, not ourselves
            if (presence.isTyping && presence.odId !== (currentCharacter?.id || user?.id)) {
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
        if (status === 'SUBSCRIBED') {
          const charOrProfile = currentCharacter || { id: user?.id, name: profile?.username || 'User', avatar_url: null };
          await presenceChannel.track({
            odId: charOrProfile.id,
            characterName: charOrProfile.name || 'User',
            characterAvatar: charOrProfile.avatar_url || null,
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
    if (!roomId || !user) return;
    
    const charOrProfile = currentCharacter || { id: user.id, name: profile?.username || 'User', avatar_url: null };
    const channel = supabase.channel(`room-presence-${roomId}`);
    await channel.track({
      odId: charOrProfile.id,
      characterName: charOrProfile.name || 'User',
      characterAvatar: charOrProfile.avatar_url || null,
      isTyping
    });
  }, [roomId, currentCharacter, user, profile]);

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
    if (!user || !currentRoom) return;

    // Validate against spam
    const isValid = await validateMessage(content);
    if (!isValid) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        room_id: currentRoom.id,
        sender_id: user.id,
        character_id: selectedCharacterId || null, // Allow null for base profile
        content,
        type,
        attachment_url: attachmentUrl || null,
        emoji_reactions: {}
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
      return;
    }

    // Trigger Phantom AI if world has AI characters
    if (hasAI && type === 'dialogue') {
      const messageHistory = messages.slice(-10).map(m => ({
        content: m.content,
        characterName: m.character?.name || 'Unknown',
        characterId: m.character_id || '',
        type: m.type,
      }));

      const result = await triggerPhantomAI(content, selectedCharacterId, messageHistory);
      if (result?.ok === false) {
        toast({ title: 'AI', description: result.error, variant: 'destructive' });
      }
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

  const handleLeaveWorld = async () => {
    if (!worldId || !user || userRole === 'owner') return;

    // Fetch username for system message before leaving
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Get first room for system message
    const { data: worldRooms } = await supabase
      .from('world_rooms')
      .select('id')
      .eq('world_id', worldId);

    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('world_id', worldId)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Failed to leave', variant: 'destructive' });
    } else {
      // Send "left" system message
      if (worldRooms && worldRooms.length > 0) {
        await supabase.from('system_messages').insert({
          room_id: worldRooms[0].id,
          message_type: 'leave',
          user_id: user.id,
          username: profile?.username || 'Someone'
        });
      }

      toast({ title: 'Left world' });
      navigate('/hub');
    }
  };

  const handleCreateRoom = () => {
    setShowSettings(true);
  };

  const handleRoomCreated = () => {
    fetchWorldData();
  };

  const handleRoomDeleted = (roomId: string) => {
    // If current room was deleted, navigate to first room
    if (currentRoom?.id === roomId && rooms.length > 1) {
      const nextRoom = rooms.find(r => r.id !== roomId);
      if (nextRoom) {
        navigate(`/worlds/${worldId}/rooms/${nextRoom.id}`);
      }
    }
    fetchWorldData();
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

  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const onlineMemberCount = members.filter(m => m.isOnline).length || members.length;

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
            onClick={() => navigate('/hub')} 
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

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowMemberList(true)}
              className="p-2 relative"
            >
              <Users className="w-5 h-5 text-foreground" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                {members.length}
              </span>
            </button>
            {(isOwner || isAdmin) && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2"
              >
                <Settings className="w-5 h-5 text-foreground" />
              </button>
            )}
          </div>
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
                onCreateRoom={isOwner ? handleCreateRoom : undefined}
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
              const isOwnMessage = msg.sender_id === user?.id;
              const displayName = msg.character?.name || (isOwnMessage ? (profile?.username || 'You') : 'Someone');
              return (
                <ChatBubble
                  key={msg.id}
                  messageId={msg.id}
                  characterName={displayName}
                  characterAvatar={msg.character?.avatar_url || null}
                  content={msg.content}
                  type={msg.type}
                  isOwnMessage={isOwnMessage}
                  timestamp={msg.created_at}
                  attachmentUrl={msg.attachment_url}
                  emojiReactions={msg.emoji_reactions || {}}
                  onReact={handleReaction}
                  bubbleColor={msg.character?.bubble_color || undefined}
                  textColor={msg.character?.text_color || undefined}
                  bubbleAlignment="auto"
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* AI Typing Indicator - disabled */}

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
            onSelect={handleCharacterSelect}
            baseProfileName={profile?.username || 'You'}
          />
        </div>
        
        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          onTypingChange={handleTypingChange}
          disabled={false}
          roomId={currentRoom?.id || ''}
        />
      </div>

      {/* Member List Panel */}
      <ChatMemberList
        isOpen={showMemberList}
        onClose={() => setShowMemberList(false)}
        members={members}
        memberCount={members.length}
        currentUserRole={userRole}
        currentUserId={user?.id}
        onLeaveWorld={handleLeaveWorld}
        onInviteFriends={() => setShowInviteFriends(true)}
      />

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteFriends}
        onClose={() => setShowInviteFriends(false)}
        worldId={worldId || ''}
        worldName={world?.name || ''}
      />

      {/* Settings Panel */}
      <ChatSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        worldId={worldId || ''}
        worldName={world?.name || ''}
        rooms={rooms}
        isOwner={isOwner}
        isAdmin={isAdmin}
        members={members.map(m => ({ userId: m.userId, username: m.username, role: m.role }))}
        onLeaveWorld={handleLeaveWorld}
        onRoomCreated={handleRoomCreated}
        onRoomDeleted={handleRoomDeleted}
      />
    </div>
  );
}