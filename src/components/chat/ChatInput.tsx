import { useState } from 'react';
import { Send, MessageCircle, Brain, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (content: string, type: 'dialogue' | 'thought' | 'narrator') => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'dialogue' | 'thought' | 'narrator'>('dialogue');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;
    
    onSend(content.trim(), messageType);
    setContent('');
  };

  const typeOptions = [
    { type: 'dialogue' as const, icon: MessageCircle, label: 'Dialogue' },
    { type: 'thought' as const, icon: Brain, label: 'Thought' },
    { type: 'narrator' as const, icon: BookOpen, label: 'Narrator' },
  ];

  return (
    <div className="bg-card border-t border-border p-3">
      {/* Message Type Selector */}
      <div className="flex gap-2 mb-2">
        {typeOptions.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => setMessageType(type)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all ${
              messageType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            messageType === 'narrator' 
              ? 'Describe the scene...' 
              : messageType === 'thought'
                ? 'What are they thinking...'
                : 'Say something...'
          }
          disabled={disabled}
          className="flex-1 bg-secondary border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!content.trim() || disabled}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </motion.button>
      </form>
    </div>
  );
};
