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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center bg-background"
    >
      <Plus className="w-7 h-7 text-primary" />
    </motion.div>
  );

  if (to) {
    return (
      <Link 
        to={to}
        className="fixed bottom-20 right-6 z-50"
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick}
      className="fixed bottom-20 right-6 z-50"
    >
      {buttonContent}
    </button>
  );
};
