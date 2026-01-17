import { Book, Sparkles, Hash, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: Book, label: 'OCs', path: '/profile' },
  { icon: Sparkles, label: 'Worlds', path: '/worlds' },
  { icon: Hash, label: 'Plots', path: '/plots' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { profile } = useAuth();

  // Get first letter of username for avatar
  const avatarLetter = profile?.username?.charAt(0)?.toUpperCase() || 'M';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around py-3 px-4 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/profile' && location.pathname.startsWith('/profile'));
          const Icon = item.icon;

          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Icon 
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`} 
                />
              </motion.div>
            </Link>
          );
        })}
        
        {/* Profile Avatar */}
        <Link to="/profile" className="flex flex-col items-center">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
              location.pathname === '/profile' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted-foreground/30 text-foreground'
            }`}
          >
            {avatarLetter}
          </motion.div>
        </Link>
      </div>
    </nav>
  );
};
