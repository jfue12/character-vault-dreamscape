import { Bell, MoreHorizontal, Search, LayoutGrid, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TopHeaderProps {
  title?: string;
  variant?: 'default' | 'worlds' | 'profile' | 'simple';
  leftIcon?: 'grid' | 'avatar' | 'add-friend' | 'none';
  rightIcon?: 'search' | 'notifications' | 'menu' | 'none';
  onLeftAction?: () => void;
  onRightAction?: () => void;
}

export const TopHeader = ({ 
  title = 'OC Vault', 
  variant = 'default',
  leftIcon = 'none',
  rightIcon = 'none',
  onLeftAction,
  onRightAction 
}: TopHeaderProps) => {
  const { profile } = useAuth();
  const avatarLetter = profile?.username?.charAt(0)?.toUpperCase() || 'M';

  const renderLeftIcon = () => {
    switch (leftIcon) {
      case 'grid':
        return (
          <Button variant="ghost" size="icon" onClick={onLeftAction} className="text-foreground">
            <LayoutGrid className="w-5 h-5" />
          </Button>
        );
      case 'avatar':
        return (
          <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
              {avatarLetter}
            </div>
          </Link>
        );
      case 'add-friend':
        return (
          <Button variant="ghost" size="icon" onClick={onLeftAction} className="text-foreground">
            <UserPlus className="w-5 h-5" />
          </Button>
        );
      default:
        return <div className="w-10" />;
    }
  };

  const renderRightIcon = () => {
    switch (rightIcon) {
      case 'search':
        return (
          <Button variant="ghost" size="icon" onClick={onRightAction} className="text-foreground">
            <Search className="w-5 h-5" />
          </Button>
        );
      case 'notifications':
        return (
          <Button variant="ghost" size="icon" onClick={onRightAction} className="text-foreground relative">
            <Bell className="w-5 h-5" />
          </Button>
        );
      case 'menu':
        return (
          <Button variant="ghost" size="icon" onClick={onRightAction} className="text-foreground">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        );
      default:
        return <div className="w-10" />;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {renderLeftIcon()}
        
        <h1 className="font-display text-lg font-bold text-foreground">
          {title}
        </h1>
        
        {renderRightIcon()}
      </div>
    </header>
  );
};
