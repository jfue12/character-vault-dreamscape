import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, Trash2 } from 'lucide-react';

interface ChatBubbleProps {
  messageId: string;
  characterName: string;
  characterAvatar: string | null;
  username?: string; // The @username of the sender
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  isOwnMessage: boolean;
  timestamp?: string;
  attachmentUrl?: string | null;
  emojiReactions?: Record<string, string[]>;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  bubbleColor?: string;
  textColor?: string;
  bubbleAlignment?: 'auto' | 'left' | 'right';
  isRead?: boolean;
  showReadReceipt?: boolean;
  role?: 'owner' | 'admin' | 'member'; // User's role in the world
  isAI?: boolean; // Is this an AI message
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export const ChatBubble = ({
  messageId,
  characterName,
  characterAvatar,
  username,
  content,
  type,
  isOwnMessage,
  timestamp,
  attachmentUrl,
  emojiReactions = {},
  onReact,
  onDelete,
  bubbleColor,
  textColor,
  bubbleAlignment = 'auto',
  isRead = false,
  showReadReceipt = false,
  role,
  isAI = false
}: ChatBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const formattedTime = timestamp ? format(new Date(timestamp), 'h:mm a') : '';

  // Determine if message should appear on right side
  const isRightAligned = bubbleAlignment === 'auto' ? isOwnMessage : bubbleAlignment === 'right';

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
      className={`flex flex-col mb-3 ${isRightAligned ? 'items-end' : 'items-start'}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Timestamp + Character Name + Username + Avatar Row */}
      <div className={`flex items-center gap-2 mb-1.5 ${isRightAligned ? 'flex-row-reverse' : 'flex-row'}`}>
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
        <div className={`flex items-center gap-1.5 ${isRightAligned ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-sm font-medium text-primary">
            {decoratedName}
          </span>
          {role === 'owner' && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
              Owner
            </span>
          )}
          {role === 'admin' && (
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
              Admin
            </span>
          )}
          {isAI && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
              AI
            </span>
          )}
          {username && (
            <span className="text-xs text-muted-foreground">
              @{username}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formattedTime}
        </span>
      </div>

      {/* Message Bubble */}
      <div className={`flex ${isRightAligned ? 'justify-end ml-11' : 'justify-start mr-11'} relative`}>
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
            <div className={`absolute -bottom-2 ${isRightAligned ? 'right-4' : 'left-4'} flex gap-0.5`}>
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

        {/* Reaction Picker & Delete */}
        {showReactions && (onReact || (onDelete && isOwnMessage)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute -top-8 ${isRightAligned ? 'right-0' : 'left-0'} flex gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg`}
          >
            {onReact && REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(messageId, emoji)}
                className="text-sm hover:scale-125 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
            {onDelete && isOwnMessage && (
              <button
                onClick={() => onDelete(messageId)}
                className="text-sm hover:scale-125 transition-transform p-0.5 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Reaction Counts */}
      {reactionCounts.length > 0 && (
        <div className={`flex gap-1 mt-1 ${isRightAligned ? 'ml-11' : 'mr-11'}`}>
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

      {/* Read Receipt for own messages */}
      {showReadReceipt && isOwnMessage && (
        <div className={`flex items-center gap-1 mt-0.5 ${isRightAligned ? 'ml-11 justify-end' : 'mr-11'}`}>
          {isRead ? (
            <span className="flex items-center gap-0.5 text-[10px] text-primary">
              <CheckCheck className="w-3 h-3" />
              <span>Seen</span>
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Check className="w-3 h-3" />
              <span>Sent</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};