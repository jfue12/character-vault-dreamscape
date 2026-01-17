import { UserPlus, Bell, MoreHorizontal, ChevronLeft, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TopHeaderProps {
  title?: string;
  variant?: 'default' | 'worlds' | 'profile' | 'simple' | 'room';
  leftIcon?: 'grid' | 'avatar' | 'add-friend' | 'back' | 'none';
  rightIcon?: 'search' | 'notifications' | 'menu' | 'more' | 'none';
  onLeftAction?: () => void;
  onRightAction?: () => void;
  subtitle?: string;
  onTitleClick?: () => void;
  showVerified?: boolean;
}

export const TopHeader = ({
  title,
  variant = 'default',
  leftIcon = 'none',
  rightIcon = 'none',
  onLeftAction,
  onRightAction,
  subtitle,
  onTitleClick,
  showVerified = true
}: TopHeaderProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const displayTitle = title || (profile?.username ? `@${profile.username}` : 'MASCOT');

  const renderLeftIcon = () => {
    switch (leftIcon) {
      case 'add-friend':
        return (
          <button 
            onClick={onLeftAction}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        );
      case 'back':
        return (
          <button 
            onClick={onLeftAction || (() => navigate(-1))}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        );
      case 'avatar':
        return (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
            {profile?.username?.[0]?.toUpperCase() || 'M'}
          </div>
        );
      default:
        return <div className="w-10" />;
    }
  };

  const renderRightIcon = () => {
    switch (rightIcon) {
      case 'notifications':
        return (
          <button 
            onClick={onRightAction}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors relative"
          >
            <Bell className="w-5 h-5" />
          </button>
        );
      case 'more':
        return (
          <button 
            onClick={onRightAction}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        );
      default:
        return <div className="w-10" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        {renderLeftIcon()}
        
        <button 
          onClick={onTitleClick}
          className="flex items-center gap-1.5"
          disabled={!onTitleClick}
        >
          <span className="font-semibold text-foreground">
            {displayTitle}
          </span>
          {showVerified && profile?.username && (
            <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
          )}
        </button>

        {renderRightIcon()}
      </div>
    </header>
  );
};
