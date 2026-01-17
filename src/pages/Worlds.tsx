import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorldCard } from '@/components/worlds/WorldCard';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_nsfw: boolean;
  is_public: boolean;
  tags: string[] | null;
  owner_id: string;
}

export default function Worlds() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'joined' | 'owned' | 'discover'>('joined');
  const [worlds, setWorlds] = useState<World[]>([]);
  const [joinedWorldIds, setJoinedWorldIds] = useState<Set<string>>(new Set());
  const [loadingWorlds, setLoadingWorlds] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningWorldId, setJoiningWorldId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchJoinedWorldIds();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWorlds();
    }
  }, [user, activeTab, joinedWorldIds]);

  const fetchJoinedWorldIds = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('world_members')
      .select('world_id')
      .eq('user_id', user.id)
      .eq('is_banned', false);
    
    if (data) {
      setJoinedWorldIds(new Set(data.map(m => m.world_id)));
    }
  };

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
    } else if (activeTab === 'joined') {
      // Fetch worlds user is a member of
      if (joinedWorldIds.size > 0) {
        let query = supabase
          .from('worlds')
          .select('*')
          .in('id', Array.from(joinedWorldIds))
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
    } else {
      // Discover tab - fetch public worlds user hasn't joined
      let query = supabase
        .from('worlds')
        .select('*')
        .eq('is_public', true)
        .neq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter NSFW for minors
      if (profile?.is_minor) {
        query = query.eq('is_nsfw', false);
      }

      const { data, error } = await query;
      if (!error && data) {
        // Filter out already joined worlds
        const discoverableWorlds = data.filter(w => !joinedWorldIds.has(w.id));
        setWorlds(discoverableWorlds);
      }
    }

    setLoadingWorlds(false);
  };

  const handleJoinWorld = async (worldId: string) => {
    if (!user) return;
    
    setJoiningWorldId(worldId);
    
    const { error } = await supabase
      .from('world_members')
      .insert({
        world_id: worldId,
        user_id: user.id,
        role: 'member'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to join world',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Joined!',
        description: 'You are now a member of this world'
      });
      
      // Update joined worlds set
      setJoinedWorldIds(prev => new Set([...prev, worldId]));
      
      // Remove from discover list
      setWorlds(prev => prev.filter(w => w.id !== worldId));
    }
    
    setJoiningWorldId(null);
  };

  const filteredWorlds = worlds.filter(world => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      world.name.toLowerCase().includes(query) ||
      world.description?.toLowerCase().includes(query) ||
      world.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

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
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('joined')}
            className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
              activeTab === 'joined'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Joined
          </button>
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
              activeTab === 'owned'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            My Worlds
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
              activeTab === 'discover'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Discover
          </button>
        </div>

        {/* Search (only for discover tab) */}
        {activeTab === 'discover' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search worlds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Worlds List */}
        {loadingWorlds ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredWorlds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-muted-foreground mb-4">
              {activeTab === 'joined' 
                ? 'No worlds joined yet' 
                : activeTab === 'owned' 
                  ? 'No worlds created yet'
                  : searchQuery 
                    ? 'No worlds match your search'
                    : 'No new worlds to discover'}
            </p>
            {activeTab === 'joined' && (
              <button
                onClick={() => setActiveTab('discover')}
                className="text-primary hover:underline"
              >
                Discover worlds to join
              </button>
            )}
            {activeTab === 'owned' && (
              <button
                onClick={() => navigate('/create-world')}
                className="text-primary hover:underline"
              >
                Create a world
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredWorlds.map((world, index) => (
              <motion.div
                key={world.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <WorldCard
                  world={world}
                  currentUserId={user?.id}
                  showJoinButton={activeTab === 'discover'}
                  isJoining={joiningWorldId === world.id}
                  onJoin={() => handleJoinWorld(world.id)}
                  onClick={() => {
                    if (activeTab !== 'discover') {
                      navigate(`/worlds/${world.id}`);
                    }
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
