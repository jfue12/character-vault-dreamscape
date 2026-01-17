import { motion } from 'framer-motion';

interface ChatBubbleProps {
  characterName: string;
  characterAvatar: string | null;
  content: string;
  type: 'dialogue' | 'thought' | 'narrator';
  isOwnMessage: boolean;
}

export const ChatBubble = ({
  characterName,
  characterAvatar,
  content,
  type,
  isOwnMessage
}: ChatBubbleProps) => {
  // Narrator mode - centered italic text
  if (type === 'narrator') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-3 px-6"
      >
        <p className="text-muted-foreground italic">{content}</p>
      </motion.div>
    );
  }

  // Thought bubble - wrapped in parentheses
  const displayContent = type === 'thought' ? `(${content})` : content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
        {characterAvatar ? (
          <img 
            src={characterAvatar} 
            alt={characterName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center text-xs font-bold">
            {characterName[0]}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <span className="text-xs font-medium text-primary mb-1 block">
          {characterName}
        </span>
        <div className={`rounded-2xl px-4 py-2 ${
          type === 'thought'
            ? 'bg-secondary/50 border border-dashed border-border'
            : isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card border border-border'
        }`}>
          <p className={`text-sm ${type === 'thought' ? 'italic text-muted-foreground' : ''}`}>
            {displayContent}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
