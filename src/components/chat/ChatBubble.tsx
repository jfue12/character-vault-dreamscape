import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface ChatBubbleProps {
  messageId: string;
  characterName: string;
  characterAvatar: string | null;
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  isOwnMessage: boolean;
  timestamp?: string;
  attachmentUrl?: string | null;
  emojiReactions?: Record<string, string[]>;
  onReact?: (messageId: string, emoji: string) => void;
  bubbleColor?: string;
  textColor?: string;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export const ChatBubble = ({
  messageId,
  characterName,
  characterAvatar,
  content,
  type,
  isOwnMessage,
  timestamp,
  attachmentUrl,
  emojiReactions = {},
  onReact,
  bubbleColor,
  textColor
}: ChatBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const formattedTime = timestamp ? format(new Date(timestamp), 'h:mm a') : '';

  // Check if content contains action text (wrapped in asterisks)
  const hasAction = content.includes('*');
  
  // Parse content with asterisks for italic action text
  const parseContent = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <span key={i} className="italic text-muted-foreground">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };
  
  // Narrator mode - centered italic text
  if (type === 'narrator') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-4 px-8"
      >
        <p className="text-muted-foreground italic text-sm">{content}</p>
        {timestamp && (
          <span className="text-[10px] text-muted-foreground/50">{formattedTime}</span>
        )}
      </motion.div>
    );
  }

  // Thought bubble - cloud style
  const isThought = type === 'thought';
  const displayContent = isThought ? content : content;

  // Decorate character name
  const decoratedName = characterName.includes('Morningstar') || characterName.includes('star') 
    ? `☆${characterName}☆` 
    : characterName;

  // Count reactions
  const reactionCounts = Object.entries(emojiReactions).map(([emoji, users]) => ({
    emoji,
    count: users.length
  })).filter(r => r.count > 0);

  // Custom bubble styles
  const customBubbleStyle = bubbleColor && !isThought && !hasAction ? {
    backgroundColor: bubbleColor,
    color: textColor || '#FFFFFF'
  } : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col mb-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Timestamp + Character Name + Avatar Row */}
      <div className={`flex items-center gap-2 mb-1.5 ${isOwnMessage ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-border">
          {characterAvatar ? (
            <img 
              src={characterAvatar} 
              alt={characterName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 to-purple-900/40 flex items-center justify-center text-xs font-bold text-foreground">
              {characterName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-primary">
          {decoratedName}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formattedTime}
        </span>
      </div>

      {/* Message Bubble */}
      <div className={`flex ${isOwnMessage ? 'justify-end mr-11' : 'justify-start ml-11'} relative`}>
        <div 
          className={`max-w-[280px] rounded-2xl px-4 py-2.5 relative ${
            isThought
              ? 'bg-muted/60 text-foreground border border-muted-foreground/20'
              : hasAction
                ? 'bg-muted/80 text-foreground'
                : customBubbleStyle 
                  ? ''
                  : 'bg-primary text-primary-foreground'
          }`}
          style={customBubbleStyle}
        >
          {/* Thought bubble decoration */}
          {isThought && (
            <div className={`absolute -bottom-2 ${isOwnMessage ? 'right-4' : 'left-4'} flex gap-0.5`}>
              <div className="w-2 h-2 rounded-full bg-muted/60 border border-muted-foreground/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted/60 border border-muted-foreground/20" />
            </div>
          )}
          
          {/* Attachment Image */}
          {attachmentUrl && (
            <div className="mb-2 rounded-lg overflow-hidden">
              <img 
                src={attachmentUrl} 
                alt="Attachment" 
                className="max-w-full h-auto"
              />
            </div>
          )}
          
          <p className="text-sm leading-relaxed">
            {isThought ? `(${parseContent(displayContent)})` : parseContent(displayContent)}
          </p>
        </div>

        {/* Reaction Picker */}
        {showReactions && onReact && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute -top-8 ${isOwnMessage ? 'right-0' : 'left-0'} flex gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg`}
          >
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(messageId, emoji)}
                className="text-sm hover:scale-125 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Reaction Counts */}
      {reactionCounts.length > 0 && (
        <div className={`flex gap-1 mt-1 ${isOwnMessage ? 'mr-11' : 'ml-11'}`}>
          {reactionCounts.map(({ emoji, count }) => (
            <span
              key={emoji}
              className="flex items-center gap-0.5 text-xs bg-secondary/50 rounded-full px-1.5 py-0.5"
            >
              {emoji} {count}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
};