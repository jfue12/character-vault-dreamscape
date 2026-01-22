import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, Sparkles } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface AddToShowcaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddToShowcaseModal = ({ open, onOpenChange, onSuccess }: AddToShowcaseModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyShowcased, setAlreadyShowcased] = useState<string[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchCharacters();
    }
  }, [open, user]);

  const fetchCharacters = async () => {
    if (!user) return;

    // Fetch user's characters
    const { data: chars } = await supabase
      .from('characters')
      .select('id, name, avatar_url, bio')
      .eq('owner_id', user.id)
      .eq('is_hidden', false);

    // Fetch already showcased characters
    const { data: showcased } = await supabase
      .from('oc_showcase')
      .select('character_id')
      .eq('user_id', user.id);

    setCharacters(chars || []);
    setAlreadyShowcased(showcased?.map(s => s.character_id) || []);
  };

  const handleSubmit = async () => {
    if (!user || !selectedCharacterId) return;

    setLoading(true);

    const { error } = await supabase.from('oc_showcase').insert({
      character_id: selectedCharacterId,
      user_id: user.id,
      caption: caption.trim() || null
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already showcased', description: 'This character is already in the showcase', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to add to showcase', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Added!', description: 'Your OC is now in the showcase' });
      onSuccess();
      onOpenChange(false);
      setSelectedCharacterId(null);
      setCaption('');
    }

    setLoading(false);
  };

  const availableCharacters = characters.filter(c => !alreadyShowcased.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Showcase Your OC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {availableCharacters.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="mb-2">
                {characters.length === 0 
                  ? "You don't have any characters yet"
                  : "All your characters are already showcased"
                }
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Select Character
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {availableCharacters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacterId(char.id)}
                      className={`relative p-2 rounded-lg border-2 transition-all ${
                        selectedCharacterId === char.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-1">
                        {char.avatar_url ? (
                          <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-900/30 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary/60">
                              {char.name[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-center truncate">{char.name}</p>
                      {selectedCharacterId === char.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Caption (optional)
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Say something about your character..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!selectedCharacterId || loading}
                className="w-full"
              >
                {loading ? 'Adding...' : 'Add to Showcase'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
