import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, Globe, MessageCircle, UserSearch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorldCard } from '@/components/worlds/WorldCard';
import { FriendRequestsLobby } from '@/components/messages/FriendRequestsLobby';
import { ConversationList } from '@/components/messages/ConversationList';
import { UserSearchPanel } from '@/components/hub/UserSearchPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_nsfw: boolean;
  is_public: boolean;
  tags: string[] | null;
  owner_id: string;
  member_count?: number;
}

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'my-worlds' | 'discover' | 'messages'>('my-worlds');
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loadingWorlds, setLoadingWorlds] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningWorldId, setJoiningWorldId] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWorlds();
    }
  }, [user, activeTab, profile]);

  const fetchWorlds = async () => {
    if (!user) return;
    setLoadingWorlds(true);

    if (activeTab === 'discover') {
      // Fetch public worlds user hasn't joined with member counts
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
        .limit(50);

      if (profile?.is_minor) {
        query = query.eq('is_nsfw', false);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        const discoverableWorlds = data.filter(w => !joinedWorldIds.includes(w.id));
        
        // Get member counts
        const worldsWithCounts = await Promise.all(
          discoverableWorlds.map(async (world) => {
            const { count } = await supabase
              .from('world_members')
              .select('*', { count: 'exact', head: true })
              .eq('world_id', world.id)
              .eq('is_banned', false);
            return { ...world, member_count: count || 0 };
          })
        );
        
        setWorlds(worldsWithCounts);
      }
    } else if (activeTab === 'my-worlds') {
      // Combined: Joined + Owned worlds
      const { data: memberData } = await supabase
        .from('world_members')
        .select('world_id')
        .eq('user_id', user.id)
        .eq('is_banned', false);

      const joinedWorldIds = memberData?.map(m => m.world_id) || [];
      
      if (joinedWorldIds.length > 0) {
        let query = supabase
          .from('worlds')
          .select('*')
          .in('id', joinedWorldIds)
          .order('created_at', { ascending: false });

        if (profile?.is_minor) {
          query = query.eq('is_nsfw', false);
        }

        const { data, error } = await query;
        if (!error && data) {
          // Get member counts
          const worldsWithCounts = await Promise.all(
            data.map(async (world) => {
              const { count } = await supabase
                .from('world_members')
                .select('*', { count: 'exact', head: true })
                .eq('world_id', world.id)
                .eq('is_banned', false);
              return { ...world, member_count: count || 0 };
            })
          );
          setWorlds(worldsWithCounts);
        }
      } else {
        setWorlds([]);
      }
    }

    setLoadingWorlds(false);
  };

  const handleWorldClick = async (worldId: string) => {
    if (activeTab === 'discover') {
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
      navigate(`/worlds/${worldId}`);
    }
  };

  const handleJoinWorld = async (worldId: string) => {
    if (!user) return;
    
    setJoiningWorldId(worldId);
    const targetWorld = worlds.find(w => w.id === worldId);
    
    const { error } = await supabase
      .from('world_members')
      .insert({
        world_id: worldId,
        user_id: user.id,
        role: 'member'
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to join world', variant: 'destructive' });
    } else {
      toast({ title: 'Joined!', description: 'You are now a member of this world' });
      
      if (targetWorld && targetWorld.owner_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: targetWorld.owner_id,
          type: 'world_join',
          title: 'New Member',
          body: `${profile?.username || 'Someone'} joined your world "${targetWorld.name}"`,
          data: { world_id: worldId, joiner_id: user.id }
        });
      }
      
      setWorlds(prev => prev.filter(w => w.id !== worldId));
    }
    
    setJoiningWorldId(null);
  };

  const handleConversationSelect = (friendshipId: string) => {
    navigate(`/dm/${friendshipId}`);
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
      <AppLayout title="Worlds">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Worlds"
      headerLeftIcon="none"
      headerRightIcon="notifications"
      showFab
      fabTo="/create-world"
    >
      <div className="max-w-lg mx-auto">
        {/* Tab Switcher - Pill Style */}
        <div className="flex gap-1.5 mb-5 p-1 bg-secondary/40 rounded-full">
          <button
            onClick={() => setActiveTab('my-worlds')}
            className={`tab-pill flex-1 flex items-center justify-center gap-1.5 ${
              activeTab === 'my-worlds' ? 'tab-pill-active' : 'tab-pill-inactive'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">My</span> Worlds
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`tab-pill flex-1 flex items-center justify-center gap-1.5 ${
              activeTab === 'discover' ? 'tab-pill-active' : 'tab-pill-inactive'
            }`}
          >
            <Search className="w-4 h-4" />
            Discover
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`tab-pill flex-1 flex items-center justify-center gap-1.5 ${
              activeTab === 'messages' ? 'tab-pill-active' : 'tab-pill-inactive'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            DMs
          </button>
        </div>

        {activeTab !== 'messages' && (
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

        {activeTab === 'messages' ? (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setShowUserSearch(!showUserSearch)}
              className="w-full justify-start gap-2"
            >
              <UserSearch className="w-4 h-4" />
              Find Users
            </Button>

            <UserSearchPanel 
              isOpen={showUserSearch}
              onClose={() => setShowUserSearch(false)}
            />

            <FriendRequestsLobby 
              key={refreshKey}
              onRequestHandled={() => setRefreshKey(k => k + 1)} 
            />

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
        ) : loadingWorlds ? (
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
                : activeTab === 'my-worlds' 
                  ? 'No worlds joined yet' 
                  : 'No public worlds to discover'}
            </p>
            {!searchQuery && activeTab === 'my-worlds' && (
              <button
                onClick={() => setActiveTab('discover')}
                className="text-primary hover:underline"
              >
                Discover worlds
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
                transition={{ delay: index * 0.05 }}
              >
                <WorldCard
                  world={world}
                  currentUserId={user?.id}
                  showJoinButton={activeTab === 'discover'}
                  isJoining={joiningWorldId === world.id}
                  onJoin={() => handleJoinWorld(world.id)}
                  onClick={() => handleWorldClick(world.id)}
                  memberCount={world.member_count}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
