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

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loadingWorlds, setLoadingWorlds] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDiscoverWorlds();
    }
  }, [user, profile]);

  const fetchDiscoverWorlds = async () => {
    // Build query for public worlds
    let query = supabase
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

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
      <AppLayout title="Discovery">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      headerLeftIcon="add-friend"
      headerRightIcon="notifications"
      showFab
      showActiveOC
    >
      <div className="max-w-lg mx-auto">
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
            <p className="text-muted-foreground mb-4">No worlds to discover yet</p>
            <button
              onClick={() => navigate('/create-world')}
              className="text-primary hover:underline"
            >
              Create the first world
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
