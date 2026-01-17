import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorldCard } from '@/components/worlds/WorldCard';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_nsfw: boolean;
  tags: string[] | null;
  owner_id: string;
}

export default function Worlds() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'joined' | 'owned'>('joined');
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loadingWorlds, setLoadingWorlds] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWorlds();
    }
  }, [user, activeTab]);

  const fetchWorlds = async () => {
    if (!user) return;
    setLoadingWorlds(true);

    if (activeTab === 'owned') {
      // Fetch worlds owned by user
      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setWorlds(data);
      }
    } else {
      // Fetch worlds user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('world_members')
        .select('world_id')
        .eq('user_id', user.id)
        .eq('is_banned', false);

      if (!memberError && memberData) {
        const worldIds = memberData.map(m => m.world_id);
        
        if (worldIds.length > 0) {
          let query = supabase
            .from('worlds')
            .select('*')
            .in('id', worldIds)
            .order('created_at', { ascending: false });

          // Filter NSFW for minors
          if (profile?.is_minor) {
            query = query.eq('is_nsfw', false);
          }

          const { data, error } = await query;
          if (!error && data) {
            setWorlds(data);
          }
        } else {
          setWorlds([]);
        }
      }
    }

    setLoadingWorlds(false);
  };

  if (loading) {
    return (
      <AppLayout title="Stories">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Stories"
      headerLeftIcon="add-friend"
      headerRightIcon="notifications"
      showFab
      fabTo="/create-world"
    >
      <div className="max-w-lg mx-auto">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('joined')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              activeTab === 'joined'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Joined Worlds
          </button>
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              activeTab === 'owned'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            My Worlds
          </button>
        </div>

        {/* Worlds List */}
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
            <p className="text-muted-foreground mb-4">
              {activeTab === 'joined' ? 'No worlds joined yet' : 'No worlds created yet'}
            </p>
            <button
              onClick={() => activeTab === 'joined' ? navigate('/') : navigate('/create-world')}
              className="text-primary hover:underline"
            >
              {activeTab === 'joined' ? 'Discover worlds' : 'Create a world'}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {worlds.map((world, index) => (
              <motion.div
                key={world.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <WorldCard
                  world={world}
                  onClick={() => navigate(`/worlds/${world.id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
