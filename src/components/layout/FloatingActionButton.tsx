import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface FloatingActionButtonProps {
  to?: string;
  onClick?: () => void;
}

export const FloatingActionButton = ({ to, onClick }: FloatingActionButtonProps) => {
  const buttonContent = (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg neon-border cursor-pointer"
    >
      <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
    </motion.div>
  );

  if (to) {
    return (
      <Link 
        to={to}
        className="fixed bottom-24 right-4 z-40"
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40"
    >
      {buttonContent}
    </button>
  );
};
