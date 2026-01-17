import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RoomScroller } from '@/components/chat/RoomScroller';
import { PersonaSwitcher } from '@/components/chat/PersonaSwitcher';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
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
  character?: Character;
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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoomScroller, setShowRoomScroller] = useState(true);

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
        subscribeToMessages(roomId);
      }
    }
  }, [roomId, rooms]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      .select(`
        id,
        content,
        type,
        sender_id,
        character_id,
        created_at
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      const characterIds = [...new Set(data.filter(m => m.character_id).map(m => m.character_id))];
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
        character: m.character_id ? characterMap[m.character_id] : undefined
      }));

      setMessages(messagesWithChars);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`room-${roomId}`)
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

          setMessages(prev => [...prev, { ...newMessage, character }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (content: string, type: 'dialogue' | 'thought' | 'narrator') => {
    if (!user || !currentRoom || !selectedCharacterId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        room_id: currentRoom.id,
        sender_id: user.id,
        character_id: selectedCharacterId,
        content,
        type
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleRoomChange = (roomId: string) => {
    navigate(`/worlds/${worldId}/rooms/${roomId}`);
  };

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
              onClick={() => {/* TODO: Room dropdown */}}
            >
              {currentRoom?.name}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <button 
            onClick={() => setShowRoomScroller(!showRoomScroller)}
            className="p-2 -mr-2"
          >
            {showRoomScroller ? (
              <ChevronUp className="w-6 h-6 text-foreground" />
            ) : (
              <ChevronDown className="w-6 h-6 text-foreground" />
            )}
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
      <main className="flex-1 pb-40 px-4 overflow-y-auto relative z-10 pt-4">
        <div className="max-w-lg mx-auto space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-muted-foreground">No messages yet. Start the roleplay!</p>
            </motion.div>
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                characterName={message.character?.name || 'Unknown'}
                characterAvatar={message.character?.avatar_url || null}
                content={message.content}
                type={message.type}
                isOwnMessage={message.sender_id === user?.id}
                timestamp={message.created_at}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

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
          disabled={!selectedCharacterId}
        />
      </div>
    </div>
  );
}
