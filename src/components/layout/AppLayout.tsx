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
    <div className="min-h-screen bg-background min-h-[100dvh]">
      <TopHeader 
        title={title}
        variant={headerVariant}
        leftIcon={headerLeftIcon}
        rightIcon={headerRightIcon}
        onLeftAction={onHeaderLeftAction}
        onRightAction={onHeaderRightAction}
        showActiveOC={showActiveOC}
      />
      
      <main className="relative pt-[calc(64px+env(safe-area-inset-top,0px))] pb-24 px-4 momentum-scroll">
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
