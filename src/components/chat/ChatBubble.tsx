import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, Trash2, Reply } from 'lucide-react';

interface ReplyingTo {
  messageId: string;
  characterName: string;
  content: string;
}

interface ChatBubbleProps {
  messageId: string;
  characterName: string;
  characterAvatar: string | null;
  username?: string;
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  isOwnMessage: boolean;
  timestamp?: string;
  attachmentUrl?: string | null;
  onDelete?: (messageId: string) => void;
  onReply?: (replyInfo: ReplyingTo) => void;
  replyingTo?: ReplyingTo | null;
  bubbleColor?: string;
  textColor?: string;
  bubbleAlignment?: 'auto' | 'left' | 'right';
  isRead?: boolean;
  showReadReceipt?: boolean;
  role?: 'owner' | 'admin' | 'member';
  isAI?: boolean;
  onAICharacterClick?: () => void;
}

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
  onDelete,
  onReply,
  replyingTo,
  bubbleColor,
  textColor,
  bubbleAlignment = 'auto',
  isRead = false,
  showReadReceipt = false,
  role,
  isAI = false,
  onAICharacterClick
}: ChatBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const formattedTime = timestamp ? format(new Date(timestamp), 'h:mm a') : '';

  const isRightAligned = bubbleAlignment === 'auto' ? isOwnMessage : bubbleAlignment === 'right';
  const hasAction = content.includes('*');
  
  const parseContent = (text: string) => {
    // Handle **bold**, *italic*, and regular text
    // Match **bold** first, then *italic* (single asterisks that aren't part of **)
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text - keep bubble styling, just make bold
        return (
          <span key={i} className="font-bold">
            {part.slice(2, -2)}
          </span>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        // Italic action text
        return (
          <span key={i} className="italic text-muted-foreground">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply({
        messageId,
        characterName,
        content: content.length > 50 ? content.slice(0, 50) + '...' : content
      });
    }
    setShowActions(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(messageId);
    }
    setShowActions(false);
  };

  // Narrator mode - centered italic text
  if (type === 'narrator') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-4 px-8"
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        <p className="text-muted-foreground italic text-sm">{content}</p>
        {timestamp && (
          <span className="text-[10px] text-muted-foreground/50">{formattedTime}</span>
        )}
        
        {/* Long-press Action Menu for Narrator */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowActions(false)}
          >
            <div 
              className="bg-card border border-border rounded-xl p-2 shadow-xl min-w-[180px]"
              onClick={e => e.stopPropagation()}
            >
              {onReply && (
                <button
                  onClick={handleReply}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary rounded-lg transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              )}
              {onDelete && isOwnMessage && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  const isThought = type === 'thought';
  const displayContent = isThought ? content : content;

  const decoratedName = characterName.includes('Morningstar') || characterName.includes('star') 
    ? `☆${characterName}☆` 
    : characterName;

  const customBubbleStyle = bubbleColor && !isThought && !hasAction ? {
    backgroundColor: bubbleColor,
    color: textColor || '#FFFFFF'
  } : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col mb-3 ${isRightAligned ? 'items-end' : 'items-start'}`}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onTouchCancel={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
    >
      {/* Reply Preview - Shows the message being replied to */}
      {replyingTo && (
        <div className={`flex items-start gap-2 mb-1.5 ${isRightAligned ? 'mr-11' : 'ml-11'}`}>
          <div className="w-0.5 h-full min-h-[36px] bg-primary rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-medium text-primary">
              {replyingTo.characterName}
            </span>
            <span className="text-xs text-muted-foreground/80 line-clamp-2">
              {replyingTo.content}
            </span>
          </div>
        </div>
      )}

      {/* Timestamp + Character Name + Username + Avatar Row */}
      <div className={`flex items-center gap-2 mb-1.5 ${isRightAligned ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="relative">
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
          {!isOwnMessage && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" title="Active in Story" />
          )}
        </div>
        <div className={`flex items-center gap-1.5 ${isRightAligned ? 'flex-row-reverse' : 'flex-row'}`}>
          <span 
            className={`text-sm font-medium text-primary ${isAI && onAICharacterClick ? 'cursor-pointer hover:underline' : ''}`}
            onClick={isAI && onAICharacterClick ? onAICharacterClick : undefined}
          >
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
          {isThought && (
            <div className={`absolute -bottom-2 ${isRightAligned ? 'right-4' : 'left-4'} flex gap-0.5`}>
              <div className="w-2 h-2 rounded-full bg-muted/60 border border-muted-foreground/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted/60 border border-muted-foreground/20" />
            </div>
          )}
          
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
      </div>

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

      {/* Long-press Action Menu */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowActions(false)}
        >
          <div 
            className="bg-card border border-border rounded-xl p-2 shadow-xl min-w-[180px]"
            onClick={e => e.stopPropagation()}
          >
            {onReply && (
              <button
                onClick={handleReply}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
            )}
            {onDelete && isOwnMessage && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};