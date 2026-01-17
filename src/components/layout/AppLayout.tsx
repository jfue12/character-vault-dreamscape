import { ReactNode, useState } from 'react';
import { BottomNav } from './BottomNav';
import { TopHeader } from './TopHeader';
import { FloatingActionMenu } from './FloatingActionMenu';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
  showFab?: boolean;
  fabTo?: string;
  fabOnClick?: () => void;
  headerVariant?: 'default' | 'worlds' | 'profile' | 'simple';
  headerLeftIcon?: 'grid' | 'avatar' | 'add-friend' | 'back' | 'none';
  headerRightIcon?: 'search' | 'notifications' | 'menu' | 'more' | 'none';
  onHeaderLeftAction?: () => void;
  onHeaderRightAction?: () => void;
  showActiveOC?: boolean;
}

export const AppLayout = ({ 
  children, 
  title, 
  showNav = true,
  showFab = false,
  headerVariant = 'default',
  headerLeftIcon = 'none',
  headerRightIcon = 'none',
  onHeaderLeftAction,
  onHeaderRightAction,
  showActiveOC = false
}: AppLayoutProps) => {
  const [showCreateOC, setShowCreateOC] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <TopHeader 
        title={title}
        variant={headerVariant}
        leftIcon={headerLeftIcon}
        rightIcon={headerRightIcon}
        onLeftAction={onHeaderLeftAction}
        onRightAction={onHeaderRightAction}
        showActiveOC={showActiveOC}
      />
      
      <main className="relative pt-16 pb-20 px-4">
        {children}
      </main>

      {showFab && <FloatingActionMenu onCreateOC={() => setShowCreateOC(true)} />}

      {showNav && <BottomNav />}

      <CreateCharacterModal 
        open={showCreateOC} 
        onOpenChange={setShowCreateOC}
      />
    </div>
  );
};
