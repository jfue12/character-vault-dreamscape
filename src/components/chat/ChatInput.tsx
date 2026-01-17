import { useState } from 'react';
import { Send } from 'lucide-react';
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
    { type: 'dialogue' as const, label: 'Talk' },
    { type: 'thought' as const, label: 'Think' },
    { type: 'narrator' as const, label: 'Narrate' },
  ];

  return (
    <div className="p-3 pb-6">
      {/* Message Type Selector */}
      <div className="flex gap-1.5 mb-2">
        {typeOptions.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setMessageType(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              messageType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
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
          className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!content.trim() || disabled}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </motion.button>
      </form>
    </div>
  );
};
