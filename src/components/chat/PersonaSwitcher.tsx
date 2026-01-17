import { motion } from 'framer-motion';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PersonaSwitcherProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const PersonaSwitcher = ({ characters, selectedId, onSelect }: PersonaSwitcherProps) => {
  if (characters.length === 0) {
    return (
      <div className="text-center py-3 text-xs text-muted-foreground">
        Create a character to start chatting
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto py-3 px-4 scrollbar-hide">
      {characters.map((character) => (
        <motion.button
          key={character.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(character.id)}
          className="flex-shrink-0"
        >
          <div className={`w-10 h-10 rounded-full overflow-hidden transition-all ${
            selectedId === character.id
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
              : 'opacity-60'
          }`}>
            {character.avatar_url ? (
              <img 
                src={character.avatar_url} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-purple-900/40 flex items-center justify-center text-xs font-bold">
                {character.name[0]}
              </div>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
};
