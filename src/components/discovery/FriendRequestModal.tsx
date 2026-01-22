import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  owner_id: string;
  profiles?: {
    username: string | null;
  } | null;
}

interface FriendRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCharacter: Character | null;
  onSuccess: () => void;
}

export const FriendRequestModal = ({ 
  open, 
  onOpenChange, 
  targetCharacter,
  onSuccess 
}: FriendRequestModalProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [starterMessage, setStarterMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [myCharacters, setMyCharacters] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);

  // Fetch user's characters when modal opens
  useEffect(() => {
    if (open && user) {
      supabase
        .from('characters')
        .select('id, name, avatar_url')
        .eq('owner_id', user.id)
        .eq('is_hidden', false)
        .then(({ data }) => {
          if (data) {
            setMyCharacters(data);
            if (data.length > 0 && !selectedCharacterId) {
              setSelectedCharacterId(data[0].id);
            }
          }
        });
    }
  }, [open, user]);

  const handleSendRequest = async () => {
    if (!user || !targetCharacter || !starterMessage.trim()) return;

    setIsLoading(true);

    try {
      // Insert friendship and get the ID back
      const { data: friendshipData, error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: targetCharacter.owner_id,
        requester_character_id: selectedCharacterId,
        starter_message: starterMessage.trim(),
        status: 'pending',
      }).select('id').single();

      if (error) throw error;

      // Get the requester's character name for the notification
      let requesterCharacterName = profile?.username || 'Someone';
      if (selectedCharacterId) {
        const { data: charData } = await supabase
          .from('characters')
          .select('name')
          .eq('id', selectedCharacterId)
          .single();
        if (charData) {
          requesterCharacterName = charData.name;
        }
      }

      // Create notification for the addressee with friendship_id for accept/decline
      await supabase.rpc('create_notification', {
        p_user_id: targetCharacter.owner_id,
        p_type: 'roleplay_proposal',
        p_title: 'New Roleplay Proposal',
        p_body: `${requesterCharacterName} wants to start a story with you!`,
        p_data: { 
          requester_id: user.id,
          username: profile?.username,
          character_name: requesterCharacterName,
          friendship_id: friendshipData.id,
          starter_message: starterMessage.trim()
        }
      });

      toast({
        title: 'Proposal sent!',
        description: `Your roleplay proposal has been sent to ${targetCharacter.profiles?.username || 'this user'}`,
      });

      setStarterMessage('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Failed to send proposal',
        description: error.message,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  if (!targetCharacter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Start a Story
          </DialogTitle>
          <DialogDescription>Propose a roleplay with a compelling plot hook.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target Character Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary">
            <div className="w-16 h-16 rounded-full overflow-hidden">
              {targetCharacter.avatar_url ? (
                <img 
                  src={targetCharacter.avatar_url} 
                  alt={targetCharacter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {targetCharacter.name[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{targetCharacter.name}</h3>
              <p className="text-sm text-muted-foreground">
                @{targetCharacter.profiles?.username || 'anonymous'}
              </p>
            </div>
          </div>

          {/* Select Your Character */}
          {myCharacters.length > 1 && (
            <div className="space-y-2">
              <Label className="text-foreground">Send as:</Label>
              <div className="flex gap-2 flex-wrap">
                {myCharacters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharacterId(char.id)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                      selectedCharacterId === char.id 
                        ? 'border-primary scale-110' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{char.name[0]}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plot Hook */}
          <div className="space-y-2">
            <Label className="text-foreground">Plot Hook *</Label>
            <Textarea
              value={starterMessage}
              onChange={(e) => setStarterMessage(e.target.value)}
              placeholder="Set the scene... (e.g., 'A stranger approaches your character in the tavern, their cloak dripping from the storm outside...')"
              className="bg-input border-border min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {starterMessage.length}/500
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={isLoading || !starterMessage.trim()}
              className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? 'Sending...' : 'Propose Story'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
