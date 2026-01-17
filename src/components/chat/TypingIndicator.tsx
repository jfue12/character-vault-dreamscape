import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: { name: string; avatar: string | null }[];
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (typingUsers.length === 0) return null;

  const getMessage = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else {
      return 'Multiple people are typing...';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-4 py-2"
      >
        <div className="flex -space-x-2">
          {typingUsers.slice(0, 3).map((user, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full overflow-hidden border-2 border-background"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">{user.name[0]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{getMessage()}</span>
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};