import { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface AICharacter {
  id: string;
  character_id: string;
  personality_traits: string[];
  social_rank: string;
  spawn_keywords: string[];
  is_active: boolean;
  character?: Character;
}

interface AICharacterManagerProps {
  worldId: string;
  ownerId: string;
}

const PERSONALITY_TRAITS = [
  'aggressive', 'promiscuous', 'cowardly', 'arrogant', 'loyal',
  'cunning', 'kind', 'mysterious', 'cheerful', 'stoic'
];

const SOCIAL_RANKS = [
  { value: 'royalty', label: 'Royalty' },
  { value: 'noble', label: 'Noble/Commander' },
  { value: 'merchant', label: 'Merchant/Professional' },
  { value: 'commoner', label: 'Commoner' },
  { value: 'servant', label: 'Servant/Outcast' },
];

export function AICharacterManager({ worldId, ownerId }: AICharacterManagerProps) {
  const { toast } = useToast();
  const [aiCharacters, setAICharacters] = useState<AICharacter[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedRank, setSelectedRank] = useState<string>('commoner');
  const [spawnKeywords, setSpawnKeywords] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [worldId, ownerId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch AI characters for this world
    const { data: aiData } = await supabase
      .from('ai_characters')
      .select('*')
      .eq('world_id', worldId);

    if (aiData) {
      // Fetch character details for each AI character
      const characterIds = aiData.map(ai => ai.character_id);
      if (characterIds.length > 0) {
        const { data: charData } = await supabase
          .from('characters')
          .select('id, name, avatar_url, bio')
          .in('id', characterIds);

        const enriched = aiData.map(ai => ({
          ...ai,
          personality_traits: (ai.personality_traits as string[]) || [],
          spawn_keywords: ai.spawn_keywords || [],
          character: charData?.find(c => c.id === ai.character_id)
        }));
        setAICharacters(enriched);
      } else {
        setAICharacters([]);
      }
    }

    // Fetch owner's characters that aren't already AI
    const { data: ownerChars } = await supabase
      .from('characters')
      .select('id, name, avatar_url, bio')
      .eq('owner_id', ownerId);

    if (ownerChars) {
      const aiCharIds = aiData?.map(ai => ai.character_id) || [];
      setAvailableCharacters(ownerChars.filter(c => !aiCharIds.includes(c.id)));
    }

    setLoading(false);
  };

  const handleAddAICharacter = async () => {
    if (!selectedCharacterId) {
      toast({ title: 'Error', description: 'Select a character first', variant: 'destructive' });
      return;
    }

    const keywords = spawnKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);

    const { error } = await supabase.from('ai_characters').insert({
      character_id: selectedCharacterId,
      world_id: worldId,
      personality_traits: selectedTraits,
      social_rank: selectedRank,
      spawn_keywords: keywords,
      is_active: true,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add AI character', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'AI character added!' });
      setSelectedCharacterId('');
      setSelectedTraits([]);
      setSelectedRank('commoner');
      setSpawnKeywords('');
      fetchData();
    }
  };

  const handleRemoveAICharacter = async (id: string) => {
    const { error } = await supabase.from('ai_characters').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove AI character', variant: 'destructive' });
    } else {
      fetchData();
    }
  };

  const toggleTrait = (trait: string) => {
    setSelectedTraits(prev => 
      prev.includes(trait) 
        ? prev.filter(t => t !== trait)
        : [...prev, trait]
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Bot className="w-5 h-5" />
        <h3 className="font-semibold">Phantom AI Characters</h3>
      </div>

      {/* Current AI Characters */}
      <ScrollArea className="h-48">
        <div className="space-y-2">
          {aiCharacters.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No AI characters configured. Add one below!
            </p>
          ) : (
            aiCharacters.map(ai => (
              <div 
                key={ai.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {ai.character?.avatar_url ? (
                      <img src={ai.character.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Bot className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{ai.character?.name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{ai.social_rank}</span>
                      {ai.personality_traits.slice(0, 2).map(trait => (
                        <Badge key={trait} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveAICharacter(ai.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add New AI Character */}
      {availableCharacters.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add AI Character
          </h4>

          <div className="space-y-3">
            <div>
              <Label>Character</Label>
              <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a character..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCharacters.map(char => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Social Rank</Label>
              <Select value={selectedRank} onValueChange={setSelectedRank}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_RANKS.map(rank => (
                    <SelectItem key={rank.value} value={rank.value}>
                      {rank.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Personality Traits</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PERSONALITY_TRAITS.map(trait => (
                  <label
                    key={trait}
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer transition-colors
                      ${selectedTraits.includes(trait) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                  >
                    <Checkbox
                      checked={selectedTraits.includes(trait)}
                      onCheckedChange={() => toggleTrait(trait)}
                      className="hidden"
                    />
                    {trait}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Spawn Keywords (comma-separated)</Label>
              <Input
                value={spawnKeywords}
                onChange={(e) => setSpawnKeywords(e.target.value)}
                placeholder="guard, soldier, knight"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When users mention these words, this character may respond
              </p>
            </div>

            <Button onClick={handleAddAICharacter} className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Add AI Character
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
