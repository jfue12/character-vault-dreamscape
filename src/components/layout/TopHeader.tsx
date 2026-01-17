import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface TopHeaderProps {
  title?: string;
}

export const TopHeader = ({ title = 'OC Vault' }: TopHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-safe">
      <div className="mx-4 mt-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-primary neon-text">
            {title}
          </h1>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
};
