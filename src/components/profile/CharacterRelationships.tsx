import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, X, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Relationship {
  id: string;
  partner_character_id: string;
  relationship_type: string;
  partner?: {
    id: string;
    name: string;
    avatar_url: string | null;
    owner_id: string;
  } | null;
}

interface CharacterRelationshipsProps {
  characterId: string;
  isOwner: boolean;
}

export const CharacterRelationships = ({ characterId, isOwner }: CharacterRelationshipsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchRelationships();
  }, [characterId]);

  const fetchRelationships = async () => {
    const { data, error } = await supabase
      .from('character_relationships')
      .select(`
        id,
        partner_character_id,
        relationship_type,
        partner:characters!character_relationships_partner_character_id_fkey(
          id, name, avatar_url, owner_id
        )
      `)
      .eq('character_id', characterId);

    if (!error && data) {
      const processedData = data.map(r => ({
        ...r,
        partner: Array.isArray(r.partner) ? r.partner[0] : r.partner
      }));
      setRelationships(processedData);
    }
    setLoading(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('characters')
      .select('id, name, avatar_url, owner_id')
      .neq('id', characterId)
      .ilike('name', `%${query}%`)
      .eq('is_hidden', false)
      .limit(10);

    setSearchResults(data || []);
  };

  const handleAddPartner = async (partnerId: string) => {
    const { error } = await supabase.from('character_relationships').insert({
      character_id: characterId,
      partner_character_id: partnerId,
      relationship_type: 'partner',
    });

    if (error) {
      toast({ title: 'Failed to add partner', variant: 'destructive' });
    } else {
      toast({ title: 'Partner added!' });
      fetchRelationships();
      setIsAddingOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemovePartner = async (relationshipId: string) => {
    const { error } = await supabase
      .from('character_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      toast({ title: 'Failed to remove partner', variant: 'destructive' });
    } else {
      toast({ title: 'Partner removed' });
      fetchRelationships();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          Relationships
        </h4>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingOpen(true)}
            className="text-primary"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Partner
          </Button>
        )}
      </div>

      {relationships.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No relationships yet
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {relationships.map((rel) => (
            <motion.div
              key={rel.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {rel.partner?.avatar_url ? (
                  <img 
                    src={rel.partner.avatar_url} 
                    alt={rel.partner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {rel.partner?.name?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm text-foreground">{rel.partner?.name}</span>
              <LinkIcon className="w-3 h-3 text-primary" />
              {isOwner && (
                <button
                  onClick={() => handleRemovePartner(rel.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Partner Dialog */}
      <Dialog open={isAddingOpen} onOpenChange={setIsAddingOpen}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-foreground">
              Add Partner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search characters..."
              className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
            />

            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleAddPartner(char.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                        <span className="font-bold text-white">{char.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-foreground">{char.name}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
