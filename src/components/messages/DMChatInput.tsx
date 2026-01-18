import { useState, useRef, useEffect } from 'react';
import { Send, Image, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterStylePanel } from '@/components/chat/CharacterStylePanel';

interface DMChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  friendshipId: string;
  selectedCharacterId?: string | null;
  onStyleUpdated?: () => void;
}

const EMOJI_SHORTCUTS = ['😊', '😂', '❤️', '🔥', '✨', '👀', '💀', '🥺'];

export const DMChatInput = ({ onSend, onTypingChange, disabled, friendshipId, selectedCharacterId, onStyleUpdated }: DMChatInputProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'dialogue' | 'thought' | 'narrator'>('dialogue');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [characterStyle, setCharacterStyle] = useState<{ bubble_color?: string | null; text_color?: string | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch character style when character changes
  useEffect(() => {
    const fetchCharacterStyle = async () => {
      if (!selectedCharacterId) {
        setCharacterStyle({});
        return;
      }
      const { data } = await supabase
        .from('characters')
        .select('bubble_color, text_color')
        .eq('id', selectedCharacterId)
        .single();
      if (data) {
        setCharacterStyle({ bubble_color: data.bubble_color, text_color: data.text_color });
      }
    };
    fetchCharacterStyle();
  }, [selectedCharacterId]);

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
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
      const fileName = `dm/${user.id}/${friendshipId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('world-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('world-images')
        .getPublicUrl(fileName);

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
    <div className="p-3 pb-6">
      {/* Message Type Selector */}
      <div className="flex gap-1.5 mb-2">
        {typeOptions.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => setMessageType(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              messageType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <span>{icon}</span>
            {label}
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
            className="flex gap-1 mb-2 p-2 bg-secondary rounded-lg"
          >
            {EMOJI_SHORTCUTS.map(emoji => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
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
          className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          <Image className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>

        <CharacterStylePanel
          characterId={selectedCharacterId || null}
          currentBubbleColor={characterStyle.bubble_color}
          currentTextColor={characterStyle.text_color}
          onStyleUpdated={() => {
            onStyleUpdated?.();
            // Refetch character style
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
          className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!content.trim() || disabled || isUploading}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </motion.button>
      </form>
    </div>
  );
};
