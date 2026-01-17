import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface ChatBubbleProps {
  characterName: string;
  characterAvatar: string | null;
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  isOwnMessage: boolean;
  timestamp?: string;
}

export const ChatBubble = ({
  characterName,
  characterAvatar,
  content,
  type,
  isOwnMessage,
  timestamp
}: ChatBubbleProps) => {
  const formattedTime = timestamp ? format(new Date(timestamp), 'h:mm a') : '';

  // Check if content contains action text (wrapped in asterisks)
  const hasAction = content.includes('*');
  
  // Narrator mode - centered italic text
  if (type === 'narrator') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-4 px-8"
      >
        <p className="text-muted-foreground italic text-sm">{content}</p>
      </motion.div>
    );
  }

  // Thought bubble - uses gray styling
  const isRoleplayAction = hasAction || type === 'thought';
  const displayContent = type === 'thought' ? `(${content})` : content;

  // Decorate character name with stars if special
  const decoratedName = characterName.includes('Morningstar') || characterName.includes('star') 
    ? `☆${characterName}☆` 
    : characterName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-end mb-3"
    >
      {/* Timestamp + Character Name + Avatar Row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] text-muted-foreground">
          {formattedTime}
        </span>
        <span className="text-sm font-medium text-primary">
          {decoratedName}
        </span>
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
      </div>

      {/* Message Bubble */}
      <div className="flex justify-end mr-11">
        <div className={`max-w-[280px] rounded-2xl px-4 py-2.5 ${
          isRoleplayAction
            ? 'bg-muted/80 text-foreground'
            : 'bg-[#5865F2] text-white'
        }`}>
          <p className="text-sm leading-relaxed">
            {displayContent}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
