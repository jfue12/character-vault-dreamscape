import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PersonaSwitcher } from '@/components/chat/PersonaSwitcher';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { DMChatInput } from '@/components/messages/DMChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { motion } from 'framer-motion';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_character_id: string | null;
  created_at: string;
  attachment_url: string | null;
  is_read: boolean;
  character?: Character;
}

interface Friend {
  id: string;
  username: string | null;
  active_character?: Character | null;
}

interface TypingUser {
  name: string;
  avatar: string | null;
  odId: string;
}

export default function DMChat() {
  const { friendshipId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [friend, setFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const currentCharacter = characters.find(c => c.id === selectedCharacterId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && friendshipId) {
      fetchFriendship();
      fetchUserCharacters();
      fetchMessages();
      markMessagesAsRead();
      
      const cleanup = subscribeToMessages();
      return cleanup;
    }
  }, [user, friendshipId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchFriendship = async () => {
    if (!friendshipId || !user) return;

    const { data: friendship, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendshipId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (error || !friendship) {
      toast({ title: 'Conversation not found', variant: 'destructive' });
      navigate('/hub');
      return;
    }

    const friendId = friendship.requester_id === user.id 
      ? friendship.addressee_id 
      : friendship.requester_id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, active_character_id')
      .eq('id', friendId)
      .maybeSingle();

    let activeChar: Character | null = null;
    if (profile?.active_character_id) {
      const { data: charData } = await supabase
        .from('characters')
        .select('id, name, avatar_url')
        .eq('id', profile.active_character_id)
        .maybeSingle();
      if (charData) activeChar = charData;
    }

    setFriend({
      id: friendId,
      username: profile?.username || null,
      active_character: activeChar
    });

    setLoading(false);
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
      .select('id, name, avatar_url')
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

  const fetchMessages = async () => {
    if (!friendshipId) return;

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('friendship_id', friendshipId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      const characterIds = [...new Set(data.filter(m => m.sender_character_id).map(m => m.sender_character_id as string))];
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
        character: m.sender_character_id ? characterMap[m.sender_character_id] : undefined
      }));

      setMessages(messagesWithChars);
    }
  };

  const markMessagesAsRead = async () => {
    if (!friendshipId || !user) return;

    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('friendship_id', friendshipId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  };

  const subscribeToMessages = () => {
    if (!friendshipId) return () => {};

    const messagesChannel = supabase
      .channel(`dm-${friendshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `friendship_id=eq.${friendshipId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          let character: Character | undefined;
          if (newMessage.sender_character_id) {
            const { data } = await supabase
              .from('characters')
              .select('id, name, avatar_url')
              .eq('id', newMessage.sender_character_id)
              .maybeSingle();
            if (data) character = data;
          }

          setMessages(prev => [...prev, { ...newMessage, character }]);
          
          // Mark as read if not from current user
          if (newMessage.sender_id !== user?.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    // Presence for typing
    const presenceChannel = supabase.channel(`dm-presence-${friendshipId}`)
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
      supabase.removeChannel(presenceChannel);
    };
  };

  const handleTypingChange = useCallback(async (isTyping: boolean) => {
    if (!friendshipId || !currentCharacter) return;
    
    const channel = supabase.channel(`dm-presence-${friendshipId}`);
    await channel.track({
      odId: currentCharacter.id,
      characterName: currentCharacter.name,
      characterAvatar: currentCharacter.avatar_url,
      isTyping
    });
  }, [friendshipId, currentCharacter]);

  const handleSendMessage = async (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => {
    if (!user || !friendshipId || !selectedCharacterId) return;

    // Combine content based on type for DMs
    let finalContent = content;
    if (type === 'thought') {
      finalContent = `(${content})`;
    } else if (type === 'narrator') {
      finalContent = `*${content}*`;
    }

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        friendship_id: friendshipId,
        sender_id: user.id,
        sender_character_id: selectedCharacterId,
        content: finalContent,
        attachment_url: attachmentUrl || null,
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const displayName = friend?.active_character?.name || friend?.username || 'Chat';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button 
            onClick={() => navigate('/messages')} 
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
              {friend?.active_character?.avatar_url ? (
                <img 
                  src={friend.active_character.avatar_url} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">{displayName}</span>
              {friend?.username && friend.active_character && (
                <span className="text-xs text-muted-foreground">@{friend.username}</span>
              )}
            </div>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 pb-44 px-4 overflow-y-auto pt-4">
        <div className="max-w-lg mx-auto space-y-2">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-muted-foreground">Start the conversation!</p>
            </motion.div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              const charName = msg.character?.name || 'Unknown';
              const charAvatar = msg.character?.avatar_url || null;
              
              // Detect message type from content
              let type: 'dialogue' | 'thought' | 'narrator' = 'dialogue';
              let displayContent = msg.content;
              
              if (displayContent.startsWith('(') && displayContent.endsWith(')')) {
                type = 'thought';
                displayContent = displayContent.slice(1, -1);
              } else if (displayContent.startsWith('*') && displayContent.endsWith('*') && !displayContent.slice(1, -1).includes('*')) {
                type = 'narrator';
                displayContent = displayContent.slice(1, -1);
              }

              return (
                <ChatBubble
                  key={msg.id}
                  messageId={msg.id}
                  characterName={charName}
                  characterAvatar={charAvatar}
                  content={displayContent}
                  type={type}
                  isOwnMessage={isOwn}
                  timestamp={msg.created_at}
                  attachmentUrl={msg.attachment_url}
                />
              );
            })
          )}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator typingUsers={typingUsers} />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Character Switcher + Input */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto">
          {characters.length > 1 && (
            <PersonaSwitcher
              characters={characters}
              selectedId={selectedCharacterId}
              onSelect={handleCharacterSelect}
            />
          )}
          
          <DMChatInput
            onSend={handleSendMessage}
            onTypingChange={handleTypingChange}
            disabled={!selectedCharacterId}
            friendshipId={friendshipId || ''}
          />
        </div>
      </div>
    </div>
  );
}
