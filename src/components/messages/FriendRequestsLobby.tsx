import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Scroll } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface RoleplayProposal {
  id: string;
  requester_id: string;
  starter_message: string;
  created_at: string;
  requester_character?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  requester_profile?: {
    username: string | null;
  } | null;
}

interface FriendRequestsLobbyProps {
  onRequestHandled: () => void;
}

export const FriendRequestsLobby = ({ onRequestHandled }: FriendRequestsLobbyProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RoleplayProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Subscribe to realtime updates for new friendship requests
      const channel = supabase
        .channel('friendship-lobby-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            // Refetch if the current user is the addressee (receiving request)
            if (newData?.addressee_id === user.id || oldData?.addressee_id === user.id) {
              fetchRequests();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        starter_message,
        created_at,
        requester_character:characters!friendships_requester_character_id_fkey(id, name, avatar_url)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch requester profiles separately
      const requestsWithProfiles = await Promise.all(
        data.map(async (req) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', req.requester_id)
            .single();
          
          return {
            ...req,
            requester_character: Array.isArray(req.requester_character) 
              ? req.requester_character[0] 
              : req.requester_character,
            requester_profile: profileData,
          };
        })
      );
      setRequests(requestsWithProfiles);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'Failed to accept proposal', variant: 'destructive' });
    } else {
      toast({ title: 'Story begins! Roleplay accepted.' });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      onRequestHandled();
    }
  };

  const handleDecline = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'Failed to decline proposal', variant: 'destructive' });
    } else {
      toast({ title: 'Roleplay proposal declined' });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      onRequestHandled();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Scroll className="w-5 h-5 text-primary" />
          Roleplay Proposals
        </h3>
        <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {requests.length} awaiting
        </span>
      </div>
      
      <AnimatePresence>
        {requests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="glass-card p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                {request.requester_character?.avatar_url ? (
                  <img 
                    src={request.requester_character.avatar_url} 
                    alt={request.requester_character.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {request.requester_character?.name?.[0] || request.requester_profile?.username?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {request.requester_character?.name || 'Unknown'}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    @{request.requester_profile?.username || 'anonymous'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 italic">
                  "{request.starter_message}"
                </p>
                <span className="text-xs text-primary/70 mt-1">Plot Hook</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleDecline(request.id)}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
              <Button
                onClick={() => handleAccept(request.id)}
                size="sm"
                className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
