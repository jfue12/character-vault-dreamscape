import { Globe, MessageCircle, Plus, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { icon: Globe, label: 'Worlds', path: '/worlds' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Plus, label: 'Create', path: '/create', isCenter: true },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4">
        <div className="glass-card p-2 flex items-center justify-around">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <Link key={item.path} to={item.path} className="relative -mt-8">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-purple via-neon-pink to-neon-blue flex items-center justify-center neon-border animate-pulse-neon"
                  >
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link key={item.path} to={item.path} className="relative flex flex-col items-center gap-1 py-2 px-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <Icon 
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-primary neon-glow' : 'text-muted-foreground'
                    }`} 
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
                <span className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
