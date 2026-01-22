import { useState, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, Trash2, Reply, Pencil, X, CornerDownRight } from 'lucide-react';

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
  onEdit?: (messageId: string, newContent: string) => void;
  replyingTo?: ReplyingTo | null;
  bubbleColor?: string;
  textColor?: string;
  bubbleAlignment?: 'auto' | 'left' | 'right';
  isRead?: boolean;
  showReadReceipt?: boolean;
  role?: 'owner' | 'admin' | 'member';
  isAI?: boolean;
  onAICharacterClick?: () => void;
  isEdited?: boolean;
}

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(({
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
  onEdit,
  replyingTo,
  bubbleColor,
  textColor,
  bubbleAlignment = 'auto',
  isRead = false,
  showReadReceipt = false,
  role,
  isAI = false,
  onAICharacterClick,
  isEdited = false
}, ref) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const formattedTime = timestamp ? format(new Date(timestamp), 'h:mm a') : '';

  const isRightAligned = bubbleAlignment === 'auto' ? isOwnMessage : bubbleAlignment === 'right';
  
  const parseContent = (text: string) => {
    // Handle **bold** only - asterisks and dashes are treated as regular text
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text - keep bubble styling, just make bold
        return (
          <span key={i} className="font-bold">
            {part.slice(2, -2)}
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

  const handleStartEdit = () => {
    setEditContent(content);
    setIsEditing(true);
    setShowActions(false);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() && editContent !== content) {
      onEdit(messageId, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
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
        {/* Reply context for narrator */}
        {replyingTo && (
          <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
            <CornerDownRight className="w-3 h-3" />
            <span>Replying to <span className="text-primary font-medium">{replyingTo.characterName}</span></span>
          </div>
        )}
        
        {isEditing ? (
          <div className="inline-flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-transparent text-sm text-center focus:outline-none min-w-[200px]"
              autoFocus
            />
            <button onClick={handleSaveEdit} className="p-1 text-primary hover:bg-primary/20 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleCancelEdit} className="p-1 text-muted-foreground hover:bg-secondary rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">{content}</p>
        )}
        
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-[10px] text-muted-foreground/50">{formattedTime}</span>
          {isEdited && <span className="text-[10px] text-muted-foreground/50">(edited)</span>}
        </div>
        
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
              {onEdit && isOwnMessage && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
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

  const customBubbleStyle = bubbleColor && !isThought ? {
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
      {/* Reply Thread Visual - Shows the message being replied to */}
      {replyingTo && (
        <div className={`flex items-start gap-2 mb-1.5 ${isRightAligned ? 'mr-11 flex-row-reverse' : 'ml-11'}`}>
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1.5 max-w-[240px]">
            <CornerDownRight className={`w-3 h-3 text-primary flex-shrink-0 ${isRightAligned ? 'rotate-180' : ''}`} />
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-primary block">
                {replyingTo.characterName}
              </span>
              <span className="text-[10px] text-muted-foreground/80 line-clamp-1">
                {replyingTo.content}
              </span>
            </div>
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
          {/* Username removed - only show character name and timestamp */}
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
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none min-w-[150px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button onClick={handleSaveEdit} className="p-1 hover:bg-white/20 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={handleCancelEdit} className="p-1 hover:bg-white/20 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">
              {isThought ? `(${parseContent(displayContent)})` : parseContent(displayContent)}
            </p>
          )}
        </div>
      </div>

      {/* Edited indicator + Read Receipt for own messages */}
      <div className={`flex items-center gap-1.5 mt-0.5 ${isRightAligned ? 'ml-11 justify-end' : 'mr-11'}`}>
        {isEdited && (
          <span className="text-[10px] text-muted-foreground/60">(edited)</span>
        )}
        {showReadReceipt && isOwnMessage && (
          <>
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
          </>
        )}
      </div>

      {/* Long-press Action Menu */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
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
              {onEdit && isOwnMessage && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
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
      </AnimatePresence>
    </motion.div>
  );
});

ChatBubble.displayName = 'ChatBubble';
