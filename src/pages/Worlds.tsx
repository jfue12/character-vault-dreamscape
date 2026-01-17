import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorldCard } from '@/components/worlds/WorldCard';
import { Globe } from 'lucide-react';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  is_public: boolean;
  is_nsfw: boolean;
  owner_id: string;
  created_at: string;
}

type TabType = 'worlds' | 'dms';

export default function Worlds() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loadingWorlds, setLoadingWorlds] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('worlds');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWorlds();
    }
  }, [user, profile]);

  const fetchWorlds = async () => {
    setLoadingWorlds(true);
    
    let query = supabase
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Filter NSFW content for minors
    if (profile?.is_minor) {
      query = query.eq('is_nsfw', false);
    }

    const { data, error } = await query;

    if (!error && data) {
      setWorlds(data);
    }
    setLoadingWorlds(false);
  };

  if (loading) {
    return (
      <AppLayout title="Worlds">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="MASCOT"
      headerLeftIcon="add-friend"
      headerRightIcon="notifications"
      showFab
      fabTo="/worlds/create"
    >
      <div className="max-w-lg mx-auto space-y-4">
        {/* Tab Switcher */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveTab('worlds')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'worlds'
                ? 'bg-background text-primary'
                : 'text-muted-foreground'
            }`}
          >
            worlds
          </button>
          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'dms'
                ? 'bg-background text-primary'
                : 'text-muted-foreground'
            }`}
          >
            Direct Messages
          </button>
        </div>

        {/* Content */}
        {activeTab === 'worlds' ? (
          <>
            {loadingWorlds ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : worlds.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No worlds yet</p>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {worlds.map((world, index) => (
                  <WorldCard
                    key={world.id}
                    world={world}
                    index={index}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-muted-foreground">No direct messages yet</p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
