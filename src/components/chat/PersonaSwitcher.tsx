import { motion } from 'framer-motion';
import { User, Plus, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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
  onCreateNew?: () => void;
  compact?: boolean;
}

export const PersonaSwitcher = ({ 
  characters, 
  selectedId, 
  onSelect, 
  showBaseProfile = true,
  baseProfileName = 'You',
  onCreateNew,
  compact = false
}: PersonaSwitcherProps) => {
  const [expanded, setExpanded] = useState(!compact);

  const selectedCharacter = characters.find(c => c.id === selectedId);
  const displayName = selectedId === null 
    ? baseProfileName 
    : selectedCharacter?.name || 'Select';

  if (compact && !expanded) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-xl border border-border rounded-full mx-auto"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
          {selectedId === null ? (
            <User className="w-4 h-4 text-foreground" />
          ) : selectedCharacter?.avatar_url ? (
            <img 
              src={selectedCharacter.avatar_url} 
              alt={selectedCharacter.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold">{displayName[0]}</span>
          )}
        </div>
        <span className="text-sm font-medium text-foreground">Switch Profile</span>
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl px-2 py-3"
    >
      {compact && (
        <button 
          onClick={() => setExpanded(false)}
          className="w-full text-center text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1"
        >
          <span>Switch Profile</span>
          <ChevronUp className="w-3 h-3 rotate-180" />
        </button>
      )}
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
        {/* Base profile option */}
        {showBaseProfile && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(null)}
            className="flex flex-col items-center gap-1.5 min-w-[56px]"
          >
            <div className={`w-12 h-12 rounded-full overflow-hidden transition-all flex items-center justify-center ${
              selectedId === null
                ? 'avatar-ring-active bg-primary/30'
                : 'opacity-70 bg-muted hover:opacity-100'
            }`}>
              <User className="w-6 h-6 text-foreground" />
            </div>
            <span className={`text-[11px] font-medium max-w-[56px] truncate ${
              selectedId === null ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {baseProfileName}
            </span>
          </motion.button>
        )}
        
        {/* Character avatars */}
        {characters.map((character) => (
          <motion.button
            key={character.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(character.id)}
            className="flex flex-col items-center gap-1.5 min-w-[56px]"
          >
            <div className={`w-12 h-12 rounded-full overflow-hidden transition-all ${
              selectedId === character.id
                ? 'avatar-ring-active'
                : 'opacity-70 hover:opacity-100'
            }`}>
              {character.avatar_url ? (
                <img 
                  src={character.avatar_url} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/60 to-purple-900/60 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{character.name[0]}</span>
                </div>
              )}
            </div>
            <span className={`text-[11px] font-medium max-w-[56px] truncate ${
              selectedId === character.id ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {character.name}
            </span>
          </motion.button>
        ))}

        {/* Add new character */}
        {onCreateNew && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreateNew}
            className="flex flex-col items-center gap-1.5 min-w-[56px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground">Add</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
