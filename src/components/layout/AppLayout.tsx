import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { TopHeader } from './TopHeader';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
}

export const AppLayout = ({ children, title, showNav = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-blue/5 rounded-full blur-3xl animate-glow" />
      </div>

      <TopHeader title={title} />
      
      <main className="relative pt-24 pb-28 px-4">
        {children}
      </main>

      {showNav && <BottomNav />}
    </div>
  );
};
