import { useState, useRef, useEffect } from 'react';
import { Send, Image, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterStylePanel } from '@/components/chat/CharacterStylePanel';

interface ChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  roomId: string;
  worldId?: string;
  selectedCharacterId?: string | null;
  isStaff?: boolean;
  onStyleUpdated?: () => void;
}

const EMOJI_SHORTCUTS = ['😊', '😂', '❤️', '🔥', '✨', '👀', '💀', '🥺'];

export const ChatInput = ({ onSend, onTypingChange, disabled, roomId, worldId, selectedCharacterId, isStaff, onStyleUpdated }: ChatInputProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'dialogue' | 'thought' | 'narrator'>('dialogue');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [characterStyle, setCharacterStyle] = useState<{ bubble_color?: string | null; text_color?: string | null }>({});
  const [bubbleSide, setBubbleSide] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch character style when character changes
  useEffect(() => {
    const fetchStyles = async () => {
      if (selectedCharacterId) {
        const { data } = await supabase
          .from('characters')
          .select('bubble_color, text_color')
          .eq('id', selectedCharacterId)
          .single();
        if (data) {
          setCharacterStyle({ bubble_color: data.bubble_color, text_color: data.text_color });
        }
      } else {
        setCharacterStyle({});
      }

      // Fetch bubble_side if staff and worldId
      if (isStaff && worldId && user) {
        const { data: memberData } = await supabase
          .from('world_members')
          .select('bubble_side')
          .eq('world_id', worldId)
          .eq('user_id', user.id)
          .single();
        if (memberData) {
          setBubbleSide(memberData.bubble_side);
        }
      }
    };
    fetchStyles();
  }, [selectedCharacterId, isStaff, worldId, user]);

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
    // Handle typing indicator
    onTypingChange(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;
    
    // Auto-detect thought bubbles from parentheses
    let finalType = messageType;
    let finalContent = content.trim();
    
    if (finalContent.startsWith('(') && finalContent.endsWith(')')) {
      finalType = 'thought';
      finalContent = finalContent.slice(1, -1);
    }
    
    onSend(finalContent, finalType);
    setContent('');
    onTypingChange(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${roomId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('world-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('world-images')
        .getPublicUrl(fileName);

      // Send as attachment message
      onSend(`[Image]`, 'dialogue', publicUrl);
    } catch (error) {
      console.error('Upload failed:', error);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojis(false);
  };

  const typeOptions = [
    { type: 'dialogue' as const, label: 'Talk', icon: '💬' },
    { type: 'thought' as const, label: 'Think', icon: '💭' },
    { type: 'narrator' as const, label: 'Narrate', icon: '📖' },
  ];

  return (
    <div className="p-3 pb-6 bg-[#000] border-t border-[#1a1a1a]">
      {/* Message Type Selector - Mascot Style: Talk, Think, Narrate */}
      <div className="flex gap-2 mb-3 justify-center">
        {typeOptions.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => setMessageType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              messageType === type
                ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/30'
                : 'bg-[#0a0a0a] text-gray-400 border border-[#1a1a1a] hover:text-white hover:border-[#7C3AED]/50'
            }`}
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Emoji Quick Select */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-1 mb-3 p-3 bg-[#0a0a0a] rounded-xl border border-[#1a1a1a]"
          >
            {EMOJI_SHORTCUTS.map(emoji => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form - Mascot Style */}
      <form onSubmit={handleSubmit} className="flex gap-3 items-center">
        {/* Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="p-2.5 text-gray-500 hover:text-[#7C3AED] transition-colors disabled:opacity-50 rounded-xl hover:bg-[#7C3AED]/10"
        >
          <Image className="w-5 h-5" />
        </button>

        {/* Emoji Toggle */}
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2.5 text-gray-500 hover:text-[#7C3AED] transition-colors rounded-xl hover:bg-[#7C3AED]/10"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Style Panel */}
        <CharacterStylePanel
          characterId={selectedCharacterId || null}
          currentBubbleColor={characterStyle.bubble_color}
          currentTextColor={characterStyle.text_color}
          currentBubbleSide={bubbleSide}
          isStaff={isStaff}
          worldId={worldId}
          onStyleUpdated={() => {
            onStyleUpdated?.();
            // Refetch styles
            if (selectedCharacterId) {
              supabase
                .from('characters')
                .select('bubble_color, text_color')
                .eq('id', selectedCharacterId)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setCharacterStyle({ bubble_color: data.bubble_color, text_color: data.text_color });
                  }
                });
            }
            if (isStaff && worldId && user) {
              supabase
                .from('world_members')
                .select('bubble_side')
                .eq('world_id', worldId)
                .eq('user_id', user.id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setBubbleSide(data.bubble_side);
                  }
                });
            }
          }}
        />

        <input
          type="text"
          value={content}
          onChange={handleContentChange}
          placeholder={
            messageType === 'narrator' 
              ? 'Describe the scene...' 
              : messageType === 'thought'
                ? 'What are they thinking...'
                : 'Say something...'
          }
          disabled={disabled || isUploading}
          className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7C3AED] placeholder:text-gray-600"
        />
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!content.trim() || disabled || isUploading}
          className="w-11 h-11 rounded-xl bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 shadow-lg shadow-[#7C3AED]/30"
        >
          <Send className="w-4 h-4 text-white" />
        </motion.button>
      </form>
    </div>
  );
};