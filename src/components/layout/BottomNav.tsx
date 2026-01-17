import { Layers, BookOpen, Hash, MessageCircle } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const BottomNav = () => {
  const location = useLocation();
  const { profile } = useAuth();

  const navItems = [
    { icon: Layers, label: 'Discovery', path: '/' },
    { icon: BookOpen, label: 'Stories', path: '/worlds' },
    { icon: Hash, label: 'Plots', path: '/plots' },
    { icon: MessageCircle, label: 'Chat', path: '/messages' },
  ];

  // Hide bottom nav on chat room pages
  if (location.pathname.includes('/rooms/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-0.5 py-1.5 px-4 min-w-[60px]"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2 : 1.5}
              />
            </NavLink>
          );
        })}
        
        {/* Profile Avatar */}
        <NavLink
          to="/profile"
          className="flex flex-col items-center gap-0.5 py-1.5 px-4"
        >
          <div className={`w-7 h-7 rounded-full overflow-hidden transition-all ${
            location.pathname === '/profile' 
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' 
              : ''
          }`}>
            <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center text-xs font-bold text-white">
              {profile?.username?.[0]?.toUpperCase() || 'M'}
            </div>
          </div>
        </NavLink>
      </div>
    </nav>
  );
};
