import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Lock, MessageCircle } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
  world_id: string;
}

interface World {
  id: string;
  name: string;
}

export default function RoomDetail() {
  const { worldId, roomId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (roomId && worldId && user) {
      fetchRoom();
      fetchWorld();
    }
  }, [roomId, worldId, user]);

  const fetchRoom = async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('world_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (error || !data) {
      toast({ title: 'Room not found', variant: 'destructive' });
      navigate(`/worlds/${worldId}`);
      return;
    }

    setRoom(data);
    setLoadingRoom(false);
  };

  const fetchWorld = async () => {
    if (!worldId) return;

    const { data } = await supabase
      .from('worlds')
      .select('id, name')
      .eq('id', worldId)
      .maybeSingle();

    if (data) setWorld(data);
  };

  if (loadingRoom || loading) {
    return (
      <AppLayout title="Loading..." showNav={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      {room.background_url && (
        <div 
          className="fixed inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${room.background_url})` }}
        />
      )}
      
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-safe">
        <div className="mx-4 mt-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/worlds/${worldId}`)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  {room.name}
                  {room.is_staff_only && <Lock className="w-4 h-4 text-accent" />}
                </h1>
                {world && (
                  <p className="text-sm text-muted-foreground">{world.name}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Users className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-28 pb-24 px-4 min-h-screen flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              {room.name}
            </h2>
            {room.description && (
              <p className="text-muted-foreground mb-6">{room.description}</p>
            )}
            <div className="bg-secondary rounded-lg p-6">
              <p className="text-muted-foreground">
                Roleplay messaging coming soon! This is where characters will interact and stories unfold.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
