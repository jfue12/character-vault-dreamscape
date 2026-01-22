import { useState, useRef, useEffect } from 'react';
import { Send, Image, Smile, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterStylePanel } from '@/components/chat/CharacterStylePanel';

interface ReplyingTo {
  messageId: string;
  characterName: string;
  content: string;
}

interface DMChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string, replyToId?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  friendshipId: string;
  selectedCharacterId?: string | null;
  onStyleUpdated?: () => void;
  replyingTo?: ReplyingTo | null;
  onClearReply?: () => void;
}

const EMOJI_SHORTCUTS = ['😊', '😂', '❤️', '🔥', '✨', '👀', '💀', '🥺'];

export const DMChatInput = ({ onSend, onTypingChange, disabled, friendshipId, selectedCharacterId, onStyleUpdated, replyingTo, onClearReply }: DMChatInputProps) => {
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
    
    const finalType = messageType;
    const finalContent = content.trim();
    const replyToId = replyingTo?.messageId;
    
    onSend(finalContent, finalType, undefined, replyToId);
    setContent('');
    onTypingChange(false);
    onClearReply?.();
    
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

  // Toggle between dialogue and narrator only
  const toggleMessageType = () => {
    setMessageType(prev => prev === 'dialogue' ? 'narrator' : 'dialogue');
  };

  return (
    <div className="p-3 pb-6">
      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium">Replying to {replyingTo.characterName}</p>
                <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
              <button
                onClick={onClearReply}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Message Type Toggle - Combined Talk/Narrator */}
        <button
          type="button"
          onClick={toggleMessageType}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            messageType === 'narrator'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg'
          }`}
        >
          <span>{messageType === 'narrator' ? '📖' : '💬'}</span>
          <span>{messageType === 'narrator' ? 'Narrate' : 'Talk'}</span>
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
                .maybeSingle()
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
