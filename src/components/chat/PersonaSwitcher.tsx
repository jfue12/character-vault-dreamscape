import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PersonaSwitcherProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showBaseProfile?: boolean;
  baseProfileName?: string;
}

export const PersonaSwitcher = ({ 
  characters, 
  selectedId, 
  onSelect, 
  showBaseProfile = true,
  baseProfileName = 'You'
}: PersonaSwitcherProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto py-3 px-4 scrollbar-hide">
      {/* Base profile option for chatting without a character */}
      {showBaseProfile && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(null)}
          className="flex-shrink-0"
        >
          <div className={`w-10 h-10 rounded-full overflow-hidden transition-all flex items-center justify-center ${
            selectedId === null
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/20'
              : 'opacity-60 bg-muted'
          }`}>
            <User className="w-5 h-5 text-foreground" />
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-1 max-w-[40px] truncate">
            {baseProfileName}
          </p>
        </motion.button>
      )}
      
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
          <p className="text-[10px] text-center text-muted-foreground mt-1 max-w-[40px] truncate">
            {character.name}
          </p>
        </motion.button>
      ))}
    </div>
  );
};
