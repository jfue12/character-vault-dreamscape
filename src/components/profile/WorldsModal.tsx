import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorldItem {
  id: string;
  name: string;
  image_url: string | null;
  member_count?: number;
}

interface WorldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const WorldsModal = ({ isOpen, onClose, userId }: WorldsModalProps) => {
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<WorldItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchWorlds();
    }
  }, [isOpen, userId]);

  const fetchWorlds = async () => {
    setLoading(true);
    
    // Get worlds the user is a member of
    const { data: memberships } = await supabase
      .from('world_members')
      .select('world_id')
      .eq('user_id', userId)
      .eq('is_banned', false);
    
    if (memberships && memberships.length > 0) {
      const worldIds = memberships.map(m => m.world_id);
      
      const { data: worldsData } = await supabase
        .from('worlds')
        .select('id, name, image_url')
        .in('id', worldIds);
      
      if (worldsData) {
        // Get member counts for each world
        const worldsWithCounts: WorldItem[] = [];
        for (const w of worldsData) {
          const { count } = await supabase
            .from('world_members')
            .select('*', { count: 'exact', head: true })
            .eq('world_id', w.id)
            .eq('is_banned', false);
          
          worldsWithCounts.push({
            ...w,
            member_count: count || 0
          });
        }
        setWorlds(worldsWithCounts);
      }
    } else {
      setWorlds([]);
    }
    
    setLoading(false);
  };

  const handleWorldClick = async (worldId: string) => {
    // Get first room
    const { data: rooms } = await supabase
      .from('world_rooms')
      .select('id')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true })
      .limit(1);
    
    onClose();
    
    if (rooms && rooms.length > 0) {
      navigate(`/worlds/${worldId}/rooms/${rooms[0].id}`);
    } else {
      navigate(`/worlds/${worldId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card border border-border rounded-xl w-full max-w-sm max-h-[60vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Worlds</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : worlds.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Not a member of any worlds yet
              </div>
            ) : (
              <div className="p-2">
                {worlds.map(w => (
                  <button
                    key={w.id}
                    onClick={() => handleWorldClick(w.id)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/40 to-purple-900/40 flex items-center justify-center flex-shrink-0">
                      {w.image_url ? (
                        <img src={w.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-foreground">
                          {w.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {w.member_count} members
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
