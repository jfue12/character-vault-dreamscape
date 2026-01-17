import { UserPlus, Bell, Menu, ChevronLeft, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TopHeaderProps {
  title?: string;
  variant?: 'default' | 'worlds' | 'profile' | 'simple' | 'room';
  leftIcon?: 'grid' | 'avatar' | 'add-friend' | 'back' | 'none';
  rightIcon?: 'search' | 'notifications' | 'menu' | 'none';
  onLeftAction?: () => void;
  onRightAction?: () => void;
  subtitle?: string;
  onTitleClick?: () => void;
}

export const TopHeader = ({
  title,
  variant = 'default',
  leftIcon = 'none',
  rightIcon = 'none',
  onLeftAction,
  onRightAction,
  subtitle,
  onTitleClick
}: TopHeaderProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const renderLeftIcon = () => {
    switch (leftIcon) {
      case 'add-friend':
        return (
          <button 
            onClick={onLeftAction}
            className="p-2 text-foreground hover:text-primary transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        );
      case 'back':
        return (
          <button 
            onClick={onLeftAction || (() => navigate(-1))}
            className="p-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        );
      case 'avatar':
        return (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
            {profile?.username?.[0]?.toUpperCase() || 'M'}
          </div>
        );
      default:
        return <div className="w-8" />;
    }
  };

  const renderRightIcon = () => {
    switch (rightIcon) {
      case 'notifications':
        return (
          <button 
            onClick={onRightAction}
            className="p-2 text-foreground hover:text-primary transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>
        );
      case 'menu':
        return (
          <button 
            onClick={onRightAction}
            className="p-2 text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        );
      default:
        return <div className="w-8" />;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {renderLeftIcon()}
        
        <button 
          onClick={onTitleClick}
          className="flex flex-col items-center"
          disabled={!onTitleClick}
        >
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-lg text-foreground">
              {title || profile?.username || 'MASCOT'}
            </h1>
            {profile?.username && !subtitle && (
              <span className="text-primary text-sm">✓</span>
            )}
            {onTitleClick && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </button>

        {renderRightIcon()}
      </div>
    </header>
  );
};
