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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 py-2 px-3"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] ${
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
        
        {/* Profile with M logo */}
        <NavLink
          to="/profile"
          className="flex flex-col items-center gap-1 py-2 px-3"
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            location.pathname === '/profile' 
              ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' 
              : 'bg-secondary text-muted-foreground'
          }`}>
            {profile?.username?.[0]?.toUpperCase() || 'M'}
          </div>
          <span className={`text-[10px] ${
            location.pathname === '/profile' ? 'text-primary font-medium' : 'text-muted-foreground'
          }`}>
            Profile
          </span>
        </NavLink>
      </div>
    </nav>
  );
};
