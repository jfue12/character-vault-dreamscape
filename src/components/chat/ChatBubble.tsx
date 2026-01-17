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
        className="text-center py-3 px-6"
      >
        <p className="text-muted-foreground italic text-sm">{content}</p>
      </motion.div>
    );
  }

  // Thought bubble - wrapped in parentheses
  const displayContent = type === 'thought' ? `(${content})` : content;

  // Determine if message is roleplay/action (contains asterisks) - uses gray bubble
  const isRoleplayAction = hasAction || type === 'thought';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-end"
    >
      {/* Timestamp + Character Name + Avatar Row */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">
          {formattedTime}
        </span>
        <span className="text-sm font-medium text-primary">
          {characterName}
        </span>
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-border">
          {characterAvatar ? (
            <img 
              src={characterAvatar} 
              alt={characterName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
              {characterName[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Message Bubble */}
      <div className="flex justify-end pr-10">
        <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
          isRoleplayAction
            ? 'bg-muted text-foreground'
            : 'bg-[#5865F2]/80 text-white'
        }`}>
          <p className="text-sm leading-relaxed">
            {displayContent}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
