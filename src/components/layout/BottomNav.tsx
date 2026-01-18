import { Globe, Hash, Rss, Home } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export const BottomNav = () => {
  const location = useLocation();
  const { profile } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Rss, label: 'Feed', path: '/feed' },
    { icon: Hash, label: 'Plots', path: '/plots' },
  ];

  // Hide bottom nav on chat room pages
  if (location.pathname.includes('/rooms/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 py-2 px-5 min-w-[64px] group"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary/15 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 transition-all relative z-10 ${
                  isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground'
                }`}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className={`text-[10px] font-medium relative z-10 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
        
        {/* Profile Avatar */}
        <NavLink
          to="/profile"
          className="relative flex flex-col items-center gap-1 py-2 px-5 group"
        >
          {location.pathname === '/profile' && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-primary/15 rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <div className={`w-7 h-7 rounded-full overflow-hidden transition-all relative z-10 ${
            location.pathname === '/profile' 
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110' 
              : 'group-hover:ring-2 group-hover:ring-muted'
          }`}>
            <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center text-xs font-bold text-white">
              {profile?.username?.[0]?.toUpperCase() || 'M'}
            </div>
          </div>
          <span className={`text-[10px] font-medium relative z-10 ${
            location.pathname === '/profile' ? 'text-primary' : 'text-muted-foreground'
          }`}>
            Profile
          </span>
        </NavLink>
      </div>
    </nav>
  );
};
