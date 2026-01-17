import { useState } from 'react';
import { Plus, X, User, Globe, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingActionMenuProps {
  onCreateOC?: () => void;
}

export const FloatingActionMenu = ({ onCreateOC }: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { 
      icon: User, 
      label: 'Create OC', 
      action: () => {
        setIsOpen(false);
        if (onCreateOC) {
          onCreateOC();
        } else {
          navigate('/create');
        }
      }
    },
    { 
      icon: Globe, 
      label: 'Create World', 
      action: () => {
        setIsOpen(false);
        navigate('/create-world');
      }
    },
    { 
      icon: BookOpen, 
      label: 'Publish Story', 
      action: () => {
        setIsOpen(false);
        navigate('/plots');
      }
    },
  ];

  return (
    <>
      {/* Blurred Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action();
                  }}
                  className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-card/50 border border-border hover:border-primary transition-all group min-w-[200px]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-14 h-14"
      >
        {/* Outer neon ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
        {/* Inner button */}
        <motion.div 
          className="absolute inset-1 rounded-full bg-primary flex items-center justify-center shadow-lg neon-border"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          ) : (
            <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          )}
        </motion.div>
      </motion.button>
    </>
  );
};
