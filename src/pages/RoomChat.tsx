import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Settings, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RoomScroller } from '@/components/chat/RoomScroller';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { MascotChatInput } from '@/components/chat/MascotChatInput';
import { SystemMessage } from '@/components/chat/SystemMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatMemberList } from '@/components/chat/ChatMemberList';
import { InviteFriendsModal } from '@/components/chat/InviteFriendsModal';
import { ChatSettingsPanel } from '@/components/chat/ChatSettingsPanel';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';
import { AICharacterDetailModal } from '@/components/chat/AICharacterDetailModal';
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
  sort_order: number;
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
  ai_character_name?: string; // For temp AI characters
  sender_username?: string;
  sender_role?: 'owner' | 'admin' | 'member';
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
  // Room scroller is now always visible in Mascot style
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [hasAI, setHasAI] = useState(false);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const [showAICharacterDetail, setShowAICharacterDetail] = useState(false);
  const [selectedAICharacter, setSelectedAICharacter] = useState<{
    name: string;
    bio?: string | null;
    personality_traits?: string[] | null;
    social_rank?: string | null;
    avatar_url?: string | null;
    avatar_description?: string | null;
  } | null>(null);

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
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const aiMessageCharIds = [...new Set(data.filter(m => m.is_ai && m.character_id).map(m => m.character_id as string))];
      
      let characterMap: Record<string, Character> = {};
      let tempAICharacterMap: Record<string, { name: string; bio?: string | null }> = {};
      let usernameMap: Record<string, string> = {};
      let roleMap: Record<string, 'owner' | 'admin' | 'member'> = {};
      
      if (characterIds.length > 0) {
        const { data: charData } = await supabase
          .from('characters')
          .select('id, name, avatar_url, bubble_color, text_color, bubble_alignment')
          .in('id', characterIds);
        
        if (charData) {
          characterMap = Object.fromEntries(charData.map(c => [c.id, c]));
        }
      }

      // Fetch temp AI characters for AI messages that don't have character data
      if (aiMessageCharIds.length > 0) {
        const { data: tempCharData } = await supabase
          .from('temp_ai_characters')
          .select('id, name, bio')
          .in('id', aiMessageCharIds);
        
        if (tempCharData) {
          tempAICharacterMap = Object.fromEntries(tempCharData.map(c => [c.id, { name: c.name, bio: c.bio }]));
        }
      }

      // Fetch usernames and roles for all senders
      if (senderIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', senderIds);
        
        if (profileData) {
          usernameMap = Object.fromEntries(profileData.map(p => [p.id, p.username || 'anonymous']));
        }

        // Fetch roles from world_members
        const { data: memberData } = await supabase
          .from('world_members')
          .select('user_id, role')
          .eq('world_id', worldId)
          .in('user_id', senderIds);
        
        if (memberData) {
          roleMap = Object.fromEntries(memberData.map(m => [m.user_id, m.role as 'owner' | 'admin' | 'member']));
        }
      }

      const messagesWithChars = data.map(m => {
        // For AI messages, try to get character from temp_ai_characters if not in characters table
        let character = m.character_id ? characterMap[m.character_id] : undefined;
        let aiCharName: string | undefined;
        
        if (m.is_ai && m.character_id && !character) {
          const tempChar = tempAICharacterMap[m.character_id];
          if (tempChar) {
            aiCharName = tempChar.name;
          }
        }

        return {
          ...m,
          type: m.type as 'dialogue' | 'thought' | 'narrator',
          emoji_reactions: m.emoji_reactions as Record<string, string[]> | null,
          character: character,
          ai_character_name: aiCharName,
          sender_username: m.is_ai ? undefined : (usernameMap[m.sender_id] || 'anonymous'),
          sender_role: roleMap[m.sender_id] || 'member'
        };
      });

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
          let ai_character_name: string | undefined;
          let sender_username: string | undefined = undefined;
          
          if (newMessage.character_id) {
            // Try regular characters first
            const { data } = await supabase
              .from('characters')
              .select('id, name, avatar_url, bubble_color, text_color, bubble_alignment')
              .eq('id', newMessage.character_id)
              .single();
            if (data) {
              character = data;
            } else if (newMessage.is_ai) {
              // Try temp_ai_characters for AI messages
              const { data: tempChar } = await supabase
                .from('temp_ai_characters')
                .select('name')
                .eq('id', newMessage.character_id)
                .maybeSingle();
              if (tempChar) {
                ai_character_name = tempChar.name;
              }
            }
          }

          // Only fetch sender username for non-AI messages
          if (!newMessage.is_ai) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', newMessage.sender_id)
              .maybeSingle();
            
            if (profileData?.username) {
              sender_username = profileData.username;
            }
          }

          setMessages(prev => [...prev, { 
            ...newMessage, 
            character,
            ai_character_name,
            sender_username,
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

  const handleAICharacterClick = async (characterId: string | null, characterName: string) => {
    if (!characterId || !worldId) {
      // Show basic info for characters without ID
      setSelectedAICharacter({
        name: characterName,
        bio: null,
        personality_traits: null,
        social_rank: null,
        avatar_url: null,
        avatar_description: null
      });
      setShowAICharacterDetail(true);
      return;
    }

    // Try to fetch from temp_ai_characters first
    const { data: tempChar } = await supabase
      .from('temp_ai_characters')
      .select('name, bio, personality_traits, social_rank, avatar_description')
      .eq('id', characterId)
      .maybeSingle();

    if (tempChar) {
      setSelectedAICharacter({
        name: tempChar.name,
        bio: tempChar.bio,
        personality_traits: tempChar.personality_traits as string[] | null,
        social_rank: tempChar.social_rank,
        avatar_url: null,
        avatar_description: tempChar.avatar_description
      });
      setShowAICharacterDetail(true);
      return;
    }

    // Try regular characters table
    const { data: char } = await supabase
      .from('characters')
      .select('name, bio, avatar_url')
      .eq('id', characterId)
      .maybeSingle();

    if (char) {
      setSelectedAICharacter({
        name: char.name,
        bio: char.bio,
        personality_traits: null,
        social_rank: null,
        avatar_url: char.avatar_url,
        avatar_description: null
      });
      setShowAICharacterDetail(true);
      return;
    }

    // Fallback
    setSelectedAICharacter({
      name: characterName,
      bio: null,
      personality_traits: null,
      social_rank: null,
      avatar_url: null,
      avatar_description: null
    });
    setShowAICharacterDetail(true);
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
    <div className="min-h-screen min-h-[100dvh] bg-[#000] flex flex-col">
      {/* Background */}
      {currentRoom?.background_url && (
        <div 
          className="fixed inset-0 bg-cover bg-center opacity-30 z-0"
          style={{ backgroundImage: `url(${currentRoom.background_url})` }}
        />
      )}

      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-50 bg-[#000]/95 backdrop-blur-xl border-b border-[#1a1a1a] pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-3 h-14">
          <button 
            onClick={() => navigate('/')} 
            className="p-2.5 -ml-1 text-white active:text-[#7C3AED] transition-colors touch-feedback rounded-xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <h1 className="font-semibold text-white truncate max-w-[180px] sm:max-w-[240px] text-sm sm:text-base">{world?.name}</h1>
            {/* Typing Indicator in Header */}
            {typingUsers.length > 0 ? (
              <span className="text-[11px] text-[#7C3AED] animate-pulse truncate max-w-[160px]">
                {typingUsers.length === 1 
                  ? `${typingUsers[0].name} is typing...`
                  : `${typingUsers.length} people typing...`
                }
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 truncate max-w-[160px]">{currentRoom?.name}</span>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => setShowMemberList(true)}
              className="p-2.5 relative text-white active:text-[#7C3AED] transition-colors touch-feedback rounded-xl"
            >
              <Users className="w-5 h-5" />
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#7C3AED] text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                {members.length}
              </span>
            </button>
            {(isOwner || isAdmin) && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2.5 text-white active:text-[#7C3AED] transition-colors touch-feedback rounded-xl"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Room Scroller - Mobile Optimized */}
      <div className="z-40 bg-[#000]/90 backdrop-blur-sm border-b border-[#1a1a1a] py-2 touch-action-pan-y">
        <RoomScroller
          rooms={rooms}
          selectedId={currentRoom?.id || null}
          onSelect={handleRoomChange}
          onCreateRoom={isOwner ? handleCreateRoom : undefined}
        />
      </div>

      {/* Messages Area - Mobile Optimized */}
      <main className="flex-1 pb-[calc(180px+env(safe-area-inset-bottom,0px))] px-3 sm:px-4 overflow-y-auto relative z-10 pt-3 momentum-scroll touch-action-pan-y">
        <div className="max-w-lg mx-auto space-y-2.5">
          {allMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-gray-500">No messages yet. Start the roleplay!</p>
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
              const isOwnMessage = msg.sender_id === user?.id && !msg.is_ai;
              // AI messages: use ai_character_name or character name, never show "AI Character" if we have a name
              const displayName = msg.is_ai 
                ? (msg.ai_character_name || msg.character?.name || 'AI Character')
                : (msg.character?.name || (isOwnMessage ? (profile?.username || 'You') : 'Someone'));
              // Don't show username for AI messages
              const senderUsername = msg.is_ai ? undefined : (msg.sender_username || (isOwnMessage ? profile?.username : undefined));
              // AI messages should always be on the left (not owner/admin)
              const bubbleAlign = msg.is_ai ? 'left' : 'auto';
              return (
                <ChatBubble
                  key={msg.id}
                  messageId={msg.id}
                  characterName={displayName}
                  characterAvatar={msg.character?.avatar_url || null}
                  username={senderUsername}
                  content={msg.content}
                  type={msg.type}
                  isOwnMessage={isOwnMessage}
                  timestamp={msg.created_at}
                  attachmentUrl={msg.attachment_url}
                  emojiReactions={msg.emoji_reactions || {}}
                  onReact={handleReaction}
                  bubbleColor={msg.character?.bubble_color || undefined}
                  textColor={msg.character?.text_color || undefined}
                  bubbleAlignment={bubbleAlign}
                  role={msg.is_ai ? undefined : msg.sender_role}
                  isAI={msg.is_ai}
                  onAICharacterClick={msg.is_ai ? () => handleAICharacterClick(msg.character_id, displayName) : undefined}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input Area - Mobile Optimized with Safe Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom,0px)]">
        <MascotChatInput
          onSend={handleSendMessage}
          onTypingChange={handleTypingChange}
          disabled={false}
          roomId={currentRoom?.id || ''}
          worldId={worldId}
          characters={characters}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={handleCharacterSelect}
          onCreateCharacter={() => setShowCreateCharacter(true)}
          baseProfileName={profile?.username || 'You'}
          isStaff={isOwner || isAdmin}
          onStyleUpdated={async () => {
            await fetchUserCharacters();
            if (roomId) {
              // Small delay to ensure DB update is committed before refetch
              await new Promise(resolve => setTimeout(resolve, 100));
              await fetchMessages(roomId);
            }
          }}
        />
      </div>

      {/* Create Character Modal */}
      <CreateCharacterModal
        open={showCreateCharacter}
        onOpenChange={setShowCreateCharacter}
        onSuccess={() => {
          fetchUserCharacters();
          setShowCreateCharacter(false);
        }}
      />

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

      {/* AI Character Detail Modal */}
      <AICharacterDetailModal
        isOpen={showAICharacterDetail}
        onClose={() => setShowAICharacterDetail(false)}
        character={selectedAICharacter}
      />
    </div>
  );
}