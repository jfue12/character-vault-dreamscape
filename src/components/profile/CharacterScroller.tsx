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
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {/* Add New Character Button - First Item */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddNew}
          className="w-16 h-16 rounded-full dashed-circle flex items-center justify-center bg-background"
        >
          <Plus className="w-6 h-6 text-primary" />
        </motion.button>
        <span className="text-xs text-muted-foreground w-16 text-center truncate">
          Character
        </span>
      </div>

      {/* Character Avatars with Names */}
      {characters.map((character, index) => (
        <div key={character.id} className="flex flex-col items-center gap-1 flex-shrink-0">
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(character.id)}
            className={`w-16 h-16 rounded-full overflow-hidden transition-all ${
              selectedId === character.id 
                ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-background' 
                : 'border-2 border-border hover:border-primary/50'
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
          <span className={`text-xs w-16 text-center truncate ${
            selectedId === character.id ? 'text-primary font-medium' : 'text-muted-foreground'
          }`}>
            {character.name.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
};
