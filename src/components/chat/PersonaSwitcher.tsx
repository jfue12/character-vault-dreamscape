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
      <div className="text-center py-2 text-xs text-muted-foreground">
        Create a character to start chatting
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-2 scrollbar-hide">
      {characters.map((character) => (
        <motion.button
          key={character.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(character.id)}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
            selectedId === character.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden">
            {character.avatar_url ? (
              <img 
                src={character.avatar_url} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-xs font-bold">
                {character.name[0]}
              </div>
            )}
          </div>
          <span className="text-sm font-medium">{character.name}</span>
        </motion.button>
      ))}
    </div>
  );
};
