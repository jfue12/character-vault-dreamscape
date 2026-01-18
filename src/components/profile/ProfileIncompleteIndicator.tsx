import { motion } from 'framer-motion';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface ProfileIncompleteIndicatorProps {
  onClick: () => void;
  message?: string;
}

export const ProfileIncompleteIndicator = ({ 
  onClick, 
  message = "Complete your profile to get started" 
}: ProfileIncompleteIndicatorProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-5 h-5 text-amber-500" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-foreground">Profile Incomplete</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-amber-500" />
    </motion.button>
  );
};
