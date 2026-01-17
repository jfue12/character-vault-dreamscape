import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { RoomCard } from '@/components/worlds/RoomCard';
import { ManageWorldModal } from '@/components/worlds/ManageWorldModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Settings, Users, Lock, AlertTriangle, 
  LogIn, LogOut, Globe, ScrollText
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
  profiles: {
    username: string | null;
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
  const [showRules, setShowRules] = useState(false);

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
      // Filter staff-only rooms for non-staff
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
      .select('*, profiles(username)')
      .eq('world_id', worldId)
      .order('role', { ascending: true });

    if (data) setMembers(data);
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
            
            {/* Back button */}
            <button
              onClick={() => navigate('/worlds')}
              className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Badges */}
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
                
                {/* Tags */}
                {world.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {world.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
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

              {/* Actions */}
              <div className="flex gap-2">
                {world.rules && (
                  <Button variant="ghost" size="icon" onClick={() => setShowRules(!showRules)}>
                    <ScrollText className="w-5 h-5" />
                  </Button>
                )}
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

            {/* Rules */}
            {showRules && world.rules && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 rounded-lg bg-secondary"
              >
                <h4 className="font-semibold text-foreground mb-2">World Rules</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{world.rules}</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Rooms */}
        {isMember ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">Areas</h3>
              {isOwner && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsManageModalOpen(true)}
                >
                  Manage Rooms
                </Button>
              )}
            </div>

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
