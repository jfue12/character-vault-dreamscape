import { motion } from 'framer-motion';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  species: string | null;
  pronouns: string | null;
  likes: string[];
  dislikes: string[];
  is_hidden: boolean;
}

interface CharacterCardProps {
  character: Character;
  index: number;
  onUpdate: () => void;
}

export const CharacterCard = ({ character, index, onUpdate }: CharacterCardProps) => {
  const { toast } = useToast();

  const handleToggleVisibility = async () => {
    const { error } = await supabase
      .from('characters')
      .update({ is_hidden: !character.is_hidden })
      .eq('id', character.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update visibility',
        variant: 'destructive',
      });
    } else {
      onUpdate();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', character.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete character',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Character deleted',
        description: `${character.name} has been removed from your vault.`,
      });
      onUpdate();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card overflow-hidden group"
    >
      {/* Avatar */}
      <div className="h-32 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 relative">
        {character.avatar_url ? (
          <img
            src={character.avatar_url}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-display font-bold text-primary/30">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Visibility badge */}
        {character.is_hidden && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-xs text-muted-foreground flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            Hidden
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h4 className="font-display font-bold text-foreground">{character.name}</h4>
        
        <div className="flex flex-wrap gap-1">
          {character.species && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
              {character.species}
            </span>
          )}
          {character.gender && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
              {character.gender}
            </span>
          )}
          {character.pronouns && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
              {character.pronouns}
            </span>
          )}
          {character.age && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
              {character.age}y/o
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            className="flex-1"
          >
            {character.is_hidden ? (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
