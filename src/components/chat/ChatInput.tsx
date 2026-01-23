import { useState, useRef, useEffect } from 'react';
import { Send, Image, Paintbrush, RefreshCw, MessageSquare, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterStylePanel } from '@/components/chat/CharacterStylePanel';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  roomId: string;
  worldId?: string;
  selectedCharacterId?: string | null;
  isStaff?: boolean;
  onStyleUpdated?: () => void;
  characters?: Character[];
  onSelectCharacter?: (id: string | null) => void;
}

export const ChatInput = ({ 
  onSend, 
  onTypingChange, 
  disabled, 
  roomId, 
  worldId, 
  selectedCharacterId, 
  isStaff, 
  onStyleUpdated,
  characters = [],
  onSelectCharacter,
}: ChatInputProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'dialogue' | 'thought' | 'narrator'>('dialogue');
  const [isUploading, setIsUploading] = useState(false);
  const [characterStyle, setCharacterStyle] = useState<{ bubble_color?: string | null; text_color?: string | null }>({});
  const [bubbleSide, setBubbleSide] = useState<string | null>(null);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    onTypingChange(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
    }, 2000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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
      const fileName = `${user.id}/${roomId}/${Date.now()}.${fileExt}`;
      
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

  const toggleMessageType = () => {
    setMessageType(prev => prev === 'dialogue' ? 'narrator' : 'dialogue');
  };

  const refetchStyles = () => {
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
    if (isStaff && worldId && user) {
      supabase
        .from('world_members')
        .select('bubble_side')
        .eq('world_id', worldId)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setBubbleSide(data.bubble_side);
          }
        });
    }
  };

  return (
    <div className="bg-black/80 backdrop-blur-sm border-t border-white/10">
      {/* Character Picker Dropdown */}
      <AnimatePresence>
        {showCharacterPicker && characters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-b border-white/10 p-3 bg-black/90"
          >
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    onSelectCharacter?.(char.id);
                    setShowCharacterPicker(false);
                  }}
                  className="flex flex-col items-center gap-1 min-w-[64px]"
                >
                  <div className={`w-14 h-14 rounded-full overflow-hidden transition-all ${
                    selectedCharacterId === char.id
                      ? 'ring-2 ring-primary'
                      : 'opacity-70'
                  }`}>
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{char.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] truncate max-w-[64px] ${
                    selectedCharacterId === char.id ? 'text-primary font-medium' : 'text-gray-500'
                  }`}>
                    {char.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Style Panel Dropdown */}
      <AnimatePresence>
        {showStylePanel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-b border-white/10 p-3 bg-black/90"
          >
            <CharacterStylePanel
              characterId={selectedCharacterId || null}
              currentBubbleColor={characterStyle.bubble_color}
              currentTextColor={characterStyle.text_color}
              currentBubbleSide={bubbleSide}
              isStaff={isStaff}
              worldId={worldId}
              onStyleUpdated={() => {
                onStyleUpdated?.();
                setShowStylePanel(false);
                refetchStyles();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 pb-6">
        {/* Main Input Row - Avatar + Text */}
        <div className="flex items-start gap-3 mb-3">
          {/* Character Avatar with Switch Icon */}
          <button
            onClick={() => setShowCharacterPicker(!showCharacterPicker)}
            className="relative flex-shrink-0"
            disabled={!onSelectCharacter || characters.length === 0}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
              {selectedCharacter?.avatar_url ? (
                <img 
                  src={selectedCharacter.avatar_url} 
                  alt={selectedCharacter.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedCharacter?.name?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            {/* Switch Icon Overlay */}
            {onSelectCharacter && characters.length > 0 && (
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-black">
                <RefreshCw className="w-3 h-3 text-white" />
              </div>
            )}
          </button>

          {/* Text Input Area */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                messageType === 'narrator' 
                  ? 'Describe the scene...' 
                  : 'Say something...'
              }
              disabled={disabled || isUploading}
              rows={1}
              className="w-full bg-transparent text-white placeholder:text-gray-500 resize-none focus:outline-none text-base min-h-[44px] py-2"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Side Toggle Icon */}
          <div className="flex-shrink-0 pt-2">
            <div className="text-gray-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center gap-1">
          {/* Message Type Toggle */}
          <button
            onClick={toggleMessageType}
            className={`p-2.5 rounded-lg transition-all ${
              messageType === 'dialogue'
                ? 'bg-primary text-white'
                : 'bg-muted text-gray-400'
            }`}
          >
            {messageType === 'dialogue' ? (
              <MessageSquare className="w-5 h-5" />
            ) : (
              <BookOpen className="w-5 h-5" />
            )}
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || disabled}
            className="p-2.5 rounded-lg bg-muted text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <Image className="w-5 h-5" />
          </button>

          {/* GIF Button (placeholder) */}
          <button
            disabled
            className="p-2.5 rounded-lg bg-muted text-gray-400 opacity-50 cursor-not-allowed"
          >
            <span className="text-xs font-bold">GIF</span>
          </button>

          {/* Style/Paintbrush Button */}
          <button
            onClick={() => setShowStylePanel(!showStylePanel)}
            className={`p-2.5 rounded-lg transition-all ${
              showStylePanel
                ? 'bg-primary text-white'
                : 'bg-muted text-gray-400 hover:text-white'
            }`}
          >
            <Paintbrush className="w-5 h-5" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Send Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSubmit()}
            disabled={!content.trim() || disabled || isUploading}
            className="w-12 h-10 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 shadow-lg shadow-primary/30"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
