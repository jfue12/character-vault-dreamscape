import { useState, useRef, useEffect } from 'react';
import { Send, Image, Smile, Plus, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterStylePanel } from '@/components/chat/CharacterStylePanel';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ReplyingTo {
  messageId: string;
  characterName: string;
  content: string;
}

interface MascotChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  roomId: string;
  worldId?: string;
  characters: Character[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  onCreateCharacter: () => void;
  baseProfileName?: string;
  isStaff?: boolean;
  onStyleUpdated?: () => void;
  replyingTo?: ReplyingTo | null;
  onClearReply?: () => void;
}

const EMOJI_SHORTCUTS = ['😊', '😂', '❤️', '🔥', '✨', '👀', '💀', '🥺', '😈', '💜'];

export const MascotChatInput = ({ 
  onSend, 
  onTypingChange, 
  disabled, 
  roomId,
  worldId,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onCreateCharacter,
  baseProfileName = 'You',
  isStaff = false,
  onStyleUpdated,
  replyingTo,
  onClearReply,
}: MascotChatInputProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'dialogue' | 'thought' | 'narrator'>('dialogue');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [characterStyle, setCharacterStyle] = useState<{ bubble_color?: string | null; text_color?: string | null }>({});
  const [bubbleSide, setBubbleSide] = useState<string | null>(null);
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
    
    const finalType = messageType;
    const finalContent = content.trim();
    
    onSend(finalContent, finalType);
    setContent('');
    setIsExpanded(false);
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

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojis(false);
  };

  // Toggle between dialogue and narrator only
  const toggleMessageType = () => {
    setMessageType(prev => prev === 'dialogue' ? 'narrator' : 'dialogue');
  };

  const displayName = selectedCharacter?.name || baseProfileName;
  const displayAvatar = selectedCharacter?.avatar_url;

  return (
    <div className="bg-[#0a0a0a] border-t border-[#1a1a1a]">
      {/* Character Picker Dropdown */}
      <AnimatePresence>
        {showCharacterPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-b border-[#1a1a1a] p-3"
          >
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 touch-action-pan-y">
              {/* Base Profile */}
              <button
                onClick={() => {
                  onSelectCharacter(null);
                  setShowCharacterPicker(false);
                }}
                className="flex flex-col items-center gap-1 min-w-[64px] touch-feedback"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  selectedCharacterId === null
                    ? 'ring-2 ring-[#7C3AED] bg-[#7C3AED]/30'
                    : 'bg-[#1a1a1a] active:bg-[#2a2a2a]'
                }`}>
                  <User className="w-6 h-6 text-white" />
                </div>
                <span className={`text-[10px] truncate max-w-[64px] ${
                  selectedCharacterId === null ? 'text-[#7C3AED] font-medium' : 'text-gray-500'
                }`}>
                  {baseProfileName}
                </span>
              </button>

              {/* Characters */}
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    onSelectCharacter(char.id);
                    setShowCharacterPicker(false);
                  }}
                  className="flex flex-col items-center gap-1 min-w-[64px] touch-feedback"
                >
                  <div className={`w-14 h-14 rounded-full overflow-hidden transition-all ${
                    selectedCharacterId === char.id
                      ? 'ring-2 ring-[#7C3AED]'
                      : 'opacity-70 active:opacity-100'
                  }`}>
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-purple-800 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{char.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] truncate max-w-[64px] ${
                    selectedCharacterId === char.id ? 'text-[#7C3AED] font-medium' : 'text-gray-500'
                  }`}>
                    {char.name}
                  </span>
                </button>
              ))}

              {/* Add New */}
              <button
                onClick={() => {
                  setShowCharacterPicker(false);
                  onCreateCharacter();
                }}
                className="flex flex-col items-center gap-1 min-w-[64px] touch-feedback"
              >
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center active:border-[#7C3AED] transition-colors">
                  <Plus className="w-6 h-6 text-gray-500" />
                </div>
                <span className="text-[10px] text-gray-500">Add</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Emoji Quick Pick */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 overflow-hidden"
          >
            <div className="flex gap-1 py-2 bg-[#1a1a1a] rounded-xl px-3">
              {EMOJI_SHORTCUTS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-2"
          >
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2">
              <div className="w-1 h-8 bg-[#7C3AED] rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#7C3AED] font-medium">Replying to {replyingTo.characterName}</p>
                <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
              </div>
              <button
                onClick={onClearReply}
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area - Mobile Optimized */}
      <div className="p-2 pt-1.5">
        {/* Input Row */}
        <div className="flex items-end gap-1">
          {/* Action Buttons - Compact */}
          <div className="flex gap-0 items-center flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setShowCharacterPicker(!showCharacterPicker)}
              className="p-1.5 rounded-lg active:bg-[#1a1a1a] transition-colors touch-feedback"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#7C3AED]/30 flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className="p-1.5 text-gray-500 active:text-[#7C3AED] rounded-lg active:bg-[#1a1a1a] transition-colors disabled:opacity-50 touch-feedback"
            >
              <Image className="w-4 h-4" />
            </button>
            {/* Message Type Toggle - Compact */}
            <button
              type="button"
              onClick={toggleMessageType}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 touch-feedback no-select ${
                messageType === 'narrator'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                  : 'bg-gradient-to-r from-[#7C3AED] to-purple-600 text-white'
              }`}
            >
              <span className="text-xs">{messageType === 'narrator' ? '📖' : '💬'}</span>
              <span>{messageType === 'narrator' ? 'Narrate' : 'Talk'}</span>
            </button>
            <CharacterStylePanel
              characterId={selectedCharacterId}
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
              }}
            />
          </div>

          {/* Text Input - Takes maximum space */}
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
                  : messageType === 'thought'
                    ? 'What are they thinking...'
                    : 'Say something...'
              }
              disabled={disabled || isUploading}
              rows={1}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-base text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[#7C3AED] min-h-[44px] max-h-32"
              style={{ height: 'auto', fontSize: '16px' }}
            />
          </div>

          {/* Send Button - Compact */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSubmit()}
            disabled={!content.trim() || disabled || isUploading}
            className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 shadow-lg shadow-[#7C3AED]/30 flex-shrink-0 touch-feedback"
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};