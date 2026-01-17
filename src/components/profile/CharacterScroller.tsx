import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface CharacterScrollerProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

export const CharacterScroller = ({ 
  characters, 
  selectedId, 
  onSelect, 
  onAddNew 
}: CharacterScrollerProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {/* Add New Character Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddNew}
        className="flex-shrink-0 w-16 h-16 rounded-full dashed-circle flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-primary" />
      </motion.button>

      {/* Character Avatars */}
      {characters.map((character, index) => (
        <motion.button
          key={character.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(character.id)}
          className={`flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
            selectedId === character.id 
              ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' 
              : 'border-border'
          }`}
        >
          {character.avatar_url ? (
            <img 
              src={character.avatar_url} 
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">
                {character.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
};
