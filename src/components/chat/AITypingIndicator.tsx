import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface AITypingIndicatorProps {
  isThinking: boolean;
  thinkingPhase?: 'analyzing' | 'generating' | 'responding';
}

export const AITypingIndicator = ({ isThinking, thinkingPhase = 'analyzing' }: AITypingIndicatorProps) => {
  if (!isThinking) return null;

  const getMessage = () => {
    switch (thinkingPhase) {
      case 'analyzing':
        return 'The Narrator reads the scene...';
      case 'generating':
        return 'A character enters the story...';
      case 'responding':
        return 'Writing their lines...';
      default:
        return 'The Stage Manager stirs...';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 backdrop-blur-sm"
      >
        <motion.div
          animate={{ 
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
        >
          <Sparkles className="w-4 h-4 text-white" />
        </motion.div>
        
        <div className="flex flex-col">
          <span className="text-sm font-medium text-purple-300">{getMessage()}</span>
          <div className="flex gap-1 mt-1">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1.2,
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
