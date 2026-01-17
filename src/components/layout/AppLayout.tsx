import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { TopHeader } from './TopHeader';
import { FloatingActionButton } from './FloatingActionButton';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
  showFab?: boolean;
  fabTo?: string;
  fabOnClick?: () => void;
  headerVariant?: 'default' | 'worlds' | 'profile' | 'simple';
  headerLeftIcon?: 'grid' | 'avatar' | 'add-friend' | 'none';
  headerRightIcon?: 'search' | 'notifications' | 'menu' | 'none';
  onHeaderLeftAction?: () => void;
  onHeaderRightAction?: () => void;
}

export const AppLayout = ({ 
  children, 
  title, 
  showNav = true,
  showFab = false,
  fabTo,
  fabOnClick,
  headerVariant = 'default',
  headerLeftIcon = 'none',
  headerRightIcon = 'none',
  onHeaderLeftAction,
  onHeaderRightAction
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <TopHeader 
        title={title}
        variant={headerVariant}
        leftIcon={headerLeftIcon}
        rightIcon={headerRightIcon}
        onLeftAction={onHeaderLeftAction}
        onRightAction={onHeaderRightAction}
      />
      
      <main className="relative pt-16 pb-20 px-4">
        {children}
      </main>

      {showFab && (fabTo || fabOnClick) && (
        <FloatingActionButton to={fabTo} onClick={fabOnClick} />
      )}

      {showNav && <BottomNav />}
    </div>
  );
};
