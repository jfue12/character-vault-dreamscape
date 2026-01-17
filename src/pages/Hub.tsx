import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorldCard } from '@/components/worlds/WorldCard';
import { FriendRequestsLobby } from '@/components/messages/FriendRequestsLobby';
import { ConversationList } from '@/components/messages/ConversationList';
import { Globe, MessageCircle, Compass, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

export default function Hub() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'worlds' | 'messages'>('worlds');
  const [worldsTab, setWorldsTab] = useState<'joined' | 'owned' | 'discover'>('joined');
  const [worlds, setWorlds] = useState<World[]>([]);
  const [joinedWorldIds, setJoinedWorldIds] = useState<Set<string>>(new Set());
  const [loadingWorlds, setLoadingWorlds] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [joiningWorldId, setJoiningWorldId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (user && activeTab === 'worlds') {
      fetchWorlds();
    }
  }, [user, worldsTab, activeTab, joinedWorldIds]);

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

    if (worldsTab === 'owned') {
      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setWorlds(data);
      }
    } else if (worldsTab === 'discover') {
      // Fetch public worlds user hasn't joined
      const { data: memberData } = await supabase
        .from('world_members')
        .select('world_id')
        .eq('user_id', user.id);

      const joinedWorldIds = memberData?.map(m => m.world_id) || [];

      let query = supabase
        .from('worlds')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      // Filter NSFW for minors
      if (profile?.is_minor) {
        query = query.eq('is_nsfw', false);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        // Filter out already joined worlds
        const discoverableWorlds = data.filter(w => !joinedWorldIds.includes(w.id));
        setWorlds(discoverableWorlds);
      }
    } else {
      // Joined worlds
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

  // Navigate directly to the first room of a world
  const handleWorldClick = async (worldId: string) => {
    // For discover tab, go to world detail to join
    if (worldsTab === 'discover') {
      navigate(`/worlds/${worldId}`);
      return;
    }

    const { data: rooms } = await supabase
      .from('world_rooms')
      .select('id')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true })
      .limit(1);

    if (rooms && rooms.length > 0) {
      navigate(`/worlds/${worldId}/rooms/${rooms[0].id}`);
    } else {
      // Fallback to world detail if no rooms exist
      navigate(`/worlds/${worldId}`);
    }
  };

  const handleJoinWorld = async (worldId: string) => {
    if (!user) return;
    
    setJoiningWorldId(worldId);
    
    // Get world info for notification
    const targetWorld = worlds.find(w => w.id === worldId);
    
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
      
      // Notify the world owner
      if (targetWorld && targetWorld.owner_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: targetWorld.owner_id,
          type: 'world_join',
          title: 'New Member',
          body: `${profile?.username || 'Someone'} joined your world "${targetWorld.name}"`,
          data: { world_id: worldId, joiner_id: user.id }
        });
      }
      
      // Update joined worlds set
      setJoinedWorldIds(prev => new Set([...prev, worldId]));
      
      // Remove from discover list
      setWorlds(prev => prev.filter(w => w.id !== worldId));
    }
    
    setJoiningWorldId(null);
  };

  const handleConversationSelect = (friendshipId: string, _friendId: string) => {
    navigate(`/dm/${friendshipId}`);
  };

  // Filter worlds based on search query
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
      <AppLayout title="Hub">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Hub"
      headerLeftIcon="none"
      headerRightIcon="notifications"
      showFab
      fabTo="/create-world"
    >
      <div className="max-w-lg mx-auto">
        {/* Main Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('worlds')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'worlds'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="w-4 h-4" />
            Worlds
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'messages'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Messages
          </button>
        </div>

        {activeTab === 'worlds' ? (
          <>
            {/* Worlds Sub-tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setWorldsTab('joined')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
                  worldsTab === 'joined'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Joined
              </button>
              <button
                onClick={() => setWorldsTab('owned')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
                  worldsTab === 'owned'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                My Worlds
              </button>
              <button
                onClick={() => setWorldsTab('discover')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                  worldsTab === 'discover'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Compass className="w-3 h-3" />
                Discover
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search worlds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

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
                  {searchQuery
                    ? 'No worlds match your search'
                    : worldsTab === 'joined' 
                      ? 'No worlds joined yet' 
                      : worldsTab === 'owned'
                        ? 'No worlds created yet'
                        : 'No public worlds to discover'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => {
                      if (worldsTab === 'joined') {
                        setWorldsTab('discover');
                      } else if (worldsTab === 'owned') {
                        navigate('/create-world');
                      }
                    }}
                    className="text-primary hover:underline"
                  >
                    {worldsTab === 'joined' 
                      ? 'Discover worlds' 
                      : worldsTab === 'owned'
                        ? 'Create a world'
                        : null}
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
                      showJoinButton={worldsTab === 'discover'}
                      isJoining={joiningWorldId === world.id}
                      onJoin={() => handleJoinWorld(world.id)}
                      onClick={() => handleWorldClick(world.id)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Friend Requests Lobby */}
            <FriendRequestsLobby 
              key={refreshKey}
              onRequestHandled={() => setRefreshKey(k => k + 1)} 
            />

            {/* Conversations */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Conversations
              </h3>
              
              <ConversationList 
                key={`convos-${refreshKey}`}
                onSelectConversation={handleConversationSelect} 
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}