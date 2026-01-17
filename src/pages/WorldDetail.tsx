import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { RoomCard } from '@/components/worlds/RoomCard';
import { ManageWorldModal } from '@/components/worlds/ManageWorldModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Settings, Users, Lock, AlertTriangle, 
  LogIn, LogOut, Globe, ScrollText, BookOpen
} from 'lucide-react';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  rules: string | null;
  is_public: boolean;
  is_nsfw: boolean;
  owner_id: string;
  lore_content: string | null;
  lore_image_url: string | null;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
  sort_order: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_banned: boolean;
  timeout_until: string | null;
  active_character_id: string | null;
  profiles: {
    username: string | null;
  } | null;
  active_character?: {
    name: string;
    avatar_url: string | null;
  } | null;
}

export default function WorldDetail() {
  const { worldId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [world, setWorld] = useState<World | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membership, setMembership] = useState<Member | null>(null);
  const [loadingWorld, setLoadingWorld] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'lore' | 'members'>('rooms');

  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin';
  const isStaff = isOwner || isAdmin;
  const isMember = !!membership && !membership.is_banned;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (worldId && user) {
      fetchWorld();
      fetchMembership();
    }
  }, [worldId, user]);

  useEffect(() => {
    if (isMember && worldId) {
      fetchRooms();
      fetchMembers();
    }
  }, [isMember, worldId]);

  const fetchWorld = async () => {
    if (!worldId) return;

    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('id', worldId)
      .maybeSingle();

    if (error || !data) {
      toast({ title: 'World not found', variant: 'destructive' });
      navigate('/worlds');
      return;
    }

    setWorld(data);
    setLoadingWorld(false);
  };

  const fetchMembership = async () => {
    if (!worldId || !user) return;

    const { data } = await supabase
      .from('world_members')
      .select('*, profiles(username)')
      .eq('world_id', worldId)
      .eq('user_id', user.id)
      .maybeSingle();

    setMembership(data);
  };

  const fetchRooms = async () => {
    if (!worldId) return;

    const { data } = await supabase
      .from('world_rooms')
      .select('*')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true });

    if (data) {
      const filteredRooms = isStaff 
        ? data 
        : data.filter(room => !room.is_staff_only);
      setRooms(filteredRooms);
    }
  };

  const fetchMembers = async () => {
    if (!worldId) return;

    const { data } = await supabase
      .from('world_members')
      .select(`
        *,
        profiles(username),
        active_character:characters!world_members_active_character_id_fkey(name, avatar_url)
      `)
      .eq('world_id', worldId)
      .eq('is_banned', false)
      .order('role', { ascending: true });

    if (data) {
      const processedMembers = data.map(m => ({
        ...m,
        active_character: Array.isArray(m.active_character) 
          ? m.active_character[0] 
          : m.active_character
      }));
      setMembers(processedMembers);
    }
  };

  const handleJoin = async () => {
    if (!worldId || !user) return;

    const { error } = await supabase.from('world_members').insert({
      world_id: worldId,
      user_id: user.id,
      role: 'member',
    });

    if (error) {
      toast({ title: 'Failed to join', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome!', description: `You've joined ${world?.name}` });
      fetchMembership();
    }
  };

  const handleLeave = async () => {
    if (!worldId || !user || isOwner) return;

    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('world_id', worldId)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Failed to leave', variant: 'destructive' });
    } else {
      toast({ title: 'Left world' });
      setMembership(null);
      navigate('/worlds');
    }
  };

  if (loadingWorld || loading) {
    return (
      <AppLayout title="Loading..." showNav={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!world) return null;

  return (
    <AppLayout title={world.name} showNav={false}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          {/* Cover */}
          <div className="h-48 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 relative">
            {world.image_url && (
              <img src={world.image_url} alt={world.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            
            <button
              onClick={() => navigate('/worlds')}
              className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="absolute top-4 right-4 flex gap-2">
              {world.is_nsfw && (
                <span className="px-2 py-1 rounded-full bg-destructive/80 backdrop-blur text-destructive-foreground text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 18+
                </span>
              )}
              {!world.is_public && (
                <span className="px-2 py-1 rounded-full bg-background/80 backdrop-blur text-foreground text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-6 -mt-12 relative">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                  {world.name}
                </h1>
                {world.description && (
                  <p className="text-muted-foreground mb-4">{world.description}</p>
                )}
                
                {world.tags && world.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {world.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {members.length} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {rooms.length} rooms
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {isOwner && (
                  <Button variant="ghost" size="icon" onClick={() => setIsManageModalOpen(true)}>
                    <Settings className="w-5 h-5" />
                  </Button>
                )}
                {!isMember ? (
                  <Button onClick={handleJoin} className="bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground">
                    <LogIn className="w-4 h-4 mr-2" />
                    Join
                  </Button>
                ) : !isOwner && (
                  <Button variant="secondary" onClick={handleLeave}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs for Rooms, Lore, Members */}
        {isMember ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full bg-secondary mb-4">
                <TabsTrigger value="rooms" className="flex-1">
                  <Globe className="w-4 h-4 mr-2" /> Rooms
                </TabsTrigger>
                <TabsTrigger value="lore" className="flex-1">
                  <BookOpen className="w-4 h-4 mr-2" /> Lore
                </TabsTrigger>
                <TabsTrigger value="members" className="flex-1">
                  <Users className="w-4 h-4 mr-2" /> Members
                </TabsTrigger>
              </TabsList>

              {/* Rooms Tab */}
              <TabsContent value="rooms" className="space-y-4">
                {isOwner && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsManageModalOpen(true)}
                    className="w-full"
                  >
                    Manage Rooms
                  </Button>
                )}

                {rooms.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No rooms yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {rooms.map((room, index) => (
                      <RoomCard key={room.id} room={room} index={index} worldId={worldId!} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Lore Tab */}
              <TabsContent value="lore" className="space-y-4">
                <div className="glass-card overflow-hidden">
                  {world.lore_image_url && (
                    <div className="h-48 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20">
                      <img 
                        src={world.lore_image_url} 
                        alt="Lore" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    {world.lore_content ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-muted-foreground">
                          {world.lore_content}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No lore added yet</p>
                        {isOwner && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Add world lore in the settings
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rules */}
                {world.rules && (
                  <div className="glass-card p-6">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-primary" />
                      World Rules
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {world.rules}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      {member.active_character?.avatar_url ? (
                        <img 
                          src={member.active_character.avatar_url} 
                          alt={member.active_character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {member.active_character?.name?.[0] || member.profiles?.username?.[0] || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {member.active_character?.name || member.profiles?.username || 'Unknown'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          member.role === 'owner' ? 'bg-primary text-primary-foreground' :
                          member.role === 'admin' ? 'bg-accent text-accent-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {member.role}
                        </span>
                      </div>
                      {member.active_character && (
                        <p className="text-xs text-muted-foreground">
                          @{member.profiles?.username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 text-center"
          >
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Join to explore</h4>
            <p className="text-muted-foreground mb-4">
              Become a member to see rooms and participate in roleplay
            </p>
            <Button onClick={handleJoin} className="bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground">
              <LogIn className="w-4 h-4 mr-2" />
              Join World
            </Button>
          </motion.div>
        )}
      </div>

      {isOwner && (
        <ManageWorldModal
          open={isManageModalOpen}
          onOpenChange={setIsManageModalOpen}
          world={world}
          rooms={rooms}
          members={members}
          onUpdate={() => {
            fetchWorld();
            fetchRooms();
            fetchMembers();
          }}
        />
      )}
    </AppLayout>
  );
}