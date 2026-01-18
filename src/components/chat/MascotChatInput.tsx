import { useState, useRef } from 'react';
import { Send, Image, Smile, Plus, Keyboard, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface MascotChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator', attachmentUrl?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  roomId: string;
  characters: Character[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  onCreateCharacter: () => void;
  baseProfileName?: string;
}

const EMOJI_SHORTCUTS = ['😊', '😂', '❤️', '🔥', '✨', '👀', '💀', '🥺', '😈', '💜'];

export const MascotChatInput = ({ 
  onSend, 
  onTypingChange, 
  disabled, 
  roomId,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onCreateCharacter,
  baseProfileName = 'You'
}: MascotChatInputProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'dialogue' | 'thought' | 'narrator'>('dialogue');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

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
    
    // Auto-detect thought bubbles from parentheses
    if (finalContent.startsWith('(') && finalContent.endsWith(')')) {
      finalType = 'thought';
      finalContent = finalContent.slice(1, -1);
    }
    
    // Auto-detect narration from asterisks
    if (finalContent.startsWith('*') && finalContent.endsWith('*')) {
      finalType = 'narrator';
      finalContent = finalContent.slice(1, -1);
    }
    
    onSend(finalContent, finalType);
    setContent('');
    setIsExpanded(false);
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

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojis(false);
  };

  const typeOptions = [
    { type: 'dialogue' as const, label: 'Talk', icon: '💬', color: 'from-[#7C3AED] to-purple-600' },
    { type: 'thought' as const, label: 'Think', icon: '💭', color: 'from-gray-600 to-gray-700' },
    { type: 'narrator' as const, label: 'Narrate', icon: '📖', color: 'from-amber-600 to-orange-600' },
  ];

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
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {/* Base Profile */}
              <button
                onClick={() => {
                  onSelectCharacter(null);
                  setShowCharacterPicker(false);
                }}
                className="flex flex-col items-center gap-1 min-w-[60px]"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  selectedCharacterId === null
                    ? 'ring-2 ring-[#7C3AED] bg-[#7C3AED]/30'
                    : 'bg-[#1a1a1a] hover:bg-[#2a2a2a]'
                }`}>
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className={`text-[10px] truncate max-w-[60px] ${
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
                  className="flex flex-col items-center gap-1 min-w-[60px]"
                >
                  <div className={`w-12 h-12 rounded-full overflow-hidden transition-all ${
                    selectedCharacterId === char.id
                      ? 'ring-2 ring-[#7C3AED]'
                      : 'opacity-70 hover:opacity-100'
                  }`}>
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-purple-800 flex items-center justify-center">
                        <span className="text-white font-bold">{char.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] truncate max-w-[60px] ${
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
                className="flex flex-col items-center gap-1 min-w-[60px]"
              >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center hover:border-[#7C3AED] transition-colors">
                  <Plus className="w-5 h-5 text-gray-500" />
                </div>
                <span className="text-[10px] text-gray-500">Add</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Type Toggles - Mascot Style */}
      <div className="flex gap-2 p-3 pb-2 justify-center">
        {typeOptions.map(({ type, label, icon, color }) => (
          <button
            key={type}
            onClick={() => setMessageType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              messageType === type
                ? `bg-gradient-to-r ${color} text-white shadow-lg`
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

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

      {/* Main Input Area - Mascot Style */}
      <div className="p-3 pt-2">
        {/* Text Preview with Avatar */}
        {content.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 mb-3 p-3 bg-[#1a1a1a] rounded-xl"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#7C3AED]/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className="text-sm text-white flex-1 whitespace-pre-wrap break-words">
              {content}
            </p>
          </motion.div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2">
          {/* Action Buttons */}
          <div className="flex gap-1">
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
              className="p-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors"
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
              className="p-2.5 text-gray-500 hover:text-[#7C3AED] rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojis(!showEmojis)}
              className="p-2.5 text-gray-500 hover:text-[#7C3AED] rounded-xl hover:bg-[#1a1a1a] transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
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
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[#7C3AED] min-h-[44px] max-h-32"
              style={{ height: 'auto' }}
            />
          </div>

          {/* Send Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSubmit()}
            disabled={!content.trim() || disabled || isUploading}
            className="w-11 h-11 rounded-xl bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 shadow-lg shadow-[#7C3AED]/30 flex-shrink-0"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};